import { describe, it, expect } from 'vitest'
import { poprawneDane, normalizujAdres, wczesnyStartZMetadanych, cenaTestowa } from './checkoutZamowienia'

/**
 * Ta funkcja powstala po bledzie, ktory kosztowal dwie prawdziwe sesje
 * platnosci utworzone z localhosta na koncie produkcyjnym. Testy pilnuja
 * dwoch rzeczy, ktore wtedy zawiodly.
 */
describe('poprawneDane', () => {
  it('przepuszcza tylko znane plany i waluty', () => {
    expect(poprawneDane('basic', 'pln')).toBe(true)
    expect(poprawneDane('pro', 'eur')).toBe(true)
  })

  it('odrzuca wszystko inne', () => {
    for (const [p, w] of [['enterprise', 'pln'], ['pro', 'usd'], ['', ''], [null, null], [undefined, 'pln']]) {
      expect(poprawneDane(p, w)).toBe(false)
    }
  })
})

describe('normalizujAdres', () => {
  // Adres powrotu sklada sie przez doklejenie "/sukces", wiec koncowy ukosnik
  // dawalby "//sukces".
  it('obcina koncowe ukosniki', () => {
    expect(normalizujAdres('http://localhost:3000/')).toBe('http://localhost:3000')
    expect(normalizujAdres('https://nobooking.eu///')).toBe('https://nobooking.eu')
    expect(normalizujAdres('  https://nobooking.eu  ')).toBe('https://nobooking.eu')
  })

  it('zostawia poprawny adres bez zmian', () => {
    expect(normalizujAdres('http://localhost:3000')).toBe('http://localhost:3000')
  })
})

// Starsze sesje (sprzed 2026-11-19) nie mają pola — to nie „nie”, tylko „nie wiadomo”.
describe('wczesnyStartZMetadanych', () => {
  it('tak / nie / brak', () => {
    expect(wczesnyStartZMetadanych({ wczesny_start: 'tak' })).toBe(true)
    expect(wczesnyStartZMetadanych({ wczesny_start: 'nie' })).toBe(false)
    expect(wczesnyStartZMetadanych({})).toBeNull()
    expect(wczesnyStartZMetadanych(null)).toBeNull()
    expect(wczesnyStartZMetadanych({ wczesny_start: 'true' })).toBeNull()
  })
})

describe('cenaTestowa (tymczasowe)', () => {
  const env = { ZAKUP_TESTOWY_EMAIL: 'Test@Example.com', ZAKUP_TESTOWY_GROSZE: '200' }
  it('tylko dla dokładnego adresu i przy obu zmiennych', () => {
    expect(cenaTestowa('test@example.com', env)).toBe(200)
    expect(cenaTestowa('inny@example.com', env)).toBeNull()
    expect(cenaTestowa('test@example.com', { ZAKUP_TESTOWY_EMAIL: 'test@example.com' })).toBeNull()
    expect(cenaTestowa('test@example.com', {})).toBeNull()
    expect(cenaTestowa(undefined, env)).toBeNull()
  })
  it('nie schodzi poniżej minimum Stripe', () => {
    expect(cenaTestowa('test@example.com', { ...env, ZAKUP_TESTOWY_GROSZE: '100' })).toBeNull()
  })
})
