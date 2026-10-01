/**
 * Licznik żądań — czysta logika, bez zależności od Next.js.
 *
 * Wyciągnięty z `src/proxy.ts`, żeby dało się go przetestować: middleware
 * uruchamia się tylko w działającej aplikacji, więc zachowanie licznika było
 * dotąd sprawdzane wyłącznie przez wysyłanie prawdziwych żądań.
 *
 * **Ograniczenie, którego ten moduł nie usuwa:** licznik siedzi w pamięci
 * instancji. Na Vercelu jest ich wiele i każda ma własną mapę, więc realny
 * limit jest tyle razy wyższy, ile instancji akurat działa. To świadomy
 * kompromis przy obecnej skali — prawdziwe rozwiązanie wymaga wspólnego
 * magazynu (tabela w bazie albo Redis).
 */

export interface Wpis {
  /** Ile żądań w bieżącym oknie. */
  ile: number
  /** Kiedy okno się kończy (ms epoch). */
  koniec: number
}

/**
 * Powyżej tylu kluczy zaczynamy sprzątać.
 *
 * Bez tego mapa rosła bez końca: każdy nowy adres IP zakładał wpis, którego
 * nic nigdy nie usuwało. Wpis wygasły zajmował pamięć tak samo jak świeży,
 * więc skan z wielu adresów — czyli dokładnie to, przed czym ten licznik ma
 * bronić — wypychał instancję z pamięci. Limit chroniący przed nadużyciem
 * sam był na nie podatny.
 */
export const MAX_KLUCZY = 10_000

/**
 * Usuwa wygasłe wpisy. Zwraca, ile usunął.
 *
 * Wołane przy zapisie, a nie z zegara: w środowisku bezserwerowym instancja
 * bywa zamrażana między żądaniami, więc `setInterval` nie jest tu niczym,
 * na czym można polegać.
 */
export function posprzataj(mapa: Map<string, Wpis>, teraz: number): number {
  let usuniete = 0
  for (const [klucz, wpis] of mapa) {
    if (teraz > wpis.koniec) {
      mapa.delete(klucz)
      usuniete++
    }
  }
  return usuniete
}

/**
 * Czy żądanie przekracza limit. Efekt uboczny: zlicza je.
 *
 * Okno stałe (nie przesuwne) — prostsze i wystarczające, bo chodzi
 * o odcięcie automatu, a nie o sprawiedliwy podział przepustowości.
 */
export function czyPrzekroczono(
  mapa: Map<string, Wpis>,
  klucz: string,
  maks: number,
  oknoMs: number,
  teraz: number = Date.now(),
): boolean {
  const wpis = mapa.get(klucz)

  if (!wpis || teraz > wpis.koniec) {
    // Sprzątamy dopiero gdy mapa urosła — przy każdym żądaniu byłby to
    // przebieg po całej mapie, czyli koszt rosnący z ruchem.
    if (mapa.size >= MAX_KLUCZY) {
      posprzataj(mapa, teraz)
      // Gdy po sprzątaniu nadal jest pełno, znaczy że trwa skan z wielu
      // adresów naraz. Oddajemy najstarsze wpisy: pojedynczy pominięty limit
      // jest mniej groźny niż instancja, która przewraca się na pamięci.
      if (mapa.size >= MAX_KLUCZY) {
        const doUsuniecia = Math.ceil(MAX_KLUCZY / 10)
        let i = 0
        for (const k of mapa.keys()) {
          if (i++ >= doUsuniecia) break
          mapa.delete(k)
        }
      }
    }

    mapa.set(klucz, { ile: 1, koniec: teraz + oknoMs })
    return false
  }

  if (wpis.ile >= maks) return true

  wpis.ile++
  return false
}
