import { describe, it, expect } from 'vitest'
import { bezpiecznyPowrot, panelWlasciciela } from './powrotPoLogowaniu'

const SLUG = 'casa-sol'
const PANEL = '/sites/casa-sol/admin'

describe('bezpiecznyPowrot', () => {
  it('bez parametru odsyła do panelu', () => {
    expect(bezpiecznyPowrot(null, SLUG)).toBe(PANEL)
    expect(bezpiecznyPowrot(undefined, SLUG)).toBe(PANEL)
    expect(bezpiecznyPowrot('', SLUG)).toBe(PANEL)
  })

  it('przepuszcza ścieżki tej samej strony', () => {
    expect(bezpiecznyPowrot('/sites/casa-sol/admin/galeria', SLUG)).toBe('/sites/casa-sol/admin/galeria')
    expect(bezpiecznyPowrot('/api/sites/casa-sol/owner/bookings', SLUG)).toBe('/api/sites/casa-sol/owner/bookings')
  })

  it('przepuszcza onboarding Connect z tym samym slugiem', () => {
    expect(bezpiecznyPowrot('/api/connect/onboard?slug=casa-sol&refresh=1', SLUG))
      .toBe('/api/connect/onboard?slug=casa-sol&refresh=1')
  })

  it('odrzuca onboarding Connect z cudzym slugiem', () => {
    expect(bezpiecznyPowrot('/api/connect/onboard?slug=inna-strona', SLUG)).toBe(PANEL)
  })

  // Sedno sprawy: parametr przychodzi z adresu, więc może go ustawić ktokolwiek.
  it('odrzuca adresy bezwzględne', () => {
    expect(bezpiecznyPowrot('https://zly.example/phishing', SLUG)).toBe(PANEL)
    expect(bezpiecznyPowrot('http://zly.example', SLUG)).toBe(PANEL)
  })

  it('odrzuca ścieżki wyglądające na względne, które nie są', () => {
    // Przeglądarka czyta `//host` jako adres bezwzględny z bieżącym protokołem.
    expect(bezpiecznyPowrot('//zly.example/phishing', SLUG)).toBe(PANEL)
    expect(bezpiecznyPowrot('/\\zly.example', SLUG)).toBe(PANEL)
  })

  it('odrzuca ścieżki innej strony', () => {
    expect(bezpiecznyPowrot('/sites/cudza-strona/admin', SLUG)).toBe(PANEL)
    expect(bezpiecznyPowrot('/api/sites/cudza-strona/owner/bookings', SLUG)).toBe(PANEL)
  })

  it('odrzuca slug, który jest tylko przedrostkiem', () => {
    // `/sites/casa-solarium/` zaczyna się tak samo jak `/sites/casa-sol`,
    // dlatego porównujemy razem z zamykającym ukośnikiem.
    expect(bezpiecznyPowrot('/sites/casa-solarium/admin', SLUG)).toBe(PANEL)
  })

  it('odrzuca znaki sterujące', () => {
    expect(bezpiecznyPowrot('/sites/casa-sol/admin\r\nSet-Cookie: x=1', SLUG)).toBe(PANEL)
  })

  it('nie zapętla powrotu na ekran logowania', () => {
    expect(bezpiecznyPowrot('/sites/casa-sol/admin/login', SLUG)).toBe(PANEL)
  })

  it('panelWlasciciela składa adres panelu', () => {
    expect(panelWlasciciela('inna')).toBe('/sites/inna/admin')
  })
})
