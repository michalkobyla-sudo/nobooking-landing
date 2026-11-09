import { describe, it, expect } from 'vitest'
import { informacjeDlaGosci, ETYKIETY, type DaneInformacji } from './informacjeDlaGosci'
import { DNI_RETENCJI } from './checkin'
import type { Lang } from './apartmentTypes'

const JEZYKI: Lang[] = ['pl', 'en', 'es', 'de']
const baza: DaneInformacji = {
  nazwaObiektu: 'Casa Sol',
  administrator: 'Anna Nowak',
  email: 'anna@example.com',
  telefon: '+34 600 000 000',
  checkin: true,
  platnosciOnline: true,
  politykaNobooking: 'https://nobooking.eu/polityka-prywatnosci',
}
const calosc = (lang: Lang, d: Partial<DaneInformacji> = {}) => {
  const i = informacjeDlaGosci(lang, { ...baza, ...d })
  return [i.tytul, ...i.sekcje.flatMap(s => [s.tytul, ...s.akapity, ...(s.punkty ?? [])])].join('\n')
}

describe('informacjeDlaGosci', () => {
  // Gość z Niemiec ma dostać tę samą informację co gość z Polski — nie krótszą.
  it('wszystkie języki mają tę samą strukturę', () => {
    for (const warianty of [{}, { checkin: false }, { platnosciOnline: false }]) {
      const ksztalt = (l: Lang) => informacjeDlaGosci(l, { ...baza, ...warianty }).sekcje
        .map(s => `${s.akapity.length}/${s.punkty?.length ?? 0}/${s.polityka ? 1 : 0}`)
      for (const l of JEZYKI) expect(ksztalt(l)).toEqual(ksztalt('pl'))
    }
  })

  it('wskazuje administratora i kontakt', () => {
    for (const l of JEZYKI) {
      expect(calosc(l)).toContain('Anna Nowak')
      expect(calosc(l)).toContain('anna@example.com')
      expect(calosc(l)).toContain('+34 600 000 000')
    }
  })

  // Bez zamówienia (strona założona ręcznie) nie znamy nazwiska — zdanie ma
  // się nadal kleić, bez „undefined” i bez pustego miejsca.
  it('bez nazwiska właściciela zdanie nadal ma sens', () => {
    for (const l of JEZYKI) {
      const t = calosc(l, { administrator: '', telefon: undefined })
      expect(t).not.toMatch(/undefined|null|\$\{|  |, \./)
      expect(t).toContain('Casa Sol')
    }
  })

  it('check-in tylko w pakiecie Pro, z retencją z kodu', () => {
    for (const l of JEZYKI) {
      expect(calosc(l)).toContain(`${DNI_RETENCJI} `)
      expect(calosc(l, { checkin: false })).not.toContain(`${DNI_RETENCJI} `)
    }
  })

  // Bez Stripe formularz nie przyjmuje płatności — nie wolno obiecywać płatności przy rezerwacji.
  it('bez płatności online nie mówi o Stripe', () => {
    for (const l of JEZYKI) {
      expect(calosc(l)).toContain('Stripe')
      expect(calosc(l, { platnosciOnline: false })).not.toContain('Stripe')
    }
  })

  it('każdy język ma etykiety do strony apartamentu', () => {
    for (const l of JEZYKI) {
      for (const v of Object.values(ETYKIETY[l])) expect(v.length).toBeGreaterThan(3)
    }
  })
})
