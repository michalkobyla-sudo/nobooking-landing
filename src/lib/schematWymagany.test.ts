import { describe, it, expect } from 'vitest'
import path from 'path'
import { tabeleWKodzie } from './tabeleWKodzie'
import { WYMAGANE, SWIADOMIE_POMINIETE, pilnowaneTabele } from './schematWymagany'

/**
 * Ten test jest jedynym powodem, dla którego lista wymaganego schematu nie
 * rozjedzie się z kodem po raz czwarty.
 *
 * Skanuje źródła w poszukiwaniu `.from('tabela')` i sprawdza, czy każda
 * znaleziona tabela jest albo pilnowana przez raport zdrowia, albo świadomie
 * pominięta z zapisanym powodem. Nie ma trzeciej możliwości — a dotąd była
 * i nazywała się „ktoś zapomniał".
 */

const KORZEN = path.join(__dirname, '..')

/** Tabele, do których kod faktycznie sięga. */
const tabeleUzywaneWKodzie = () => tabeleWKodzie(KORZEN)

describe('kontrakt między kodem a schematem bazy', () => {
  it('każda tabela używana w kodzie jest pilnowana albo świadomie pominięta', () => {
    const uzywane = tabeleUzywaneWKodzie()
    const pilnowane = pilnowaneTabele()

    const bezOpieki = [...uzywane.entries()]
      .filter(([t]) => !pilnowane.has(t) && !(t in SWIADOMIE_POMINIETE))
      .map(([t, gdzie]) => `${t} (używana w: ${gdzie.join(', ')})`)

    expect(
      bezOpieki,
      'Tabele używane w kodzie, ale nieobjęte kontrolą schematu.\n' +
      'Dopisz je do WYMAGANE w src/lib/schematWymagany.ts razem z kolumną,\n' +
      'której brak byłby najgroźniejszy po cichu — albo do SWIADOMIE_POMINIETE\n' +
      'z powodem. Trzy razy pominięcie takiej tabeli kosztowało nas miesiące\n' +
      'niewidocznej awarii.',
    ).toEqual([])
  })

  // Odwrotny kierunek: lista nie powinna pilnować czegoś, czego już nie ma.
  // Martwy wpis to fałszywy alarm przy każdym porannym raporcie.
  it('nie pilnuje tabel, których kod już nie używa', () => {
    const uzywane = new Set(tabeleUzywaneWKodzie().keys())
    const osierocone = [...pilnowaneTabele()].filter(t => !uzywane.has(t))
    expect(osierocone, 'Wpisy w WYMAGANE bez odpowiednika w kodzie').toEqual([])
  })

  it('każde pominięcie ma zapisany powód', () => {
    for (const [tabela, powod] of Object.entries(SWIADOMIE_POMINIETE)) {
      expect(powod.length, `Pominięcie ${tabela} bez powodu`).toBeGreaterThan(20)
    }
  })

  it('lista nie ma duplikatów', () => {
    const klucze = WYMAGANE.map(([t, k]) => `${t}.${k}`)
    expect(klucze).toEqual([...new Set(klucze)])
  })

  // Skaner jest wart tyle, ile jego zdolność do znalezienia czegokolwiek.
  it('skaner faktycznie znajduje tabele w źródłach', () => {
    const uzywane = tabeleUzywaneWKodzie()
    expect(uzywane.size).toBeGreaterThan(10)
    expect(uzywane.has('sites')).toBe(true)
    expect(uzywane.has('bookings')).toBe(true)
  })
})
