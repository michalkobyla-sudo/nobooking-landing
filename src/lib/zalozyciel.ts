/**
 * Dane założyciela pokazywane na stronie sprzedażowej (`components/Zalozyciel.tsx`).
 *
 * `telefon` i `zdjecie` puste celowo, dopóki właściciel ich nie poda: sekcja
 * je pomija, zamiast pokazywać zaślepkę. Zdjęcie: plik w `public/`, np.
 * `/zalozyciel.jpg` (kwadrat, min. 400 px).
 */
export const ZALOZYCIEL = {
  imie: 'Michał Kobyliński',
  inicjaly: 'MK',
  email: 'kontakt@nobooking.eu',
  strona: 'https://michalkobylinski.pl',
  telefon: null as string | null,
  zdjecie: null as string | null,
}
