import type { SupabaseClient } from '@supabase/supabase-js'
import {
  normalizujNumer, trescRezerwacji, mozeWyslac, bezOgonkow,
  type RezerwacjaDoSms,
} from '@/lib/sms'

/**
 * Wysyłka SMS — warstwa sieciowa i baza. Logika bez zależności siedzi
 * w `src/lib/sms.ts` i jest pokryta testami.
 *
 * Dostawca: SMSAPI (`SMSAPI_TOKEN`, opcjonalnie `SMSAPI_SENDER`).
 * Bez tokenu moduł nic nie robi i mówi o tym wprost — brak konfiguracji nie
 * może udawać sukcesu, ale nie może też wywracać potwierdzenia rezerwacji.
 */

const ENDPOINT = 'https://api.smsapi.pl/sms.do'

export type WynikSms =
  | { stan: 'wyslano'; numer: string }
  | { stan: 'pominieto'; powod: 'brak_konfiguracji' | 'wylaczone' | 'brak_numeru' | 'limit_dzienny' }
  | { stan: 'blad'; powod: string }

/** Ile udanych wysyłek miała ta strona w bieżącej dobie. */
async function wyslanoDzis(db: SupabaseClient, siteId: string): Promise<number> {
  const odPolnocy = new Date()
  odPolnocy.setUTCHours(0, 0, 0, 0)

  const { count, error } = await db
    .from('sms_log')
    .select('id', { count: 'exact', head: true })
    .eq('site_id', siteId)
    .eq('udane', true)
    .gte('created_at', odPolnocy.toISOString())

  if (error) {
    // Nie znamy licznika, więc nie wiemy, czy limit został przekroczony.
    // Zawodzimy „na zamknięto": lepiej nie wysłać jednego SMS-a niż wysłać
    // ich tyle, ile przyjdzie zdarzeń.
    console.error('[sms] nie udało się odczytać licznika:', error.message)
    return Number.POSITIVE_INFINITY
  }
  return count ?? 0
}

async function zapiszSlad(
  db: SupabaseClient,
  siteId: string, numer: string, rodzaj: string, udane: boolean, blad?: string,
) {
  const { error } = await db.from('sms_log').insert({
    site_id: siteId, phone: numer, rodzaj, udane, blad: blad ?? null,
  })
  if (error) console.error('[sms] nie udało się zapisać śladu wysyłki:', error.message)
}

/**
 * Wysyła jeden SMS. Zwraca wynik zamiast rzucać — wywołujący (webhook)
 * nie może przerwać potwierdzania rezerwacji przez nieudany SMS.
 */
export async function wyslijSms(
  db: SupabaseClient,
  params: { siteId: string; numerSurowy: string | null; tresc: string; rodzaj: string; wlaczone: boolean },
): Promise<WynikSms> {
  const token = (process.env.SMSAPI_TOKEN ?? '').trim()
  if (!token) return { stan: 'pominieto', powod: 'brak_konfiguracji' }
  if (!params.wlaczone) return { stan: 'pominieto', powod: 'wylaczone' }

  const numer = normalizujNumer(params.numerSurowy)
  if (!numer.ok) {
    console.error(`[sms] numer strony ${params.siteId} jest nieprawidłowy: ${numer.blad}`)
    return { stan: 'pominieto', powod: 'brak_numeru' }
  }

  if (!mozeWyslac(await wyslanoDzis(db, params.siteId))) {
    console.error(`[sms] strona ${params.siteId} wyczerpała dzienny limit SMS-ów`)
    await zapiszSlad(db, params.siteId, numer.numer, params.rodzaj, false, 'limit_dzienny')
    return { stan: 'pominieto', powod: 'limit_dzienny' }
  }

  const ciało = new URLSearchParams({
    to: numer.numer,
    message: bezOgonkow(params.tresc),
    format: 'json',
    encoding: 'utf-8',
  })
  const nadawca = (process.env.SMSAPI_SENDER ?? '').trim()
  if (nadawca) ciało.set('from', nadawca)

  try {
    const odp = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: ciało,
    })
    const dane = await odp.json() as { error?: number; message?: string }

    // SMSAPI zwraca 200 także przy błędzie — rozstrzyga pole `error` w treści.
    if (!odp.ok || dane.error) {
      const powod = `${dane.error ?? odp.status}: ${dane.message ?? 'nieznany błąd'}`
      console.error(`[sms] wysyłka dla strony ${params.siteId} nie powiodła się — ${powod}`)
      await zapiszSlad(db, params.siteId, numer.numer, params.rodzaj, false, powod)
      return { stan: 'blad', powod }
    }

    await zapiszSlad(db, params.siteId, numer.numer, params.rodzaj, true)
    return { stan: 'wyslano', numer: numer.numer }

  } catch (err) {
    const powod = err instanceof Error ? err.message : String(err)
    console.error(`[sms] wyjątek przy wysyłce dla strony ${params.siteId}:`, powod)
    await zapiszSlad(db, params.siteId, numer.numer, params.rodzaj, false, powod)
    return { stan: 'blad', powod }
  }
}

/** Powiadomienie właściciela o nowej rezerwacji. */
export async function powiadomORezerwacji(
  db: SupabaseClient,
  site: { id: string; slug: string; sms_phone: string | null; sms_enabled: boolean; plan: string },
  rezerwacja: RezerwacjaDoSms,
  nazwaStrony: string,
): Promise<WynikSms> {
  // SMS-y są funkcją pakietu Pro — sprawdzane po stronie serwera, nie tylko
  // w interfejsie.
  if (site.plan !== 'pro') return { stan: 'pominieto', powod: 'wylaczone' }

  return wyslijSms(db, {
    siteId: site.id,
    numerSurowy: site.sms_phone,
    tresc: trescRezerwacji(rezerwacja, nazwaStrony),
    rodzaj: 'rezerwacja',
    wlaczone: site.sms_enabled !== false,
  })
}
