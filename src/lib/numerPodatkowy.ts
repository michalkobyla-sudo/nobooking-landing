/**
 * NIP albo numer VAT UE z formularza zamówienia.
 *
 * Do 2026-11-18 formularz przyjmował wyłącznie 10 cyfr (`/^\d{10}$/`), więc
 * firma spoza Polski — w tym z Hiszpanii, naszego głównego rynku — nie mogła
 * zamówić strony z fakturą. A faktura dla firmy z UE z jej numerem VAT to
 * podstawa odwrotnego obciążenia; bez numeru sprzedaż wygląda jak konsumencka.
 *
 * Formaty krajów według opisu systemu VIES. Sprawdzamy format, nie istnienie
 * numeru — to robi VIES przy wystawianiu faktury.
 */

const FORMATY: Record<string, RegExp> = {
  AT: /^U\d{8}$/,
  BE: /^[01]\d{9}$/,
  BG: /^\d{9,10}$/,
  CY: /^\d{8}[A-Z]$/,
  CZ: /^\d{8,10}$/,
  DE: /^\d{9}$/,
  DK: /^\d{8}$/,
  EE: /^\d{9}$/,
  EL: /^\d{9}$/,
  ES: /^[A-Z0-9]\d{7}[A-Z0-9]$/,
  FI: /^\d{8}$/,
  FR: /^[A-HJ-NP-Z0-9]{2}\d{9}$/,
  HR: /^\d{11}$/,
  HU: /^\d{8}$/,
  IE: /^(\d{7}[A-W][A-I]?|\d[A-Z+*]\d{5}[A-W])$/,
  IT: /^\d{11}$/,
  LT: /^(\d{9}|\d{12})$/,
  LU: /^\d{8}$/,
  LV: /^\d{11}$/,
  MT: /^\d{8}$/,
  NL: /^\d{9}B\d{2}$/,
  PT: /^\d{9}$/,
  RO: /^\d{2,10}$/,
  SE: /^\d{10}01$/,
  SI: /^\d{8}$/,
  SK: /^\d{10}$/,
  XI: /^(\d{9}|\d{12}|GD\d{3}|HA\d{3})$/,
}

/** Suma kontrolna NIP — łapie literówki, które inaczej trafiłyby na fakturę. */
function poprawnyNip(nip: string): boolean {
  if (!/^\d{10}$/.test(nip)) return false
  const wagi = [6, 5, 7, 2, 3, 4, 5, 6, 7]
  const suma = wagi.reduce((s, w, i) => s + w * Number(nip[i]), 0)
  return suma % 11 === Number(nip[9])
}

export type WynikNumeru =
  | { ok: true; /** Postać do zapisu: NIP bez prefiksu, VAT UE z prefiksem. */ numer: string; kraj: string }
  | { ok: false }

export function normalizujNumerPodatkowy(wejscie: string): WynikNumeru {
  const s = String(wejscie ?? '').toUpperCase().replace(/[\s.\-/]/g, '')
  if (!s) return { ok: false }

  // Polski NIP — bez prefiksu albo z PL. Zapisujemy same cyfry, bo tak
  // wygląda NIP na fakturze krajowej.
  const pl = s.startsWith('PL') ? s.slice(2) : s
  if (/^\d{10}$/.test(pl)) {
    return poprawnyNip(pl) ? { ok: true, numer: pl, kraj: 'PL' } : { ok: false }
  }

  const kraj = s.slice(0, 2)
  const format = FORMATY[kraj]
  if (!format || !format.test(s.slice(2))) return { ok: false }
  return { ok: true, numer: s, kraj }
}
