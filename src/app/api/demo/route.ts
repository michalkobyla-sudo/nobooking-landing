import { randomBytes } from 'crypto'
import { NextRequest, NextResponse, after } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { zBody, opisZrodla } from '@/lib/attribution'
import { czyPrzekroczonoWBazie } from '@/lib/rateLimitDb'
import { walidujZgloszenie, sciezkaPodgladu } from '@/lib/demoZgloszenie'
import { przygotujDemo } from '@/lib/demoGeneracja'
import { sendDemoRequestNotification } from '@/lib/email'

// Generowanie idzie w `after()`, w czasie życia tej funkcji.
export const maxDuration = 120

/**
 * Ile zgłoszeń dziennie przyjmujemy łącznie. Każde to wywołanie modelu; limit
 * na adres IP (proxy) nie zatrzyma kogoś z wieloma adresami. Po przekroczeniu
 * formularz prosi o maila — prawdziwy klient nie przepada.
 */
const DZIENNY_LIMIT = 40
const DOBA_MS = 24 * 60 * 60 * 1000

// POST /api/demo — darmowe demo na apartamencie klienta (`lib/demoZgloszenie.ts`).
export async function POST(request: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await request.json() as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }

  const wynik = walidujZgloszenie(body)
  if (!wynik.ok) return NextResponse.json({ error: wynik.blad }, { status: 400 })
  const z = wynik.dane

  // Dwa dema na adres e-mail na dobę: jedno plus poprawka literówki.
  const limitMaila = await czyPrzekroczonoWBazie(`demo-email:${z.email}`, 2, DOBA_MS)
  if (limitMaila.przekroczono) return NextResponse.json({ error: 'too_many_for_email' }, { status: 429 })

  const supabase = createServiceClient()

  const { count, error: bladLiczenia } = await supabase
    .from('demo_requests')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', new Date(Date.now() - DOBA_MS).toISOString())
  if (bladLiczenia) {
    console.error('[demo] liczenie zgłoszeń:', bladLiczenia.message)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }
  if ((count ?? 0) >= DZIENNY_LIMIT) {
    console.warn(`[demo] dzienny limit ${DZIENNY_LIMIT} osiągnięty`)
    return NextResponse.json({ error: 'daily_limit' }, { status: 503 })
  }

  const zrodlo = zBody(body.zrodlo)
  const token = randomBytes(18).toString('base64url')

  const { data: wiersz, error } = await supabase
    .from('demo_requests')
    .insert({ ...z, token, ...zrodlo })
    .select('id')
    .single()

  if (error || !wiersz) {
    console.error('[demo] zapis zgłoszenia:', error?.message)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  const id = wiersz.id as string
  // Po odpowiedzi, przez `after` — promise bez `await` Vercel ucina.
  after(async () => {
    await sendDemoRequestNotification({ ...z, token }, opisZrodla(zrodlo)).catch(err =>
      console.error('[demo] powiadomienie administratora:', err instanceof Error ? err.message : String(err)),
    )
    await przygotujDemo(supabase, id)
  })

  return NextResponse.json({ token, url: sciezkaPodgladu(token) })
}
