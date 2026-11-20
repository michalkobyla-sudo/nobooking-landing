import { createRequire } from 'module'
import { PRICES, PLAN_NAMES } from '@/lib/prices'

const _require = createRequire(import.meta.url)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const StripeLib = _require('stripe') as any

/**
 * Sesja płatności za pakiet (zamówienie strony).
 *
 * **Dlaczego to tu siedzi, a nie w trasie.** `/api/orders` tworzyło sesję,
 * wysyłając żądanie HTTP na `${NEXT_PUBLIC_SITE_URL}/api/stripe/checkout` —
 * czyli pod adres bezwzględny z konfiguracji. Lokalnie ta zmienna wskazywała
 * produkcję, więc serwer deweloperski zapisywał zamówienie u siebie, a po
 * sesję płatności szedł **na produkcję, gdzie stoi klucz live**. Dwa razy
 * powstała w ten sposób prawdziwa sesja na 1199 zł (2026-10-02, przy
 * przygotowaniach do Etapu 2; obie porzucone i nieopłacone).
 *
 * Dopóki istniała tylko produkcja, nie dało się tego zauważyć: adres wskazywał
 * tę samą maszynę, na której kod i tak działał. Pierwsze uruchomienie poza
 * produkcją trafiło na to od razu.
 *
 * Teraz `/api/orders` woła tę funkcję bezpośrednio. Nie ma żądania po sieci,
 * więc **nie da się zlecić operacji finansowej innemu środowisku** — ani
 * z localhosta, ani z preview, ani z CI.
 */

export interface DaneSesji {
  plan: 'basic' | 'pro'
  currency: 'pln' | 'eur'
  /** Wymagane: płatność bez zamówienia w bazie nie ma do czego przypiąć
   *  onboardingu. Do 2026-11-09 istniała trasa, która na to pozwalała. */
  orderId: string
  /** Data wersji regulaminu zaakceptowanej w formularzu — `WERSJA_REGULAMINU`. */
  wersjaRegulaminu: string
  /** Czy klient zażądał rozpoczęcia usługi przed upływem 14 dni (pole dobrowolne). */
  wczesnyStart: boolean
  /** Adres, na który Stripe odeśle gościa. Bierzemy go z **bieżącego żądania**,
   *  nie z konfiguracji — adres zwrotny ma prowadzić tam, skąd przyszedł klient. */
  adresPowrotu: string
  /** E-mail kupującego — tylko do rozpoznania zakupu testowego. */
  email?: string
}

/**
 * TYMCZASOWE — zakup testowy na żywym Stripe bez płacenia pełnej ceny.
 *
 * Działa wyłącznie, gdy w Vercelu ustawione są OBIE zmienne:
 * `ZAKUP_TESTOWY_EMAIL` (dokładny adres) i `ZAKUP_TESTOWY_GROSZE`. Bez nich —
 * zwykła cena. Minimum Stripe dla PLN to 200 groszy. Po teście: usunąć zmienne
 * i ten kod (2026-11-20, zakup testowy pełnej ścieżki).
 */
export function cenaTestowa(email: string | undefined, env: Record<string, string | undefined> = process.env): number | null {
  const testowy = (env.ZAKUP_TESTOWY_EMAIL ?? '').trim().toLowerCase()
  const grosze = Number((env.ZAKUP_TESTOWY_GROSZE ?? '').trim())
  if (!testowy || !email || email.trim().toLowerCase() !== testowy) return null
  if (!Number.isInteger(grosze) || grosze < 200) return null
  return grosze
}

export type WynikSesji =
  | { ok: true; url: string }
  | { ok: false; blad: string }

export function poprawneDane(plan: unknown, currency: unknown): boolean {
  return ['basic', 'pro'].includes(plan as string) && ['pln', 'eur'].includes(currency as string)
}

/** Obcina końcowy ukośnik, żeby nie budować adresów z `//`. */
export function normalizujAdres(adres: string): string {
  return String(adres ?? '').trim().replace(/\/+$/, '')
}

export async function utworzSesjeZamowienia(dane: DaneSesji): Promise<WynikSesji> {
  const { plan, currency, orderId } = dane
  if (!poprawneDane(plan, currency)) return { ok: false, blad: 'invalid_input' }

  const klucz = (process.env.STRIPE_SECRET_KEY ?? '').trim()
  if (!klucz) return { ok: false, blad: 'brak_klucza_stripe' }

  const adres = normalizujAdres(dane.adresPowrotu)

  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const stripe = new StripeLib(klucz, { apiVersion: '2026-04-22.dahlia' })

    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency,
          unit_amount: cenaTestowa(dane.email) ?? PRICES[plan][currency],
          product_data: { name: cenaTestowa(dane.email) ? `${PLAN_NAMES[plan]} — ZAKUP TESTOWY` : PLAN_NAMES[plan] },
        },
        quantity: 1,
      }],
      success_url: `${adres}/sukces?plan=${plan}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${adres}/#cennik`,
      // Metody płatności dobiera Stripe wg konta i kraju gościa. Sztywna lista
      // wywracała odnowienia po zmianie konta platformy (p24 nie istniał na nowym).
      // `regulamin` to jedyny trwały ślad tego, którą wersję zaakceptował
      // klient — regulamin stosuje się w brzmieniu z dnia zakupu.
      // `wczesny_start` — żądanie z art. 15 ust. 3 upk; trafia do maila
      // z potwierdzeniem umowy i rozstrzyga, ile zwracamy przy odstąpieniu.
      metadata: {
        plan, currency, order_id: orderId,
        regulamin: dane.wersjaRegulaminu,
        wczesny_start: dane.wczesnyStart ? 'tak' : 'nie',
      },
    })

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const url = session.url as string | null
    return url ? { ok: true, url } : { ok: false, blad: 'brak_url_sesji' }

  } catch (err: unknown) {
    const blad = err instanceof Error ? err.message : 'Stripe error'
    console.error('[checkout] Stripe error:', err)
    return { ok: false, blad }
  }
}

/** `wczesny_start` z metadanych sesji: 'tak' / 'nie' / brak (starsze sesje). */
export function wczesnyStartZMetadanych(metadata: Record<string, unknown> | null | undefined): boolean | null {
  const w = metadata?.wczesny_start
  return w === 'tak' ? true : w === 'nie' ? false : null
}

/**
 * Żądanie wcześniejszego startu dla ponownej wysyłki maila z panelu admina,
 * gdzie nie ma pod ręką zdarzenia Stripe. Null przy każdym kłopocie — mail
 * wtedy nie twierdzi niczego i odsyła do regulaminu.
 */
export async function wczesnyStartZSesji(sessionId: string | null | undefined): Promise<boolean | null> {
  const klucz = (process.env.STRIPE_SECRET_KEY ?? '').trim()
  if (!sessionId || !klucz) return null
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const stripe = new StripeLib(klucz, { apiVersion: '2026-04-22.dahlia' })
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const session = await stripe.checkout.sessions.retrieve(sessionId)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return wczesnyStartZMetadanych(session.metadata as Record<string, unknown>)
  } catch (err) {
    console.error('[checkout] odczyt sesji nie powiódł się:', err)
    return null
  }
}
