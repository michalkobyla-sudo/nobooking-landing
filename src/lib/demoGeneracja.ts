import type { SupabaseClient } from '@supabase/supabase-js'
import { generateSiteConfig } from './generate-site'
import { sprawdzConfig, blokujeWysylke, podsumowanie } from './provisionCheck'
import { sendDemoReadyEmail, sendDemoFailedNotification } from './email'
import { daneDoGeneracji, MAX_PROB_DEMO, type WierszDemo } from './demoZgloszenie'

/** Zaklepane dłużej niż tyle — uznajemy, że uruchomienie padło, i bierzemy ponownie. */
export const NIESWIEZE_DEMO_MS = 10 * 60 * 1000

/**
 * Generuje demo jednego zgłoszenia. Wołane zaraz po zgłoszeniu (`after()` w trasie)
 * i z crona `provision-sites` jako ponowienie.
 *
 * **Zaklepanie przez `attempts`.** Obaj wołający mogą trafić na to samo
 * zgłoszenie naraz. Zapis warunkowy `attempts = poprzednia wartość` przechodzi
 * tylko u jednego — drugi dostaje pustą odpowiedź i odpuszcza, więc model
 * nie jest wołany dwa razy, a klient nie dostaje dwóch maili.
 */
export async function przygotujDemo(supabase: SupabaseClient, id: string): Promise<'gotowe' | 'blad' | 'pominiete'> {
  const { data: wiersz } = await supabase.from('demo_requests').select('*').eq('id', id).single()
  const w = wiersz as WierszDemo | null
  if (!w || w.status === 'ready' || w.attempts >= MAX_PROB_DEMO) return 'pominiete'

  const { data: zaklepane } = await supabase
    .from('demo_requests')
    .update({ status: 'generating', attempts: w.attempts + 1, started_at: new Date().toISOString() })
    .eq('id', id)
    .eq('attempts', w.attempts)
    .neq('status', 'ready')
    .select('id')
  if (!zaklepane?.length) return 'pominiete'

  const proba = w.attempts + 1
  try {
    const config = await generateSiteConfig(daneDoGeneracji(w))
    const usterki = sprawdzConfig(config)
    if (blokujeWysylke(usterki)) throw new Error(`kontrola strony: ${podsumowanie(usterki)}`)

    const { error } = await supabase
      .from('demo_requests')
      .update({ status: 'ready', config, error: null, generated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw new Error(`zapis: ${error.message}`)

    await sendDemoReadyEmail(w).catch(err =>
      console.error(`[demo] ${id}: mail do klienta nie wyszedł:`, err instanceof Error ? err.message : String(err)),
    )
    return 'gotowe'
  } catch (err) {
    const blad = err instanceof Error ? err.message : String(err)
    console.error(`[demo] ${id}: próba ${proba} nieudana:`, blad)
    await supabase.from('demo_requests').update({ status: 'failed', error: blad.slice(0, 1000) }).eq('id', id)
    if (proba >= MAX_PROB_DEMO) {
      await sendDemoFailedNotification(w, blad).catch(e =>
        console.error(`[demo] ${id}: alarm do administratora nie wyszedł:`, e instanceof Error ? e.message : String(e)),
      )
    }
    return 'blad'
  }
}

/**
 * Ponowienia dla crona: zgłoszenia niegotowe, z zapasem prób, których nikt
 * nie trzyma (świeże `new` zostawiamy trasie — ona już nad nimi pracuje).
 */
export async function ponowDemo(supabase: SupabaseClient, limit = 2): Promise<number> {
  const teraz = Date.now()
  const nieswieze = new Date(teraz - NIESWIEZE_DEMO_MS).toISOString()
  const { data, error } = await supabase
    .from('demo_requests')
    .select('id')
    .neq('status', 'ready')
    .lt('attempts', MAX_PROB_DEMO)
    .lt('created_at', new Date(teraz - 2 * 60 * 1000).toISOString())
    .or(`started_at.is.null,started_at.lt.${nieswieze}`)
    .order('created_at', { ascending: true })
    .limit(limit)
  if (error) {
    console.error('[demo] ponowienia — zapytanie:', error.message)
    return 0
  }
  let ile = 0
  for (const { id } of data ?? []) {
    if ((await przygotujDemo(supabase, id as string)) === 'gotowe') ile++
  }
  return ile
}
