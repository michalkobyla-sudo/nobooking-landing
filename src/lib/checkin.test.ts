import { describe, it, expect } from 'vitest'
import {
  sprawdzCheckin, czyMoznaWypelnic,
  MAX_OSOB, MAX_DL_IMIENIA, MAX_DL_UWAG, DNI_RETENCJI,
} from './checkin'

const osoba = (imie = 'Anna Kowalska') => ({ imie, dokument: 'ABC123456', obywatelstwo: 'PL' })

describe('sprawdzCheckin — przypadek poprawny', () => {
  it('przyjmuje komplet danych', () => {
    const w = sprawdzCheckin({ osoby: [osoba()], godzinaPrzyjazdu: '15:30', uwagi: 'Przylot o 14:00' }, 4)
    expect(w.ok).toBe(true)
    if (w.ok) {
      expect(w.dane.osoby).toHaveLength(1)
      expect(w.dane.osoby[0]).toEqual({ imie: 'Anna Kowalska', dokument: 'ABC123456', obywatelstwo: 'PL' })
      expect(w.dane.godzinaPrzyjazdu).toBe('15:30')
      expect(w.dane.uwagi).toBe('Przylot o 14:00')
    }
  })

  it('dokument i obywatelstwo są opcjonalne', () => {
    const w = sprawdzCheckin({ osoby: [{ imie: 'Jan Nowak' }] }, 2)
    expect(w.ok).toBe(true)
    if (w.ok) expect(w.dane.osoby[0]).toEqual({ imie: 'Jan Nowak', dokument: null, obywatelstwo: null })
  })
})

describe('sprawdzCheckin — liczba osób', () => {
  it('odrzuca pustą listę', () => {
    for (const o of [[], undefined, null, 'tekst']) {
      expect(sprawdzCheckin({ osoby: o }, 4)).toMatchObject({ blad: 'brak_osob' })
    }
  })

  // Gość nie może zgłosić więcej osób, niż zarezerwował — inaczej formularz
  // obchodziłby limit pojemności apartamentu pilnowany przy rezerwacji.
  it('nie pozwala zgłosić więcej osób niż w rezerwacji', () => {
    const osoby = Array.from({ length: 3 }, (_, i) => osoba(`Gość ${i}`))
    expect(sprawdzCheckin({ osoby }, 2)).toMatchObject({ blad: 'za_duzo_osob' })
    expect(sprawdzCheckin({ osoby }, 3).ok).toBe(true)
  })

  it('trzyma twardy limit nawet przy absurdalnej rezerwacji', () => {
    const osoby = Array.from({ length: MAX_OSOB + 1 }, (_, i) => osoba(`Gość ${i}`))
    expect(sprawdzCheckin({ osoby }, 9999)).toMatchObject({ blad: 'za_duzo_osob' })
  })
})

describe('sprawdzCheckin — dane niezaufane', () => {
  // Formularz jest publiczny, chroni go wyłącznie znajomość identyfikatora
  // rezerwacji. Wszystko, co przyjdzie, trzeba sprawdzić po stronie serwera.
  it('wymaga imienia przy każdej osobie', () => {
    expect(sprawdzCheckin({ osoby: [{ imie: '  ' }] }, 2)).toMatchObject({ blad: 'brak_imienia' })
    expect(sprawdzCheckin({ osoby: [osoba(), { dokument: 'X' }] }, 2)).toMatchObject({ blad: 'brak_imienia' })
  })

  it('przycina zbyt długie wartości', () => {
    const w = sprawdzCheckin({ osoby: [{ imie: 'A'.repeat(500) }], uwagi: 'B'.repeat(5000) }, 2)
    if (w.ok) {
      expect(w.dane.osoby[0].imie).toHaveLength(MAX_DL_IMIENIA)
      expect(w.dane.uwagi).toHaveLength(MAX_DL_UWAG)
    }
  })

  // Znaki sterujące rozbijają układ maila, którym właściciel to dostaje.
  it('usuwa znaki sterujące', () => {
    const w = sprawdzCheckin({ osoby: [{ imie: 'Jan\u0000\nNowak' }] }, 2)
    if (w.ok) expect(w.dane.osoby[0].imie).toBe('Jan  Nowak')
  })

  it('nie wywraca się na czymkolwiek', () => {
    for (const x of [null, undefined, 'tekst', 7, []]) {
      expect(sprawdzCheckin(x, 4)).toMatchObject({ blad: 'brak_osob' })
    }
  })
})

describe('sprawdzCheckin — godzina przyjazdu', () => {
  it('przyjmuje poprawne godziny', () => {
    for (const g of ['00:00', '09:05', '15:30', '23:59']) {
      expect(sprawdzCheckin({ osoby: [osoba()], godzinaPrzyjazdu: g }, 2).ok).toBe(true)
    }
  })

  it('odrzuca zły format', () => {
    for (const g of ['24:00', '9:30', '15.30', '15:60', 'po południu']) {
      expect(sprawdzCheckin({ osoby: [osoba()], godzinaPrzyjazdu: g }, 2)).toMatchObject({ blad: 'zla_godzina' })
    }
  })

  it('brak godziny jest dozwolony', () => {
    const w = sprawdzCheckin({ osoby: [osoba()], godzinaPrzyjazdu: '' }, 2)
    if (w.ok) expect(w.dane.godzinaPrzyjazdu).toBeNull()
  })
})

describe('czyMoznaWypelnic', () => {
  const dzis = '2026-07-15'

  it('pozwala przed przyjazdem i w trakcie pobytu', () => {
    expect(czyMoznaWypelnic({ check_out: '2026-07-20', status: 'confirmed' }, dzis)).toBe(true)
    expect(czyMoznaWypelnic({ check_out: dzis, status: 'confirmed' }, dzis)).toBe(true)
  })

  it('nie pozwala po wyjeździe ani przy anulowanej', () => {
    expect(czyMoznaWypelnic({ check_out: '2026-07-14', status: 'confirmed' }, dzis)).toBe(false)
    expect(czyMoznaWypelnic({ check_out: '2026-07-20', status: 'cancelled' }, dzis)).toBe(false)
  })
})

describe('retencja', () => {
  it('dane znikają tydzień po wyjeździe', () => {
    expect(DNI_RETENCJI).toBe(7)
  })
})
