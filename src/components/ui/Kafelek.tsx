import type { Icon } from '@phosphor-icons/react'

/**
 * Płytka z ikoną w stylu ikon z Ustawień iOS: kolorowy zaokrąglony kwadrat
 * i biały glif Phosphor (wariant `fill`). Kolor niesie znaczenie, a nie jest
 * ozdobą — ta sama rola zawsze ma ten sam kolor:
 *
 * - `emerald` — strona, goście, marka
 * - `blue` — kalendarz, mapa, synchronizacja
 * - `orange` — pieniądze, ceny, płatności
 * - `yellow` — opinie
 * - `red` — powiadomienia, rzeczy pilne
 * - `indigo` — języki
 * - `teal` — zdjęcia i media
 * - `graphite` — panel, ustawienia
 * - `ink` — pakiet Pro
 *
 * Style: `.n-tile` w `src/app/ios.css`.
 */
export type KolorKafelka =
  | 'emerald' | 'blue' | 'orange' | 'yellow' | 'red' | 'indigo' | 'teal' | 'graphite' | 'ink'

export type RozmiarKafelka = 'xs' | 'sm' | 'md' | 'lg'

export default function Kafelek({
  ikona: Ikona,
  kolor,
  rozmiar = 'md',
  className,
}: {
  ikona: Icon
  kolor: KolorKafelka
  rozmiar?: RozmiarKafelka
  className?: string
}) {
  return (
    <span className={`n-tile n-tile--${rozmiar} t-${kolor}${className ? ` ${className}` : ''}`} aria-hidden>
      <Ikona weight="fill" />
    </span>
  )
}
