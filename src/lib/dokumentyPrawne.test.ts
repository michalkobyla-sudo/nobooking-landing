import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'
import { WERSJA_REGULAMINU, WERSJA_POLITYKI, dataSlownie } from './dokumentyPrawne'
import { PRICE_LABELS, RENEWAL_LABELS } from './prices'

const czytaj = (plik: string) => fs.readFileSync(path.join(process.cwd(), 'docs', plik), 'utf8')
const REGULAMIN = czytaj('PRAWNE-regulamin.md')
const POLITYKA = czytaj('PRAWNE-polityka-prywatnosci.md')

describe('wersje dokumentów prawnych', () => {
  it('data w nagłówku zgadza się z wersją zapisywaną przy zamówieniu', () => {
    expect(REGULAMIN).toContain(`Obowiązuje od ${dataSlownie(WERSJA_REGULAMINU)}`)
    expect(POLITYKA).toContain(`Obowiązuje od ${dataSlownie(WERSJA_POLITYKI)}`)
  })

  it('dataSlownie', () => {
    expect(dataSlownie('2026-11-09')).toBe('9 listopada 2026 r.')
    expect(dataSlownie('2027-01-31')).toBe('31 stycznia 2027 r.')
  })
})

/**
 * Regulamin podaje ceny wprost, a ceny w kodzie zmieniają się osobno. Już raz
 * panel obiecywał co innego niż strona sprzedażowa — tu rozjazd byłby gorszy,
 * bo regulamin jest umową.
 */
describe('ceny w regulaminie', () => {
  for (const plan of ['basic', 'pro'] as const) {
    it(`zakup i odnowienie ${plan} zgadzają się z prices.ts`, () => {
      expect(REGULAMIN).toContain(`${PRICE_LABELS[plan].pln} / ${PRICE_LABELS[plan].eur}`)
      expect(REGULAMIN).toContain(`${RENEWAL_LABELS[plan].pln} / ${RENEWAL_LABELS[plan].eur}`)
    })
  }
})

/**
 * Do 2026-11-09 obie publiczne strony pokazywały klientom wewnętrzną sekcję
 * „Do rozstrzygnięcia z kimś, kto zna prawo” („umowy powierzenia dziś nie
 * ma”) i nazwy plików z repozytorium — bo komponent renderuje plik w całości.
 * Notatki robocze mieszkają w `PRAWNE-przeglad-*.md`, którego nic nie publikuje.
 */
describe('publiczne dokumenty nie zawierają notatek roboczych', () => {
  for (const [nazwa, tresc] of [['regulamin', REGULAMIN], ['polityka', POLITYKA]] as const) {
    it(nazwa, () => {
      expect(tresc).not.toMatch(/Do rozstrzygnięcia|TODO|do uzupełnienia|\.\.\.\s*$/im)
      expect(tresc).not.toMatch(/src\/|\.tsx?\b|PAKIET-[A-Z]+\.md|DNI_RETENCJI/)
    })

    // `markdown.ts` celowo nie obsługuje kursywy — pojedyncza gwiazdka
    // wyświetliłaby się klientowi dosłownie.
    it(`${nazwa}: bez kursywy, której renderer nie zna`, () => {
      expect(tresc.replace(/\*\*/g, '')).not.toContain('*')
    })
  }
})
