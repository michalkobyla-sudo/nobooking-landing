/**
 * Token darmowego demo w pamięci karty — z podglądu (`/podglad/[token]`)
 * przez cennik do formularza zamówienia, który wypełnia się danymi z demo.
 *
 * Zmienna modułu, nie `sessionStorage` — z tego samego powodu co źródło wejścia
 * (`zrodloWPamieci.ts`): nic nie zapisujemy w urządzeniu. Przeżywa nawigację
 * `<Link>` i `router.push`, nie przeżywa przeładowania — wtedy formularz
 * jest po prostu pusty.
 */
let token: string | null = null

export function zapamietajDemo(t: string): void {
  token = t
}

export function zapamietaneDemo(): string | null {
  return token
}
