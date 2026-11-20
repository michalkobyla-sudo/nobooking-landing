import { createRequire } from 'module'

const _require = createRequire(import.meta.url)
// Ten sam sposób ładowania co w `checkoutZamowienia.ts`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const StripeLib = _require('stripe') as any

/**
 * Kraj nabywcy — do rozstrzygnięcia reżimu VAT i liczenia progu OSS.
 *
 * Usługę elektroniczną dla konsumenta z UE opodatkowuje się w kraju konsumenta,
 * gdy sprzedaż do innych krajów UE przekroczy 10 000 EUR rocznie
 * (`docs/PODATKI-I-FAKTUROWANIE.md`, część 2). Kraj ustala się na podstawie
 * dowodów wymienionych w art. 24f rozporządzenia 282/2011 — powyżej progu
 * potrzebne są **dwa niesprzeczne**. Zbieramy trzy niezależne:
 *
 * - `kraj_ip` — kraj adresu IP przy składaniu zamówienia (nagłówek Vercela),
 * - `kraj_rozliczeniowy` — kraj z adresu rozliczeniowego w Stripe Checkout,
 * - `kraj_karty` — kraj wydawcy karty (dane bankowe; przy BLIK-u go nie ma).
 *
 * Zapis jest zawsze dodatkowy i nigdy nie blokuje zamówienia ani płatności:
 * osobne `update`, błąd tylko do logu. Dzięki temu kod działa także przed
 * uruchomieniem migracji `docs/supabase/2026-11-20-kraj-nabywcy.sql`, a o jej
 * braku przypomni raport zdrowia (`lib/schematWymagany.ts`).
 */

/** Dwuliterowy kod ISO 3166-1 albo `null`. Vercel zwraca `XX`, gdy nie wie. */
export function kodKraju(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const s = v.trim().toUpperCase()
  if (!/^[A-Z]{2}$/.test(s) || s === 'XX') return null
  return s
}

export function krajZIp(naglowki: Headers): string | null {
  return kodKraju(naglowki.get('x-vercel-ip-country'))
}

/** Kraj z adresu rozliczeniowego sesji Checkout (obiekt ze zdarzenia webhooka). */
export function krajRozliczeniowyZSesji(sesja: unknown): string | null {
  const s = sesja as { customer_details?: { address?: { country?: unknown } | null } | null } | null
  return kodKraju(s?.customer_details?.address?.country)
}

/** Kraj wydawcy karty z PaymentIntent z rozwiniętym `payment_method`. */
export function krajKartyZPlatnosci(platnosc: unknown): string | null {
  const p = platnosc as { payment_method?: { card?: { country?: unknown } | null } | string | null } | null
  const metoda = p?.payment_method
  if (!metoda || typeof metoda === 'string') return null
  return kodKraju(metoda.card?.country)
}

/** Pobiera kraj karty ze Stripe. `null` przy czymkolwiek nieoczekiwanym. */
export async function pobierzKrajKarty(paymentIntentId: unknown): Promise<string | null> {
  const klucz = (process.env.STRIPE_SECRET_KEY ?? '').trim()
  if (typeof paymentIntentId !== 'string' || !paymentIntentId || !klucz) return null
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const stripe = new StripeLib(klucz, { apiVersion: '2026-04-22.dahlia' })
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const platnosc: unknown = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ['payment_method'] })
    return krajKartyZPlatnosci(platnosc)
  } catch (err) {
    console.error('[kraj] odczyt płatności nie powiódł się:', err)
    return null
  }
}
