import { describe, it, expect } from 'vitest'
import { wiedzaPodstawowa } from './botWiedza'
import { PRICE_LABELS, RENEWAL_LABELS } from './prices'

/**
 * Bot mówi o cenach i warunkach publicznie, pod marką. Wiedza ręcznie wpisana
 * do bazy rozjechałaby się z cennikiem przy pierwszej zmianie — ten błąd już
 * raz mieliśmy (panel obiecywał inną cenę odnowienia niż strona sprzedażowa).
 */
describe('wiedzaPodstawowa', () => {
  const w = wiedzaPodstawowa()

  it('ceny zakupu i odnowienia wprost z prices.ts', () => {
    for (const plan of ['basic', 'pro'] as const) {
      expect(w).toContain(`${PRICE_LABELS[plan].pln} / ${PRICE_LABELS[plan].eur}`)
      expect(w).toContain(`${RENEWAL_LABELS[plan].pln} / ${RENEWAL_LABELS[plan].eur}`)
    }
  })

  it('czas realizacji zgodny z regulaminem', () => {
    expect(w).toMatch(/24 godzin/)
    expect(w).toMatch(/7 dni roboczych/)
  })

  it('zawiera adres zamówienia, demo i kontakt', () => {
    expect(w).toContain('https://nobooking.eu/zamow')
    expect(w).toContain('https://nobooking.eu/demo')
    expect(w).toContain('kontakt@nobooking.eu')
  })

  // Bot nie może obiecywać tego, czego nie ma — ani rezerwacji, ani prowizji.
  it('mówi wprost, czego nie gwarantujemy', () => {
    expect(w).toMatch(/nie gwarantujemy/i)
  })
})
