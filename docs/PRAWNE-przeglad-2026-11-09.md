# Przegląd prawny regulaminu i polityki prywatności — 2026-11-09

Dokument wewnętrzny. **Nie jest publikowany** — strona renderuje wyłącznie
`PRAWNE-regulamin.md` i `PRAWNE-polityka-prywatnosci.md`.

Przegląd zrobiony bez prawnika, na podstawie przepisów i kodu. Każde twierdzenie
dokumentów sprawdzone w kodzie; stan prawny sprawdzony na listopad 2026. Nie zastępuje
opinii prawnika — pytania do niego w sekcji D.

---

## A. Naprawione w tym przeglądzie

| # | problem | waga | co zrobione |
|---|---|---|---|
| 1 | **Klient nigdy nie widział regulaminu przed zakupem** — formularz zamówienia nie linkował ani regulaminu, ani polityki. Wzorzec umowy niedoręczony przed zawarciem umowy nie wiąże (art. 384 KC), a brak pouczenia o odstąpieniu wydłuża termin z 14 dni do 12 miesięcy (art. 29 upk). | krytyczna | obowiązkowe pole akceptacji w `OrderForm`, kontrola po stronie serwera (`missing_terms_acceptance`), wersja regulaminu zapisywana w metadanych sesji Stripe (`regulamin: 2026-11-09`) |
| 2 | **Publiczne strony pokazywały notatki robocze** — sekcję „Do rozstrzygnięcia z kimś, kto zna prawo” (w tym: „umowy powierzenia dziś nie ma”) i nazwy plików z repo. | krytyczna | notatki przeniesione tutaj; test `dokumentyPrawne.test.ts` blokuje ich powrót |
| 3 | **Martwa, publiczna trasa `/api/stripe/checkout`** — pozwalała opłacić pakiet bez zamówienia w bazie i bez akceptacji regulaminu. Webhook nie miałby do czego przypiąć płatności: pieniądze pobrane, onboarding nie wychodzi. Ostatni wywołujący zniknął w `e069461`. | wysoka | trasa usunięta, `orderId` w `utworzSesjeZamowienia` obowiązkowy |
| 4 | **Błędny opis odstąpienia.** Regulamin twierdził, że wypełnienie formularza onboardingowego jest żądaniem rozpoczęcia usługi i że prawo odstąpienia wygasa po wygenerowaniu strony. Żądanie musi być wyraźne i uprzednie — wypełnienie formularza nim nie jest. A wyjątek z art. 38 ust. 1 pkt 1 upk wymaga **pełnego** wykonania usługi; 2-letnie utrzymanie strony nie jest wykonane po jej wygenerowaniu. | wysoka | opis zastąpiony stanem faktycznym: 14 dni, zwrot całości. Docelowy mechanizm — decyzja B1 |
| 5 | **Brak umowy powierzenia** (art. 28 RODO), choć przetwarzamy dane gości na zlecenie właścicieli. | wysoka | pkt 13 regulaminu z wszystkimi elementami z art. 28 ust. 3 |
| 6 | **Polityka bez podstaw prawnych przetwarzania** (art. 13 ust. 1 lit. c RODO). | wysoka | dodane dla każdego celu |
| 7 | Wyłączenie odpowiedzialności za przerwy w działaniu wobec konsumentów — ryzyko klauzuli niedozwolonej (art. 385³ pkt 2 KC). | średnia | przeformułowane; limit odpowiedzialności tylko wobec przedsiębiorców |
| 8 | Brakujące elementy: wzór formularza odstąpienia, wymagania techniczne i zagrożenia (art. 6 i 8 ustawy o świadczeniu usług drogą elektroniczną), zakaz treści bezprawnych, rozwiązanie umowy, licencja, przedsiębiorca na prawach konsumenta (art. 385⁵ KC), prawo właściwe, pozasądowe rozwiązywanie sporów, przekazywanie poza EOG, rozmowy przez Messengera, odpowiedzialność za teksty generowane przez AI. | średnia | dodane |
| 9 | „Data ostatniej zmiany widnieje na dole strony” — żadnej daty nie było. | niska | data obowiązywania na górze obu dokumentów, spięta testem z `WERSJA_REGULAMINU` |
| 10 | Odnowienie Pro 449 zł / 149 € → decyzja użytkownika 499 zł / 119 €. | — | `prices.ts`, regulamin; test pilnuje zgodności cen regulaminu z kodem |

