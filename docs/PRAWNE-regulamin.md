# Regulamin

## 1. Kto sprzedaje

Usługę świadczy KobylinskiStudio.pl Michał Kobyliński z siedzibą w ul. Łagowska 4/1U, 01-464 Warszawa, NIP 5342334497.
Kontakt: **kontakt@nobooking.eu**.

## 2. Co kupujesz

Stronę rezerwacyjną dla apartamentu na wynajem krótkoterminowy wraz
z utrzymaniem przez **2 lata** od uruchomienia.

**Pakiet Basic — 799 zł / 199 €.** Strona w czterech językach, kalendarz
dostępności, formularz rezerwacji, płatności Stripe trafiające bezpośrednio na
konto właściciela, panel właściciela, portal gościa, system opinii,
powiadomienia e-mail, galeria zdjęć i wideo, kalkulator ceny z sezonami, mapa.

**Pakiet Pro — 1 199 zł / 299 €.** Wszystko z Basic oraz powiadomienia SMS
o rezerwacjach, online check-in, kody rabatowe i dashboard analityczny.

Pełny opis obu pakietów: `PAKIET-BASIC.md` i `PAKIET-PRO.md`.

**Opłata jest jednorazowa. Nie pobieramy prowizji od rezerwacji** — pieniądze
od gości trafiają bezpośrednio na konto Stripe właściciela, z pominięciem
naszego.

## 3. Jak to przebiega

1. Składasz zamówienie i płacisz przez Stripe.
2. Dostajesz mailem link do formularza onboardingowego — opis apartamentu,
   zdjęcia, ceny, dane kontaktowe.
3. Po wypełnieniu formularza generujemy stronę i wysyłamy dane do panelu.
4. Przysługują Ci **cztery rundy poprawek** treści i wyglądu.

**Termin:** 7 dni roboczych od przesłania kompletnie wypełnionego formularza.

## 4. Czego potrzebujesz od siebie

- **Konto Stripe** do przyjmowania płatności — zakładamy je za Ciebie, ale
  weryfikację tożsamości przechodzisz samodzielnie, bo wymaga tego Stripe.
  Do czasu jej ukończenia strona działa i pokazuje gościom dane kontaktowe
  zamiast płatności online.
- **Zdjęcia i opisy apartamentu.** Do czasu ich przesłania strona stoi na
  zdjęciach zastępczych, wyraźnie oznaczonych jako takie w panelu.
- **Prawa do materiałów.** Przesyłając zdjęcia i teksty oświadczasz, że masz
  prawo z nich korzystać.

## 5. Odnowienie

Po 2 latach strona wymaga odnowienia. **Cena odnowienia jest niższa niż cena
zakupu i zamrażana w dniu zakupu** — nie wzrośnie niezależnie od późniejszych
zmian cennika.

Odnowienie Basic: **299 zł / 99 €**. Odnowienie Pro: **449 zł / 149 €**.

Przypomnienia mailem na **90, 30, 14, 7 i 1 dzień** przed końcem. Po wygaśnięciu
masz **14 dni karencji**; jeśli w tym czasie nie odnowisz, strona przestaje być
dostępna dla gości. Dane — rezerwacje, zdjęcia, opinie — zostają, więc
odnowienie przywraca stronę w stanie, w jakim była.

## 6. Odstąpienie od umowy

Jeśli kupujesz jako konsument, przysługuje Ci 14 dni na odstąpienie od umowy
bez podania przyczyny.

**Wyjątek, o którym trzeba wiedzieć przed zamówieniem:** jeśli poprosisz
o rozpoczęcie wykonywania usługi przed upływem tych 14 dni — a wypełnienie
formularza onboardingowego jest właśnie taką prośbą, bo uruchamia generowanie
strony — tracisz prawo odstąpienia z chwilą jej wykonania. Wynika to
z art. 38 ustawy o prawach konsumenta.

W praktyce: dopóki nie wypełnisz formularza, możesz odstąpić i odzyskać całość.

## 7. Reklamacje

Zgłoszenia na **kontakt@nobooking.eu**. Odpowiadamy w ciągu 14 dni.

Jeśli strona nie działa z naszej winy, naprawiamy ją bez dodatkowych opłat.
Jeśli nie da się naprawić — zwracamy proporcjonalną część opłaty za
niewykorzystany okres.

## 8. Czego nie obiecujemy

Uczciwiej wymienić to wprost, niż schować w gwiazdce.

- **Nie gwarantujemy liczby rezerwacji ani pozycji w wyszukiwarce.** Strona to
  narzędzie, nie kanał sprzedaży z ruchem w komplecie.
- **Nie odpowiadamy za rozliczenia z gośćmi.** Płatności idą bezpośrednio
  między gościem a Tobą; jesteśmy dostawcą oprogramowania, nie pośrednikiem
  finansowym.
- **Nie odpowiadamy za obowiązki wobec gości** — meldunkowe, podatkowe,
  regulamin obiektu. Online check-in zbiera dane, ale to Ty jesteś ich
  administratorem.
- **Nie gwarantujemy nieprzerwanej dostępności.** Strona stoi na infrastrukturze
  zewnętrznej (Vercel, Supabase, Stripe) i dzieli jej awarie.

## 9. Dane osobowe

Zasady opisuje odrębna **Polityka prywatności**. W skrócie: wobec Twoich danych
jesteśmy administratorem, a wobec danych Twoich gości — podmiotem
przetwarzającym działającym na Twoje zlecenie.

## 10. Zmiany regulaminu

O zmianach powiadamiamy mailem z 14-dniowym wyprzedzeniem. Do umów już
zawartych stosuje się regulamin z dnia zakupu.

---


## Do rozstrzygnięcia z kimś, kto zna prawo

- **Umowa powierzenia przetwarzania** z właścicielem — dziś jej nie ma,
  a powinna być, skoro przetwarzamy dane gości na jego zlecenie. Naturalne
  miejsce to osobny rozdział tego regulaminu.
- **Sformułowanie o odstąpieniu** (pkt 6) — mechanizm jest opisany zgodnie
  z tym, jak działa system, ale treść oświadczenia, które klient musi złożyć,
  wymaga sprawdzenia. Dziś formularz zamówienia **nie zbiera takiej zgody
  wprost** — to luka do zamknięcia w kodzie, nie tylko w regulaminie.
- **Odpowiedzialność za przerwy w działaniu** (pkt 8) — na ile da się ją
  ograniczyć wobec konsumenta.
- **Status sprzedawcy** — czy sprzedaż jest B2B, B2C, czy obie. Od tego zależy
  pkt 6 i 7. Dziś formularz zamówienia przyjmuje zarówno osoby prywatne, jak
  i firmy (pole NIP jest opcjonalne).
