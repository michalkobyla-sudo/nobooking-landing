# Online check-in: propozycja rozbudowy (6.11.2026)

Szkic do decyzji Michała, a nie plan wdrożenia. Wzór: Guestant (guestant.com). Kod powstaje dopiero po decyzjach z sekcji „Pytania”.

## Co już działa

- Formularz gościa `/sites/[slug]/guest/[bookingId]/checkin` (plan Pro) zbiera imię i nazwisko każdej osoby, opcjonalnie numer dokumentu i obywatelstwo, godzinę przyjazdu i uwagi. Walidacja jest w `src/lib/checkin.ts`, zapis w `checkin_forms`.
- Link do formularza idzie w przypomnieniu na 7 dni przed przyjazdem (`cron/guest-reminders`), tylko dla rezerwacji z naszej strony.
- Panel właściciela widzi znacznik `checkin_submitted`.
- Dane są kasowane 7 dni po wyjeździe (`DNI_RETENCJI`, cron `cleanup-pending-bookings`), a `health` pilnuje, czy retencja działa.

## Czego brakuje względem Guestant

| # | Funkcja | Trudność | Zależy od decyzji |
|---|---|---|---|
| 1 | **Komplet danych do SES.Hospedajes** (Hiszpania, RD 933/2021): oprócz imienia i dokumentu także nazwiska, płeć, data urodzenia, typ dokumentu i numer wsparcia (soporte), adres zamieszkania, telefon/e-mail, pokrewieństwo przy nieletnich, dane płatności. Listę pól sprawdzić w BOE przed kodowaniem. | średnia | A |
| 2 | **Check-in dla rezerwacji z Booking.com i Airbnb.** iCal daje tylko daty, bez danych gościa, więc nie wyślemy maila sami. Rozwiązanie: właściciel klika „utwórz link check-in” przy zajętym terminie z portalu i wysyła go gościowi (np. przez czat Bookingu albo WhatsApp). | średnia | — |
| 3 | **Akceptacja przez właściciela**: status „do sprawdzenia → zaakceptowany / do poprawy” z komentarzem dla gościa. | mała | — |
| 4 | **Instrukcja zameldowania po akceptacji** (self check-in): właściciel wpisuje raz w panelu adres, dojazd, kod do skrzynki na klucze i Wi-Fi, a gość dostaje ją mailem dopiero po akceptacji, w dniu przyjazdu albo dzień wcześniej. Kod nigdy nie trafia na publiczną stronę. | mała | — |
| 5 | **Akceptacja regulaminu apartamentu** (checkbox + data i godzina akceptacji + wersja regulaminu). Prawdziwy podpis odręczny/elektroniczny tylko, jeśli będzie potrzebny. | mała / duża | C |
| 6 | **Zdjęcie dokumentu** | duża (RODO) | B |
| 7 | **Kaucja** przez Stripe: blokada kwoty na karcie (manual capture) albo zwykła płatność ze zwrotem. | średnia | D |
| 8 | **Wysyłka do SES.Hospedajes** automatycznie (usługa sieciowa Ministerstwa) zamiast ręcznego przepisywania. | duża | A |

Proponowana kolejność: **3 → 4 → 2 → 1 → 5**, a 6, 7 i 8 po decyzjach. Pierwsze trzy dają właścicielowi największą wygodę bez nowych danych wrażliwych.

## Pytania do Michała

**A. Kraj i SES.Hospedajes.** Czy check-in ma od startu zbierać komplet pól do hiszpańskiego meldunku (najwięcej klientów będzie z Hiszpanii), czy osobny wariant dla Polski z minimalnym zestawem? Automatyczna wysyłka do SES wymaga, żeby każdy właściciel podał w panelu swoje dane dostępowe do SES. Robimy to w 2027 czy zostawiamy ręczny eksport (plik do wgrania)?

**B. Zdjęcie dokumentu.** Pod naszym postem o meldunku (grupa o wynajmie, 6.11) kilka osób pisało, że żądanie zdjęcia dowodu w Polsce łamie RODO i że goście nie ufają takim formularzom. Proponuję **nie przechowywać zdjęć dokumentów wcale**: tylko dane przepisane przez gościa, weryfikacja dokumentu na miejscu przy wejściu. Zgoda?

**C. Podpis.** Wystarczy checkbox „akceptuję regulamin” z zapisaną datą i wersją, czy chcesz podpis palcem na telefonie, jak w Guestant?

**D. Kaucja.** Blokada na karcie (zwalnia się sama po kilku dniach, ale Stripe trzyma ją maksymalnie ok. 7 dni, więc trzeba ją założyć tuż przed przyjazdem), czy zwykła płatność i zwrot po wyjeździe? Czy kaucja ma być tylko w planie Pro?

**E. Retencja.** Teraz kasujemy dane 7 dni po wyjeździe. Hiszpańskie przepisy o rejestrze podróżnych wymagają przechowywania przez właściciela przez 3 lata. Jeśli zbieramy dane do SES, musimy wybrać: trzymamy je dłużej (i za to odpowiadamy jako podmiot przetwarzający), czy dajemy właścicielowi eksport i dalej kasujemy po 7 dniach.

## Do sprawdzenia przed kodowaniem

- Aktualna lista pól i okres przechowywania z RD 933/2021 oraz instrukcji SES.Hospedajes (BOE, ses.mir.gob.es).
- Czy dla rezerwacji z Booking.com wystarczy, że gość wypełni nasz link, czy Booking blokuje wysyłanie linków w czacie (zasady dotyczące kontaktu poza platformą).
- Umowa powierzenia przetwarzania danych (RODO art. 28) z właścicielem w regulaminie `docs/PRAWNE-regulamin.md`.
