/**
 * Online check-in — walidacja danych od gościa. Czysta, bez bazy i sieci.
 *
 * Funkcja pakietu Pro: gość podaje przed przyjazdem dane osób, godzinę przybycia
 * i uwagi, a właściciel ma komplet, zanim ktokolwiek zapuka do drzwi.
 *
 * Dwie rzeczy wymusiły kształt tego modułu:
 *
 * 1. **To są dane osobowe, część z nich wrażliwe** (numer dokumentu). Zbieramy
 *    wyłącznie to, co właściciel naprawdę musi mieć, i tylko na czas pobytu —
 *    kasowanie po wyjeździe robi cron. Im mniej pól, tym mniej do skasowania.
 * 2. **Formularz jest publiczny** — chroni go wyłącznie znajomość
 *    identyfikatora rezerwacji. Wszystko, co przyjdzie, jest niezaufane:
 *    długości, liczba osób i format godziny sprawdzane po stronie serwera.
 */

/** Więcej osób niż to nie zmieści się w żadnym apartamencie z naszej oferty. */
export const MAX_OSOB = 20

export const MAX_DL_IMIENIA = 120
export const MAX_DL_DOKUMENTU = 40
export const MAX_DL_UWAG = 1000

export interface OsobaCheckin {
  /** Imię i nazwisko, tak jak w dokumencie. */
  imie: string
  /** Numer dokumentu — pole opcjonalne, bo nie każdy właściciel go wymaga. */
  dokument: string | null
  /** Obywatelstwo, opcjonalne. */
  obywatelstwo: string | null
}

export interface DaneCheckin {
  osoby: OsobaCheckin[]
  /** Godzina przyjazdu w formacie HH:MM albo null. */
  godzinaPrzyjazdu: string | null
  uwagi: string | null
}

export type BladCheckin =
  | 'brak_osob'
  | 'za_duzo_osob'
  | 'brak_imienia'
  | 'zla_godzina'

const GODZINA = /^([01]\d|2[0-3]):[0-5]\d$/

function tekst(v: unknown, maks: number): string | null {
  if (typeof v !== 'string') return null
  // Znaki sterujące potrafią rozbić układ maila, którym właściciel to dostanie.
  const s = v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim()
  return s.length === 0 ? null : s.slice(0, maks)
}

/**
 * Sprawdza dane z formularza. Zwraca gotowy zestaw albo kod błędu.
 *
 * `liczbaGosci` pochodzi z rezerwacji — gość nie może zgłosić więcej osób,
 * niż zarezerwował, bo to obchodziłoby limit pojemności apartamentu.
 */
export function sprawdzCheckin(
  wejscie: unknown,
  liczbaGosci: number,
): { ok: true; dane: DaneCheckin } | { ok: false; blad: BladCheckin } {
  const d = (typeof wejscie === 'object' && wejscie !== null ? wejscie : {}) as Record<string, unknown>
  const surowe = Array.isArray(d.osoby) ? d.osoby : []

  if (surowe.length === 0) return { ok: false, blad: 'brak_osob' }

  const limit = Math.min(Math.max(1, liczbaGosci), MAX_OSOB)
  if (surowe.length > limit) return { ok: false, blad: 'za_duzo_osob' }

  const osoby: OsobaCheckin[] = []
  for (const o of surowe) {
    const w = (typeof o === 'object' && o !== null ? o : {}) as Record<string, unknown>
    const imie = tekst(w.imie, MAX_DL_IMIENIA)
    if (!imie) return { ok: false, blad: 'brak_imienia' }
    osoby.push({
      imie,
      dokument: tekst(w.dokument, MAX_DL_DOKUMENTU),
      obywatelstwo: tekst(w.obywatelstwo, 60),
    })
  }

  let godzinaPrzyjazdu: string | null = null
  const g = tekst(d.godzinaPrzyjazdu, 5)
  if (g !== null) {
    if (!GODZINA.test(g)) return { ok: false, blad: 'zla_godzina' }
    godzinaPrzyjazdu = g
  }

  return {
    ok: true,
    dane: { osoby, godzinaPrzyjazdu, uwagi: tekst(d.uwagi, MAX_DL_UWAG) },
  }
}

/**
 * Czy check-in ma jeszcze sens dla tej rezerwacji.
 *
 * Po wyjeździe formularz nie ma do czego służyć, a dane i tak podlegają
 * skasowaniu. Anulowana rezerwacja też odpada.
 */
export function czyMoznaWypelnic(
  booking: { check_out: string; status: string },
  dzis: string,
): boolean {
  if (booking.status === 'cancelled') return false
  return booking.check_out >= dzis
}

/** Ile dni po wyjeździe kasujemy dane check-inu (RODO — minimalizacja retencji). */
export const DNI_RETENCJI = 7
