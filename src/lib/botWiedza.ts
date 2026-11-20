import { PRICE_LABELS, RENEWAL_LABELS } from './prices'

/**
 * Podstawowa wiedza bota Messengera — składana z kodu, nie wpisywana ręcznie.
 *
 * Bot odpowiada publicznie pod marką, a ceny i warunki zmieniają się w kodzie
 * (`prices.ts`, regulamin). Wiedza trzymana osobno w bazie rozjechałaby się
 * z nimi przy pierwszej zmianie. Wpisy w tabeli `bot_knowledge` zostają jako
 * uzupełnienia (np. odpowiedzi na częste pytania), dopisywane po tej części.
 *
 * Do 2026-11-20 bot nie miał żadnej wiedzy — tabela była pusta, więc na każde
 * pytanie odpowiadałby „Brak danych w bazie wiedzy”.
 */
export function wiedzaPodstawowa(): string {
  const cena = (p: 'basic' | 'pro') => `${PRICE_LABELS[p].pln} / ${PRICE_LABELS[p].eur}`
  const odnowienie = (p: 'basic' | 'pro') => `${RENEWAL_LABELS[p].pln} / ${RENEWAL_LABELS[p].eur}`

  return `## Czym jest Nobooking
Nobooking (nobooking.eu) tworzy własne strony rezerwacyjne dla apartamentów na wynajem krótkoterminowy.
Goście rezerwują i płacą bezpośrednio na stronie właściciela — bez prowizji od rezerwacji.
Przykładowa strona: https://nobooking.eu/demo

## Pakiety i ceny (opłata jednorazowa za 2 lata, ceny końcowe)
- Basic — ${cena('basic')}: strona w czterech językach (PL, EN, ES, DE), kalendarz dostępności,
  formularz rezerwacji, płatności Stripe trafiające bezpośrednio na konto właściciela, panel
  właściciela, portal gościa, system opinii, powiadomienia e-mail, galeria zdjęć i wideo,
  kalkulator ceny z sezonami, mapa, synchronizacja kalendarza z Booking.com i Airbnb.
- Pro — ${cena('pro')}: wszystko z Basic oraz powiadomienia SMS o rezerwacjach, online check-in,
  kody rabatowe i dashboard analityczny.
Nie pobieramy prowizji od rezerwacji. Stripe pobiera swoją standardową opłatę za płatność kartą.

## Odnowienie po 2 latach
Odnowienie Basic: ${odnowienie('basic')}, Pro: ${odnowienie('pro')} — za kolejne 2 lata.
Cena odnowienia jest zamrażana w dniu zakupu. Umowa nie odnawia się automatycznie;
przypomnienia przychodzą mailem przed końcem okresu.

## Jak to przebiega
1. Zamówienie i płatność na https://nobooking.eu/zamow
2. Mail z formularzem: opis apartamentu, zdjęcia, ceny, dane kontaktowe.
3. Strona jest gotowa zwykle w ciągu 24 godzin od wypełnienia formularza, najpóźniej w 7 dni roboczych.
4. Cztery rundy poprawek treści i wyglądu w cenie.
Strona działa pod adresem nazwa.nobooking.eu. Własną domenę ustalamy indywidualnie.
Konto Stripe do przyjmowania płatności zakładamy za właściciela; weryfikację tożsamości w Stripe
przechodzi on sam.

## Synchronizacja z Booking.com i Airbnb
Przez kalendarze iCal, w obu pakietach. Terminy z portali blokują się na stronie, a rezerwacje ze
strony trafiają do portali. Portale pobierają kalendarz co kilka godzin, więc krótkie okno na
podwójną rezerwację istnieje — to ograniczenie iCal, nie Nobookinga.

## Prawo odstąpienia
Konsument może odstąpić od umowy w ciągu 14 dni od zakupu. Szczegóły w regulaminie:
https://nobooking.eu/regulamin

## Czego nie gwarantujemy
Nie gwarantujemy liczby rezerwacji ani pozycji w Google — strona to narzędzie, nie kanał sprzedaży
z ruchem w komplecie. Obowiązki wobec gości (meldunkowe, podatkowe, regulamin obiektu) są po stronie
właściciela.

## Kontakt
E-mail: kontakt@nobooking.eu, telefon: +48 505 594 294.`
}
