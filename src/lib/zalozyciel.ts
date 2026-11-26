/**
 * Dane założyciela pokazywane na stronie sprzedażowej (`components/Zalozyciel.tsx`).
 *
 * `telefon` pusty celowo, dopóki właściciel go nie poda: sekcja
 * go pomija, zamiast pokazywać zaślepkę. Zdjęcie: `public/zalozyciel.jpg` — to samo
 * co na profilu FB (kwadrat 320 px).
 */
export const ZALOZYCIEL = {
  imie: 'Michał Kobyliński',
  inicjaly: 'MK',
  email: 'kontakt@nobooking.eu',
  strona: 'https://michalkobylinski.pl',
  telefon: null as string | null,
  zdjecie: '/zalozyciel.jpg' as string | null,
}
