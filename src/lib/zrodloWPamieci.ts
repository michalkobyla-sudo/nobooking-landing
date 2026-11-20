import { scal, type Zrodlo } from './attribution'

/**
 * Źródło wejścia trzymane wyłącznie w pamięci karty przeglądarki.
 *
 * Dlaczego nie `localStorage`: art. 399 Prawa komunikacji elektronicznej
 * obejmuje każdy zapis w urządzeniu użytkownika, nie tylko ciasteczka, a zapis
 * na potrzeby oceny reklam nie jest niezbędny do usługi — wymagałby zgody,
 * czyli banera. Zmienna modułu niczego w urządzeniu nie zapisuje.
 *
 * Koszt: źródło przeżywa nawigację wewnątrz serwisu (`<Link>`, `router.push`),
 * ale nie przeładowanie strony ani powrót następnego dnia. Dlatego linki między
 * stroną główną, demo i formularzem zamówienia są linkami Next, a nie `<a>`.
 */
let zapamietane: Zrodlo | null = null

/** Pierwsze dotknięcie wygrywa — reguła ta sama co wcześniej (`scal`). */
export function zapamietajZrodlo(biezace: Zrodlo): void {
  zapamietane = scal(zapamietane, biezace)
}

export function zapamietaneZrodlo(): Zrodlo | null {
  return zapamietane
}

/** Tylko dla testów. */
export function wyczyscZapamietaneZrodlo(): void {
  zapamietane = null
}
