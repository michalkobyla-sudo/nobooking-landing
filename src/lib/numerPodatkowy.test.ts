import { describe, it, expect } from 'vitest'
import { normalizujNumerPodatkowy } from './numerPodatkowy'

const ok = (s: string) => normalizujNumerPodatkowy(s)
describe('normalizujNumerPodatkowy', () => {
  it('polski NIP — z myślnikami, spacjami i prefiksem PL', () => {
    for (const w of ['5342334497', '534-233-44-97', '534 233 44 97', 'PL5342334497', 'pl 534-233-44-97']) {
      expect(ok(w)).toEqual({ ok: true, numer: '5342334497', kraj: 'PL' })
    }
  })

  // Suma kontrolna łapie literówki, które inaczej trafiłyby na fakturę.
  it('polski NIP z błędną sumą kontrolną odpada', () => {
    expect(ok('5342334498').ok).toBe(false)
    expect(ok('1234567890').ok).toBe(false)
  })

  // Do 2026-11-18 formularz przyjmował wyłącznie 10 cyfr — firma z Hiszpanii,
  // naszego głównego rynku, nie mogła zamówić z fakturą.
  it('numery VAT UE z prefiksem kraju', () => {
    expect(ok('ESB12345678')).toEqual({ ok: true, numer: 'ESB12345678', kraj: 'ES' })
    expect(ok('es-b12345678')).toEqual({ ok: true, numer: 'ESB12345678', kraj: 'ES' })
    expect(ok('DE123456789')).toEqual({ ok: true, numer: 'DE123456789', kraj: 'DE' })
    expect(ok('FRXX123456789')).toEqual({ ok: true, numer: 'FRXX123456789', kraj: 'FR' })
    expect(ok('NL123456789B01')).toEqual({ ok: true, numer: 'NL123456789B01', kraj: 'NL' })
    expect(ok('ATU12345678')).toEqual({ ok: true, numer: 'ATU12345678', kraj: 'AT' })
    expect(ok('EL123456789')).toEqual({ ok: true, numer: 'EL123456789', kraj: 'EL' })
  })

  it('zły format dla danego kraju odpada', () => {
    for (const w of ['DE12345678', 'ES123', 'NL123456789', 'AT12345678', 'XX123456789', 'GR123456789', '', 'abc']) {
      expect(ok(w).ok).toBe(false)
    }
  })
})
