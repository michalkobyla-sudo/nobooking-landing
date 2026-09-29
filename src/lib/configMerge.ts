/**
 * Scalanie configu przy regeneracji strony — czysta funkcja, bez bazy.
 *
 * Problem: regeneracja (poprawki klienta, przycisk w panelu admina) buduje
 * config od nowa z danych onboardingowych. Te dane się nie zmieniają, więc
 * regeneracja przywracałaby ceny i kontakt sprzed wszystkich zmian, które
 * właściciel zdążył wprowadzić w swoim panelu. To są kwoty pobierane od gości,
 * więc cichy powrót do starych wartości jest gorszy niż zignorowanie prośby
 * o zmianę ceny w treści poprawek — tę właściciel wyklika w dziesięć sekund.
 *
 * Rozstrzygnięcie nie zgaduje: `orders.generated_config` trzyma ostatnią
 * wygenerowaną wersję, więc różnica między nią a stanem bieżącym to dokładnie
 * to, co zmieniono ręcznie.
 */

/** Gałęzie configu, które właściciel edytuje w panelu (`owner/settings`). */
export const POLA_WLASCICIELA = ['pricing', 'contact'] as const

export type PoleWlasciciela = (typeof POLA_WLASCICIELA)[number]

type Config = Record<string, unknown>

/** Porównanie po wartości. Configi to czysty JSON, więc to wystarcza. */
function rowne(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null)
}

export interface WynikScalenia {
  config: Config
  /** Gałęzie zachowane, bo właściciel zmienił je ręcznie. Do zalogowania. */
  zachowane: PoleWlasciciela[]
}

/**
 * @param nowy      świeżo wygenerowany config
 * @param biezacy   to, co stoi dziś w `sites.config` (null, gdy strony nie ma)
 * @param poprzedni ostatni wygenerowany config (`orders.generated_config`)
 */
export function scalPoRegeneracji(
  nowy: Config,
  biezacy: Config | null,
  poprzedni: Config | null,
): WynikScalenia {
  if (!biezacy) return { config: nowy, zachowane: [] }

  const config: Config = { ...nowy }
  const zachowane: PoleWlasciciela[] = []

  for (const pole of POLA_WLASCICIELA) {
    // Bez poprzedniej wersji nie da się odróżnić edycji właściciela od tego,
    // co model wygenerował poprzednio. Zachowujemy stan bieżący — cofnięcie
    // cen kosztuje właściciela pieniądze, zignorowanie zmiany treści nie.
    const zmienionoRecznie = poprzedni
      ? !rowne(biezacy[pole], poprzedni[pole])
      : biezacy[pole] !== undefined

    if (zmienionoRecznie && biezacy[pole] !== undefined) {
      config[pole] = biezacy[pole]
      zachowane.push(pole)
    }
  }

  return { config, zachowane }
}

/** Bezpieczne parsowanie configu z bazy. Zwraca `null` przy czymkolwiek innym niż obiekt. */
export function parsujConfig(wartosc: unknown): Config | null {
  if (wartosc === null || wartosc === undefined) return null
  if (typeof wartosc === 'object' && !Array.isArray(wartosc)) return wartosc as Config
  if (typeof wartosc !== 'string') return null
  try {
    const d = JSON.parse(wartosc) as unknown
    return typeof d === 'object' && d !== null && !Array.isArray(d) ? (d as Config) : null
  } catch {
    return null
  }
}
