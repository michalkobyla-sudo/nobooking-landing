/** Walidatory współdzielone przez trasy API. */

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
}

/**
 * Zamienia wartość z żądania na liczbę mieszczącą się w podanym zakresie.
 * Zwraca null, gdy wartość nie jest sensowną liczbą.
 *
 * Number() samo w sobie nie wystarcza: Number('abc') to NaN, a NaN zapisany
 * w kolumnie jsonb serializuje się do null. Taki cennik wywracał potem
 * kalkulację ceny rezerwacji (amountCents: NaN) i Stripe odrzucał płatność.
 * Number('') to 0, a Number('1e999') to Infinity — oba trzeba odsiać tak samo.
 */
export function toBoundedNumber(
  value: unknown,
  { min, max }: { min: number; max: number },
): number | null {
  if (value === null || value === undefined || value === '') return null

  const n = Number(value)
  if (!Number.isFinite(n)) return null
  if (n < min || n > max) return null

  return n
}

/** Granice pól cennika — chronią przed cenami ujemnymi i absurdalnymi. */
export const LIMITY_CENNIKA = {
  pricePerNight: { min: 0, max: 1_000_000 },
  minNights:     { min: 1, max: 365 },
  cleaningFee:   { min: 0, max: 100_000 },
} as const