**Świadomie nie dodane:** link do platformy ODR — platforma zlikwidowana 20.07.2025
(rozporządzenie 2024/3228), obowiązek zniknął.

---

## B. Decyzje do podjęcia przez Ciebie

**B1. Zgoda na rozpoczęcie usługi przed upływem 14 dni.** Dziś klient może odstąpić przez
14 dni i odzyskać całość, nawet jeśli strona już działa. Dwie drogi:

- **zostawić tak** — najprościej; ryzyko: ktoś dostaje gotową stronę w 7 dni i rezygnuje;
- **opcjonalne pole „żądam rozpoczęcia przed upływem 14 dni”** — przy odstąpieniu klient płaci
  proporcjonalnie za wykonaną część (art. 35 upk); bez zaznaczenia stronę generujemy dopiero
  po 14 dniach. Wymaga kolumny w `orders` (migracja SQL do uruchomienia przez Ciebie), blokady
  w provisioningu i potwierdzenia mailem. Rekomenduję tę drogę — szybkie wykonanie to argument
  sprzedażowy, więc większość klientów zaznaczy pole.

**B2. Jak długo trzymamy dane po wygaśnięciu strony.** Dziś: bezterminowo, do żądania. To stoi
w sprzeczności z zasadą ograniczenia przechowywania (art. 5 ust. 1 lit. e RODO) i z obowiązkiem
podmiotu przetwarzającego po zakończeniu usługi (art. 28 ust. 3 lit. g). Propozycja: 12 miesięcy
po wygaśnięciu, z mailem przed usunięciem. Pierwsze wygaśnięcie wypada w maju 2028, więc kod
może poczekać, ale okres powinien trafić do dokumentów przed startem.

**B3. Numer telefonu w regulaminie.** Informacja przedumowna obejmuje numer telefonu, jeśli
przedsiębiorca go udostępnia. Strona Nobooking.eu na Facebooku pokazuje publicznie 505 594 294 —
skoro numer jest publiczny, lepiej podać go też w regulaminie.

**B4. Kto jest sprzedawcą w dniu startu.** Dokumenty podają firmę „KobylinskiStudio.pl Michał
Kobyliński”. Jeśli w dniu pierwszej sprzedaży JDG nie będzie zarejestrowana (albo będzie
zawieszona), sprzedawcą jest osoba fizyczna i dane w dokumentach trzeba dopasować. Po rejestracji
dopisać informację o wpisie do CEIDG.

---

## C. Do zrobienia w kodzie

