import type { SupabaseClient } from '@supabase/supabase-js'
import {
  normalizujNumer, trescRezerwacji, mozeWyslac, bezOgonkow,
  type RezerwacjaDoSms,
} from '@/lib/sms'

/**
 * Wysyłka SMS — warstwa sieciowa i baza. Logika bez zależności siedzi
 * w `src/lib/sms.ts` i jest pokryta testami.
 *
 * Dostawca: **Twilio** (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`,
 * `TWILIO_FROM_NUMBER`). Wybrany, bo Casa Sol używa go od kwietnia 2026
 * z polskim numerem nadawcy — wzorzec jest sprawdzony w boju, a jeden dostawca
 * zamiast dwóch to jedno miejsce do pilnowania. Przy tej skali (kilka SMS-ów
 * tygodniowo na właściciela) różnica w cenie wobec dostawców krajowych nie ma
 * znaczenia.
 *
 * **Poświadczenia muszą być osobne od Casa Sol** — albo własne konto, albo
 * subkonto Twilio. Casa Sol ma być całkowicie niezależna od Nobookinga, tak
 * samo jak przy Stripe.
 *
 * Bez kompletu zmiennych moduł nic nie robi i mówi o tym wprost — brak
 * konfiguracji nie może udawać sukcesu, ale nie może też wywracać
 * potwierdzenia rezerwacji.
 */

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
  const sid   = (process.env.TWILIO_ACCOUNT_SID ?? '').trim()
  const token = (process.env.TWILIO_AUTH_TOKEN ?? '').trim()
  const from  = (process.env.TWILIO_FROM_NUMBER ?? '').trim()
  if (!sid || !token || !from) return { stan: 'pominieto', powod: 'brak_konfiguracji' }
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
    To: numer.numer,
    From: from,
    Body: bezOgonkow(params.tresc),
  })

  try {
    const odp = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: ciało,
      },
    )
    const dane = await odp.json() as { code?: number; message?: string; sid?: string }

    if (!odp.ok) {
      const powod = `${dane.code ?? odp.status}: ${dane.message ?? 'nieznany błąd'}`
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
