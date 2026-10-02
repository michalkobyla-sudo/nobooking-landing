import { describe, it, expect } from 'vitest'
import { poprawneDane, normalizujAdres } from './checkoutZamowienia'

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
