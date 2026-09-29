/**
 * Walidacja kodów rabatowych — czysta, bez bazy.
 *
 * Kod rabatowy obniża kwotę pobieraną od gościa, a tworzy go właściciel
 * z panelu. Wartości idą wprost z formularza, więc muszą przejść przez sito
 * zanim trafią do bazy: procent spoza zakresu albo limit użyć równy zeru
 * dawałyby rabat, którego nikt nie chciał.
 */

export type BladKodu =
  | 'zly_kod'        // pusty, za krótki, za długi albo niedozwolone znaki
  | 'zly_procent'    // poza 1–100 albo nie liczba całkowita
  | 'zly_limit'      // ujemny, zero albo nie liczba całkowita
  | 'zla_data'       // zły format albo termin z przeszłości

export interface NowyKod {
  code: string
  discount_pct: number
  max_uses: number | null
  valid_until: string | null
}

/** Kody są krótkie i czytelne — mają być przepisywane z ulotki albo wiadomości. */
export const MIN_DL_KODU = 3
export const MAX_DL_KODU = 24

/** Litery bez ogonków i cyfry. Myślnik dopuszczony, bo „LATO-10" czyta się dobrze.
 *  Polskie znaki odpadają celowo: gość przepisujący kod z SMS-a pomyli „ł" z „l". */
const DOZWOLONE = /^[A-Z0-9-]+$/

const ISO_DATA = /^\d{4}-\d{2}-\d{2}$/

/**
 * Sprowadza kod do postaci zapisywanej w bazie: wielkie litery, bez spacji.
 * Ta sama postać jest używana przy realizacji (`book/route.ts` porównuje
 * `code.trim().toUpperCase()`), więc rozjazd tutaj oznaczałby kod, którego
 * nie da się użyć.
 */
export function znormalizujKod(surowy: string): string {
  return String(surowy ?? '').trim().toUpperCase().replace(/\s+/g, '')
}

/**
 * Sprawdza dane nowego kodu. Zwraca gotowy wiersz albo kod błędu.
 * `dzis` w formacie YYYY-MM-DD.
 */
export function sprawdzNowyKod(
  wejscie: { code?: unknown; discount_pct?: unknown; max_uses?: unknown; valid_until?: unknown },
  dzis: string,
): { ok: true; kod: NowyKod } | { ok: false; blad: BladKodu } {
  const code = znormalizujKod(wejscie.code as string)
  if (code.length < MIN_DL_KODU || code.length > MAX_DL_KODU || !DOZWOLONE.test(code)) {
    return { ok: false, blad: 'zly_kod' }
  }

  const pct = Number(wejscie.discount_pct)
  if (!Number.isInteger(pct) || pct < 1 || pct > 100) {
    return { ok: false, blad: 'zly_procent' }
  }

  // Brak limitu to świadomy wybór (kod otwarty), ale zero użyć nie jest —
  // taki kod nie zadziałałby ani razu.
  let max_uses: number | null = null
  if (wejscie.max_uses !== null && wejscie.max_uses !== undefined && wejscie.max_uses !== '') {
    const n = Number(wejscie.max_uses)
    if (!Number.isInteger(n) || n < 1) return { ok: false, blad: 'zly_limit' }
    max_uses = n
  }

  let valid_until: string | null = null
  if (wejscie.valid_until !== null && wejscie.valid_until !== undefined && wejscie.valid_until !== '') {
    const d = String(wejscie.valid_until).trim()
    if (!ISO_DATA.test(d) || d < dzis) return { ok: false, blad: 'zla_data' }
    valid_until = d
  }

  return { ok: true, kod: { code, discount_pct: pct, max_uses, valid_until } }
}
