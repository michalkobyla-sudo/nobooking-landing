import { describe, it, expect } from 'vitest'
import { adresWlasciciela } from './provision-site'
import type { Order } from './types'

/**
 * Pierwszy pelny przebieg (Etap 2) pokazal, ze haslo do panelu szlo na adres
 * kontaktowy ze strony, a nie do kupujacego. W tescie adres kontaktowy nie
 * istnial, wiec klient nie dostalby danych logowania — a wysylka z naszej
 * strony zakonczylaby sie sukcesem.
 */
describe('adresWlasciciela', () => {
  const zamowienie = (p: Partial<Order>) => p as Pick<Order, 'email'>

  it('bierze adres kupujacego', () => {
    expect(adresWlasciciela(zamowienie({ email: 'kupujacy@example.com' }))).toBe('kupujacy@example.com')
  })

  it('normalizuje wielkosc liter i spacje', () => {
    expect(adresWlasciciela(zamowienie({ email: '  Kupujacy@Example.COM ' }))).toBe('kupujacy@example.com')
  })

  it('nie wywraca sie na braku adresu', () => {
    expect(adresWlasciciela(zamowienie({ email: undefined as unknown as string }))).toBe('')
  })
})
