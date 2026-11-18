import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { terminOdstapienia, htmlPotwierdzenia } from './potwierdzenieUmowy'
import { PRICE_LABELS } from './prices'

const REGULAMIN = fs.readFileSync(path.join(process.cwd(), 'docs', 'PRAWNE-regulamin.md'), 'utf8')
const baza = { plan: 'pro' as const, currency: 'pln' as const, numer: 'a1b2c3d4-e5f6', zawarcie: new Date('2026-11-18T10:00:00Z'), regulaminMd: REGULAMIN }

describe('terminOdstapienia', () => {
  // Art. 27 upk: 14 dni od zawarcia umowy o świadczenie usług.
  it('14 dni od zawarcia', () => {
    expect(terminOdstapienia(new Date('2026-11-18T10:00:00Z'))).toBe('2026-12-02')
    expect(terminOdstapienia(new Date('2026-12-25T23:30:00Z'))).toBe('2027-01-08')
  })
})

/**
 * Art. 21 upk: potwierdzenie umowy na trwałym nośniku, z informacjami z art. 12.
 * Mail jest trwałym nośnikiem; link do regulaminu nie jest, bo treść pod nim
 * może się zmienić — dlatego regulamin idzie w treści.
 */
describe('htmlPotwierdzenia', () => {
  const html = htmlPotwierdzenia(baza)

  it('podaje pakiet, cenę i termin odstąpienia słownie', () => {
    expect(html).toContain('Pro')
    expect(html).toContain(PRICE_LABELS.pro.pln)
    expect(html).toContain('2 grudnia 2026')
    expect(html).toContain('kontakt@nobooking.eu')
  })

  it('zawiera pełny regulamin, nie tylko link', () => {
    expect(html).toContain('Powierzenie przetwarzania danych gości')
    expect(html).toContain('Wzór formularza odstąpienia')
  })

  // Względny link z regulaminu w mailu prowadzi donikąd — klient pocztowy
  // nie zna domeny.
  it('linki w mailu są bezwzględne', () => {
    expect(html).not.toMatch(/href="\//)
    expect(html).toContain('href="https://nobooking.eu/polityka-prywatnosci"')
  })

  it('w treści nie zostaje surowy Markdown', () => {
    expect(html.replace(/<[^>]*>/g, '')).not.toContain('**')
  })

  it('cena w walucie zamówienia', () => {
    expect(htmlPotwierdzenia({ ...baza, plan: 'basic', currency: 'eur' })).toContain(PRICE_LABELS.basic.eur)
  })

  // Plik regulaminu może nie trafić do paczki funkcji na Vercelu — mail
  // onboardingowy ma wyjść mimo to, z odnośnikiem zamiast treści.
  it('bez treści regulaminu nadal daje potwierdzenie z odnośnikiem', () => {
    const bez = htmlPotwierdzenia({ ...baza, regulaminMd: null })
    expect(bez).toContain('2 grudnia 2026')
    expect(bez).toContain('https://nobooking.eu/regulamin')
    expect(bez).not.toContain('Wzór formularza odstąpienia')
  })
})
