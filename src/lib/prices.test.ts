import { describe, it, expect } from 'vitest'
import { PRICES, PRICE_LABELS, RENEWAL_PRICES, RENEWAL_LABELS, PLAN_NAMES } from './prices'

/**
 * Etykieta to kwota, którą czyta klient; `PRICES` to kwota, którą pobiera
 * Stripe. Rozjazd między nimi oznacza obietnicę inną niż obciążenie — dokładnie
 * to, co 2026-10-05 wyszło przy odnowieniu (oferta 299 zł, system 799 zł).
 */
const liczbaZEtykiety = (e: string) => Number(e.replace(/[^\d]/g, ''))

describe('ceny i etykiety nie mogą się rozjechać', () => {
  it.each(['basic', 'pro'] as const)('etykieta zakupu %s zgadza się z kwotą', (plan) => {
    expect(liczbaZEtykiety(PRICE_LABELS[plan].pln)).toBe(PRICES[plan].pln / 100)
    expect(liczbaZEtykiety(PRICE_LABELS[plan].eur)).toBe(PRICES[plan].eur / 100)
  })

  it.each(['basic', 'pro'] as const)('etykieta odnowienia %s zgadza się z kwotą', (plan) => {
    expect(liczbaZEtykiety(RENEWAL_LABELS[plan].pln)).toBe(RENEWAL_PRICES[plan].pln / 100)
    expect(liczbaZEtykiety(RENEWAL_LABELS[plan].eur)).toBe(RENEWAL_PRICES[plan].eur / 100)
  })

  // Odnowienie tańsze od zakupu to obietnica z oferty, nie szczegół techniczny.
  it.each(['basic', 'pro'] as const)('odnowienie %s jest tańsze niż zakup', (plan) => {
    expect(RENEWAL_PRICES[plan].pln).toBeLessThan(PRICES[plan].pln)
    expect(RENEWAL_PRICES[plan].eur).toBeLessThan(PRICES[plan].eur)
  })

  it('Pro jest droższy od Basic w obu walutach i w obu rodzajach ceny', () => {
    expect(PRICES.pro.pln).toBeGreaterThan(PRICES.basic.pln)
    expect(PRICES.pro.eur).toBeGreaterThan(PRICES.basic.eur)
    expect(RENEWAL_PRICES.pro.pln).toBeGreaterThan(RENEWAL_PRICES.basic.pln)
    expect(RENEWAL_PRICES.pro.eur).toBeGreaterThan(RENEWAL_PRICES.basic.eur)
  })

  // Kwoty idą do Stripe'a w groszach i centach — ułamek znaczyłby,
  // że gdzieś po drodze ktoś podzielił przez 100 dwa razy.
  it('wszystkie kwoty są całkowite', () => {
    for (const z of [PRICES, RENEWAL_PRICES]) {
      for (const plan of ['basic', 'pro'] as const) {
        expect(Number.isInteger(z[plan].pln)).toBe(true)
        expect(Number.isInteger(z[plan].eur)).toBe(true)
      }
    }
  })

  it('nazwa planu trafiająca na paragon Stripe nie jest pusta', () => {
    expect(PLAN_NAMES.basic).toMatch(/Basic/)
    expect(PLAN_NAMES.pro).toMatch(/Pro/)
  })
})
