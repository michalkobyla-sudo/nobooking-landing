import { describe, it, expect } from 'vitest'
import { kodKraju, krajZIp, krajRozliczeniowyZSesji, krajKartyZPlatnosci } from './krajNabywcy'

describe('kodKraju', () => {
  it('przyjmuje dwuliterowy kod i normalizuje wielkość liter', () => {
    expect(kodKraju('es')).toBe('ES')
    expect(kodKraju(' PL ')).toBe('PL')
  })

  it('odrzuca nieznany kraj Vercela i śmieci', () => {
    for (const v of ['XX', '', 'POL', 'P1', null, undefined, 48, {}]) {
      expect(kodKraju(v)).toBeNull()
    }
  })
})

describe('źródła kraju', () => {
  it('czyta nagłówek Vercela', () => {
    expect(krajZIp(new Headers({ 'x-vercel-ip-country': 'DE' }))).toBe('DE')
    expect(krajZIp(new Headers())).toBeNull()
  })

  it('czyta kraj rozliczeniowy z sesji Checkout', () => {
    expect(krajRozliczeniowyZSesji({ customer_details: { address: { country: 'ES' } } })).toBe('ES')
    expect(krajRozliczeniowyZSesji({ customer_details: { address: null } })).toBeNull()
    expect(krajRozliczeniowyZSesji({})).toBeNull()
    expect(krajRozliczeniowyZSesji(null)).toBeNull()
  })

  it('czyta kraj karty tylko z rozwiniętej metody płatności', () => {
    expect(krajKartyZPlatnosci({ payment_method: { card: { country: 'ES' } } })).toBe('ES')
    // BLIK: metoda bez karty.
    expect(krajKartyZPlatnosci({ payment_method: { blik: {} } })).toBeNull()
    // Nierozwinięta — sam identyfikator.
    expect(krajKartyZPlatnosci({ payment_method: 'pm_123' })).toBeNull()
    expect(krajKartyZPlatnosci(null)).toBeNull()
  })
})