| # | problem | priorytet |
|---|---|---|
| C1 | **Mapa Google i filmy YouTube na stronach właścicieli ładują się bez zgody.** Art. 399 Prawa komunikacji elektronicznej wymaga zgody na zapis w urządzeniu, a Google ustawia przy tym ciasteczka. Rozwiązanie: „kliknij, aby wyświetlić mapę/film” + `youtube-nocookie.com`. Dotyczy każdej strony klienta. | wysoki |
| C2 | **Strony właścicieli nie informują gości o przetwarzaniu danych** — formularz rezerwacji i check-in zbierają dane, a strona nie ma polityki prywatności (art. 13 RODO; obowiązek właściciela, ale to nasz produkt zbiera dane). Brak też warunków rezerwacji: anulacja, brak prawa odstąpienia przy zakwaterowaniu z określoną datą (art. 38 ust. 1 pkt 12 upk). Rozwiązanie: generowana strona „Prywatność i warunki” dla każdego obiektu, z danymi właściciela, link przy formularzach. | wysoki |
| C3 | **Opinie bez informacji o weryfikacji.** Przepisy Omnibus wymagają informacji, czy i jak sprawdzamy, że opinie pochodzą od gości. Nasz system prosi o opinię wyłącznie gości po pobycie, a właściciel je zatwierdza — trzeba to napisać przy opiniach, łącznie z faktem moderacji. | średni |
| C4 | **Potwierdzenie umowy na trwałym nośniku** (art. 21 upk). Mail po płatności nie zawiera pouczenia o odstąpieniu ani regulaminu. Dodać do maila onboardingowego treść pouczenia i regulamin (najlepiej w treści albo PDF — sam link może nie wystarczyć). | średni |
| C5 | **Atrybucja w `localStorage`.** Art. 399 PKE obejmuje każdy zapis w urządzeniu, nie tylko ciasteczka, a zapis na potrzeby oceny reklam nie jest niezbędny do usługi. Opcje: baner zgody albo przenoszenie parametrów w adresie aż do `/zamow` bez zapisu w przeglądarce. Polityka opisuje obecny stan zgodnie z prawdą. | średni |
| C6 | **Archiwum wersji regulaminu.** Do umowy stosuje się wersję z dnia zakupu; wersję mamy w metadanych Stripe, ale stara treść żyje tylko w git. Przy pierwszej zmianie publikować poprzednie wersje pod osobnym adresem. | przy pierwszej zmianie |
| C7 | Pole NIP odrzuca numery VAT UE (`/^\d{10}$/`). | średni |
| C8 | **Przycisk „Odstąp od umowy”** (dyrektywa 2023/2673). W Polsce niewdrożona — projekt UC82 wstrzymany 18.05.2026 — więc dziś nie jest obowiązkowy. Tani i przyszłościowy, a sprzedajemy też do Hiszpanii. | niski |

---

## D. Pytania do prawnika

1. Czy strona z 2-letnim utrzymaniem to **usługa cyfrowa** (art. 38 ust. 1 pkt 1 — prawo
   odstąpienia wygasa dopiero po pełnym wykonaniu), czy wygenerowana strona to **treść cyfrowa**
   (pkt 13 — wygasa z chwilą rozpoczęcia za zgodą)? Przyjęliśmy ostrożniejszą wykładnię.
2. Jak liczyć **proporcjonalną zapłatę** przy odstąpieniu (art. 35) — czy wolno w regulaminie
   podzielić cenę na wykonanie strony i utrzymanie?
3. Czy **umowa powierzenia jako punkt regulaminu** wystarczy, czy lepszy osobny dokument
   akceptowany w panelu?
4. Klienci z **Hiszpanii**: które przepisy hiszpańskie mają pierwszeństwo przed wyborem prawa
   polskiego (art. 6 rozporządzenia Rzym I)?
5. **Bot Messengera**: zakres współadministrowania z Meta i treść informacji dla piszących.

---

## Źródła

- [Prawo.pl — wycofanie projektu wdrażającego przycisk odstąpienia](https://www.prawo.pl/biznes/zwrot-jednym-kliknieciem-kto-i-kiedy-musi-wdrozyc,1546214.html)
- [Prawo.pl — UOKiK o likwidacji platformy ODR](https://www.prawo.pl/biznes/uokik-e-sklepy-musza-zmienic-zapisy-o-platformie-odr,531199.html)
- [Akademia LTCA — platforma ODR kończy działalność](https://akademialtca.pl/blog/platforma-odr-konczy-dzialalnosc-e-sklepy-musza-zmienic-swoje-regulaminy)
- [Standardy Prawa — art. 38 upk](https://standardyprawa.pl/akt/51/art/9883)
- [Standardy Prawa — art. 35 upk](https://standardyprawa.pl/akt/51/art/9880)
- [Standardy Prawa — art. 399 PKE](https://standardyprawa.pl/akt/532/art/63604)
