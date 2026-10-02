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
 * Teraz obie trasy wołają tę funkcję bezpośrednio. Nie ma żądania po sieci,
 * więc **nie da się zlecić operacji finansowej innemu środowisku** — ani
 * z localhosta, ani z preview, ani z CI.
 */

export interface DaneSesji {
  plan: 'basic' | 'pro'
  currency: 'pln' | 'eur'
  orderId?: string
  /** Adres, na który Stripe odeśle gościa. Bierzemy go z **bieżącego żądania**,
   *  nie z konfiguracji — adres zwrotny ma prowadzić tam, skąd przyszedł klient. */
  adresPowrotu: string
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
          unit_amount: PRICES[plan][currency],
          product_data: { name: PLAN_NAMES[plan] },
        },
        quantity: 1,
      }],
      success_url: `${adres}/sukces?plan=${plan}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${adres}/#cennik`,
      // Metody płatności dobiera Stripe wg konta i kraju gościa. Sztywna lista
      // wywracała odnowienia po zmianie konta platformy (p24 nie istniał na nowym).
      metadata: { plan, currency, ...(orderId ? { order_id: orderId } : {}) },
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
