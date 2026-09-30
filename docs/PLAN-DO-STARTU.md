# Plan do startu

Utworzony 2026-09-29. Odpowiada na jedno pytanie: **co musi być prawdą, zanim
ruszymy ze sprzedażą i reklamą.**

Powstał, bo weryfikacja pakietów (`WERYFIKACJA-PAKIETOW-2026-09-29.md`) pokazała,
że oferta obiecuje dwie funkcje, których nie ma, i dwie, które działają
połowicznie. Reklama takiego produktu nie tworzy klientów — tworzy zwroty.

Dokumenty pokrewne: `PAKIET-BASIC.md`, `PAKIET-PRO.md` (co sprzedajemy),
`SPECYFIKACJA-OPERACYJNA.md` (co musi być zawsze prawdziwe),
`AUDYT-2026-09-05.md` (skąd się wzięła kolejność).

---

# Część 1 — Zasady działania

Obowiązują na każdym etapie. Każda wzięła się z konkretnej awarii, nie z teorii.

## Z1. Oferta opisuje wyłącznie to, co działa

Funkcja trafia do `translations.ts` dopiero wtedy, gdy da się ją pokazać na
działającej stronie. Makieta w wersji demonstracyjnej **nie jest** funkcją.

*Skąd:* pakiet Pro sprzedawał SMS-y i check-in, które istniały wyłącznie jako
makiety w `/admin/demo`.

## Z2. Ukończone znaczy: kod, testy, produkcja, dokumentacja

Zadanie jest skończone, gdy spełnia wszystkie cztery warunki:

1. kod działa,
2. logika, która może się rozjechać, ma testy,
3. zostało **wywołane na produkcji** i wynik jest zapisany,
4. dokumentacja i specyfikacja mówią to samo, co kod.

Nie „powinno działać". Jeśli czegoś nie dało się sprawdzić — piszemy wprost,
czego nie sprawdziliśmy i dlaczego.

*Skąd:* przez cztery miesiące backup, webhooki i poczta były „zrobione"
i jednocześnie martwe.

## Z3. Migracja poprzedza kod, który jej wymaga

Zawsze w tej kolejności, nigdy odwrotnie. Kod wdrożony przed migracją oznacza
błąd na ścieżce, która przyjmuje pieniądze.

## Z4. Awaria musi być widoczna

Każdy `try/catch` wokół wysyłki, zapisu kopii albo webhooka albo loguje tak, żeby
trafiło to do raportu agenta zdrowia, albo przerywa wykonanie. Cicha awaria jest
gorsza od głośnej, bo trwa miesiącami.

Odwrotność też obowiązuje: **alarm, który powtarza się bez końca, przestaje być
czytany.** Każde zabezpieczenie musi mieć wyjście dla przypadku zamierzonego —
jak `?rebaseline=1` w kopii zapasowej.

## Z5. Jedna reguła żyje w jednym miejscu

Dwie kopie tej samej zasady rozjeżdżają się prędzej czy później.

*Skąd:* z pięciu błędów znalezionych 29 września **trzy** brały się z dwóch kopii
tej samej reguły — rozwijanie zakresu dat, wyznaczanie sluga, lista metod
płatności.

## Z6. Dane najemcy zawsze filtrowane po `site_id`

Dotyczy też stron pobierających wiersz po identyfikatorze. Wyjątki — crony, kopia
zapasowa, RODO, webhook Stripe — są świadome i wymienione w specyfikacji.

## Z7. Agent proponuje, człowiek zatwierdza pieniądze

Żaden automat nie wydaje budżetu reklamowego bez zatwierdzenia kwoty. Nie
z powodu ograniczeń modelu, tylko asymetrii: źle ustawiona kampania wydaje
pieniądze szybciej, niż zdążysz zauważyć.

## Z8. Przed każdą zmianą: jak to sprawdzę?

Jeśli nie ma odpowiedzi, zmiana nie jest gotowa do rozpoczęcia.

---

# Część 2 — Etapy

Kolejność wynika z ryzyka, nie z wygody. Najpierw to, co może kosztować
zaufanie klienta, potem to, co kosztuje czas.

---

## Etap 0 — Odblokowanie *(w toku, zależne od Michała)*

Rzeczy, których nikt poza Tobą nie zrobi, a blokują resztę.

| Zadanie | Blokuje |
|---|---|
| **Weryfikacja tożsamości w Stripe — sprawa u nich**, case `sco_VM2a5pB7AWY2PO` | całe Connect: żadna strona nie przyjmie płatności |
| `gh auth refresh -h github.com -s workflow` | CI — plik `ci.yml` leży poza `main` |
| **Wniosek do Meta o `ads_management`** | Etap 4; czeka tygodniami, więc składamy najwcześniej |

### Stan weryfikacji tożsamości — 2026-09-30

Pięć prób: trzy razy dowód osobisty (28.09), raz paszport (30.09, 07:42 UTC,
`file_1ULIAABYbNUONJ2OxuLM5HbR`). Wszystkie odrzucone bez podania powodu.

Sprzeczność, której nie da się rozstrzygnąć z zewnątrz:

| Źródło | Co mówi |
|---|---|
| Kreator w panelu | „Verify your identity — **Failed**" |
| `GET /v1/account` | `status: pending`, `details_code: null` |
| `requirements` | pusty obiekt — Stripe niczego nie żąda |

Rozmowa z supportem 30.09 przeszła przez trzy linie (Ayush → Jay → dział
weryfikacji) i skończyła się przekazaniem sprawy mailem.
**Case: `sco_VM2a5pB7AWY2PO`.**

Pytanie przekazane do zespołu: jaki powód odrzucenia jest zapisany po ich
stronie, a jeśli żaden — prośba o ręczny reset stanu weryfikacji.

**Nie wgrywamy szóstego dokumentu.** Pięć prób, dwa typy dokumentu, zero
zapisanych powodów: to nie jest problem jakości zdjęcia.

**Wniosek do Meta składamy teraz, mimo że marketing jest ostatni.** Weryfikacja
Business Managera i App Review trwają niezależnie od naszej pracy — czekanie
z tym do Etapu 4 dołoży kilka tygodni na końcu.

**Definicja ukończenia:** `POST /v1/accounts` tworzy żywe konto połączone;
CI uruchamia się na pull requestach; wniosek do Meta złożony.

---

## Etap 1 — Zamknięcie luk w ofercie ✅ KOD GOTOWY 2026-09-29

> **Stan:** wszystkie luki wypełnione po stronie kodu. Decyzja z 1a: budujemy.
> Wdrożenie blokują trzy nieuruchomione migracje (lista na końcu etapu).
>
> | Luka | Stan |
> |---|---|
> | SMS (1b) | zbudowane, Twilio; czeka na osobne poświadczenia i migrację |
> | Online check-in (1c) | zbudowane i sprawdzone na żywym serwerze |
> | Kody rabatowe (1d) | zbudowane; ścieżka z sesją właściciela niesprawdzona |
> | Opinie (1e) | zbudowane; zapis czeka na indeks z migracji |
> | Dashboard analityczny | **był makietą** — zbudowany od zera, sprawdzony na danych |
> | Maile: anulowanie, przed przyjazdem (1f) | zbudowane |
> | Treść oferty | „karta, BLIK, P24" → „…i inne", bo metody zależą od konta właściciela (Z1) |
>
> **Wszystkie migracje uruchomione 2026-09-29/30.** Skrypt
> `./scripts/sprawdz-produkcje.sh` pilnuje każdej kolumny, od której zależy
> jakaś funkcja — dziesięć pozycji.
>
> **Dwie martwe funkcje znalezione 2026-09-30** przy przeglądzie klasy „kod
> kończy się sukcesem, nie robiąc nic":
>
> | Co | Od kiedy | Dlaczego niewidoczne |
> |---|---|---|
> | Prośba o opinię do klienta (`review-requests`) | maj | zapytanie poprawne, wynik zawsze pusty — szukało statusu, którego nic nie nadaje |
> | Cała funkcja poprawek, 4 rundy | maj | migracja nigdy nieuruchomiona; mail dawał link `/poprawki/undefined` |
>
> Obie naprawione i sprawdzone na produkcji. Żadna nie zostawiała błędu
> w logach — wyszły dopiero przy porównaniu kodu z rzeczywistą bazą.


Najważniejszy etap. Dopóki trwa, **nie sprzedajemy pakietu Pro.**

### 1a. Decyzja: budować czy zdjąć z oferty ✅ ZDECYDOWANE — budujemy

Dotyczy SMS-ów i online check-inu. Dwie drogi:

| | Budujemy | Zdejmujemy z oferty |
|---|---|---|
| Czas | ~4–5 dni roboczych | godzina |
| Pro zawiera | 4 funkcje | 2 funkcje za 400 zł więcej |
| Ryzyko | koszt SMS-ów, dane wrażliwe w check-inie (RODO) | Pro staje się trudny do uzasadnienia |

**Rekomendacja: budować.** Pro bez SMS-ów i check-inu to kody rabatowe
i analityka — za 400 zł dopłaty to za mało, żeby ktokolwiek wybrał droższy pakiet.
Sam pakiet przestaje mieć sens, a nie tylko traci dwie pozycje na liście.

Decyzja jest Twoja i determinuje zakres 1b–1c.

### 1b. Powiadomienia SMS *(jeśli budujemy)*

- dostawca: **Twilio** - Casa Sol używa go od kwietnia 2026 z polskim numerem
  nadawcy, więc wzorzec jest sprawdzony; poświadczenia osobne od Casa Sol;
- `sites.sms_phone` (numer żyje dziś w `orders`, a wysyłka operuje na `sites`);
- funkcja wysyłki obok `email.ts`, z awarią widoczną dla agenta zdrowia (Z4);
- podpięcie tam, gdzie idzie `sendOwnerBookingNotification`;
- limit dzienny na stronę i wyłącznik w ustawieniach — SMS kosztuje za sztukę.

**Definicja ukończenia:** rezerwacja testowa na produkcji wywołuje SMS, który
faktycznie dociera; przekroczenie limitu dziennego jest widoczne w raporcie
zdrowia.

### 1c. Online check-in *(jeśli budujemy)*

- tabela `checkin_forms` **już istnieje** na produkcji (pusta, nieużywana) — zostaje ją podpiąć;
- trasa `/sites/[slug]/guest/[bookingId]/checkin` — ten sam identyfikator co
  portal gościa, z tym samym sprawdzeniem przynależności do strony (Z6);
- e-mail do gościa X dni przed przyjazdem (cron, wzorem `review-requests`);
- odpowiedzi widoczne przy rezerwacji w panelu właściciela;
- **retencja RODO**: dane dokumentu tożsamości kasowane po pobycie i objęte
  istniejącą ścieżką anonimizacji.

**Definicja ukończenia:** gość wypełnia formularz na produkcji, właściciel widzi
odpowiedzi, dane znikają po zadanym czasie.

### 1d. Kody rabatowe — dokończenie

Funkcja jest w 80% gotowa; brakuje strony zapisu.

- obsługa przycisku „Dodaj kod" (dziś bez zdarzenia) i trasa zapisu;
- lista i wyłączanie kodów w panelu;
- odsłonięcie błędu inkrementacji licznika, który dziś przepada w pustym `catch`.

Licznik użyć sam w sobie działa — zwiększa go funkcja `increment_discount_usage`
wywoływana z webhooka.

**Definicja ukończenia:** kod utworzony w panelu, użyty przy rezerwacji, licznik
wzrósł, a kod z limitem jednego użycia przestaje działać za drugim razem.

### 1e. Opinie — dopiąć obieg albo poprawić opis

Dwie uczciwe drogi:

- **pełny obieg** — e-mail po pobycie, formularz gościa, zapis do `reviews`,
  moderacja (już jest), karuzela z tabeli zamiast z configu;
- **zmiana opisu** — karuzela z opiniami wpisanymi przy tworzeniu strony też jest
  funkcją, tylko inną niż opisana w ofercie.

Rekomendacja: pełny obieg, ale **po** SMS-ach i check-inie. Opinie nie są
argumentem sprzedażowym Pro, a ich brak nikogo nie wprowadza w błąd tak mocno.

### 1g. Dashboard analityczny *(dopisane 2026-09-29)*

Nie było go w pierwszej wersji planu, bo raport weryfikacyjny zaliczył analitykę
do działających z zastrzeżeniem. Przy budowie okazało się, że zakładka była
rozmazaną makietą z liczbami wpisanymi na sztywno, pokazywaną **także planowi
Pro**. Zbudowane: obłożenie miesiąc po miesiącu, przychód roczny i miesięczny,
średnia długość pobytu, mediana wyprzedzenia rezerwacji.

Świadomie **bez** odwiedzin strony i konwersji, które obiecywała makieta —
wymagałyby zbierania ruchu, czyli osobnego podsystemu i zgód cookie.

### 1f. Drobne rozjazdy

- maile o anulowaniu rezerwacji i przypomnienie przed przyjazdem (obiecane
  w siatce funkcji);
- analityka sprawdzana po stronie serwera, jak kody rabatowe;
- nazwa crona `review-requests` — pyta właścicieli o opinię o Nobookingu, nie
  gości o apartament; zmienić nazwę albo opis, bo myli przy czytaniu kodu.

---

## Etap 2 — Pełny przebieg na prawdziwych danych

> **Runbook:** `ETAP-2-PRZEBIEG.md` — dziesięć kroków z opisem, czego każdy
> dowodzi. Przygotowany 2026-09-30, czeka na odblokowanie Connecta.
>
> Dwie rzeczy ustalone przy pisaniu runbooka:
> - **Hasło do panelu bierze się z maila powitalnego**, który wysyła
>   provisioning. Nie ma potrzeby zmieniać żadnego hasła ręcznie, żeby
>   sprawdzić analitykę i kody rabatowe.
> - **Potrzebne są dwie strony**, bo trzy sprawdzenia dotyczą granicy między
>   najemcami i na jednej stronie przechodzą fałszywie.

Do tej pory każda funkcja była sprawdzana osobno. Teraz jedna ścieżka od końca
do końca, na produkcji, bez skrótów:

zamówienie → płatność → onboarding → provisioning → strona → Connect właściciela
→ rezerwacja gościa → płatność → potwierdzenie → SMS → check-in → portal gościa
→ opinia → panel właściciela → odnowienie.

**Testy, których dotąd nie dało się wykonać**, bo nie było na czym:

- portal gościa pod cudzym slugiem — wymaga **drugiej** strony i prawdziwej
  rezerwacji (dziś w bazie jest jedna strona i zero rezerwacji);
- odnowienie subskrypcji z panelu właściciela (dziś sprawdzone tylko wywołaniem
  API Stripe);
- krok weryfikacji w provisioningu — wymaga nowego zamówienia;
- kody rabatowe po dokończeniu 1d.

**Definicja ukończenia:** cała ścieżka przeszła raz, na dwóch stronach testowych,
z zapisanym wynikiem każdego kroku.

---

## Etap 3 — Twardnienie operacyjne

Rzeczy, które nie są widoczne dla klienta, ale decydują, czy system przetrwa
wzrost.

- **CI** — `tsc` i testy na każdym pull requeście (odblokowane w Etapie 0);
- **repo poza iCloud** — dziś iCloud tworzy duplikaty plików psujące `tsc`,
  problem wraca w każdej sesji;
- **agent provisioningu (A1)** — krok weryfikacji już działa; został cykl
  z ponowieniem i raportowaniem;
- **przegląd limitów żądań** przed wzrostem ruchu — dziś licznik jest w pamięci
  instancji, co przy jednym kliencie wystarcza, a przy stu nie.

---

## Etap 4 — Przygotowanie marketingu

Zaczyna się **dopiero po Etapie 2.** Wcześniej można wykonać jedynie to, co ma
długi czas oczekiwania (wniosek do Meta, Etap 0).

### 4a. Fundament pomiarowy *(gotowy)*

Atrybucja działa od 2026-09-29: pierwsze dotknięcie zapisywane przy wejściu,
`utm_*`, `fbclid`/`gclid` i referrer trafiają do `orders`. Bez tego nie dałoby
się powiedzieć, która kampania przyniosła klienta.

Do ustalenia przed pierwszą kampanią: **konwencja nazw** `utm_campaign`
i `utm_content`, żeby raporty dało się grupować.

### 4b. Materiały

- **Casa Sol jako dowód wdrożenia** — działająca strona z prawdziwymi
  rezerwacjami; najmocniejszy argument, dziś niewykorzystany;
- **wyliczenie oszczędności** — konkretna kwota prowizji przy danym obłożeniu,
  nie hasło „bez prowizji";
- **demo** — istnieje, ale nie jest eksponowane;
- **opinie** — obecne w ofercie są przykładowe; przed reklamą potrzebne
  prawdziwe albo usunięte.

### 4c. Kanały

Odbiorca jest **B2B** — właściciel apartamentu, nie turysta. To zmienia ton
i tematykę: case studies, koszt prowizji, zrzuty panelu — nie zdjęcia plaż.

- strona firmowa FB i konto IG Business połączone z nią;
- agent treści (A4 z audytu) — kalendarz postów do kolejki roboczej,
  publikacja po zatwierdzeniu;
- agent społeczności (A5) — **bot Messengera nie działa i nigdy nie działał.**
  Sprawdzone 2026-09-30: z pięciu tabel, na których stoi, istnieje wyłącznie
  `bot_processed_messages` (utworzona przy naprawie duplikatów 25 września).
  Brakuje `bot_settings`, `bot_knowledge`, `bot_leads`, `bot_conversations`.
  `isBotEnabled()` trafia na błąd i zawodzi na zamknięto, więc bot milczy —
  zachowanie poprawne, tylko funkcji nie ma.

  Znaczy to, że wrześniowe poprawki bota (model `claude-sonnet-5`, prompt
  caching, structured outputs, zaklepywanie po `message.mid`) dotyczyły kodu,
  który nigdy się nie wykonał. Są poprawne, ale nie naprawiły niczego
  działającego — jak przy poprawkach klienta.

  Zanim A5 ruszy: migracja z czterema tabelami plus baza wiedzy do wypełnienia.
  **Warunek pozostaje ten sam** — bot odpowiada publicznie pod Twoją marką, więc
  granica zaufania musi zostać taka, jak jest teraz;
- agent reklamowy (A6) — tylko odczyt wyników i propozycje, zmiany zatwierdzasz
  Ty (Z7).

**Definicja ukończenia:** kampania testowa z małym budżetem przeszła pełną
ścieżkę pomiaru — klik z reklamy widać w `orders.utm_campaign`.

---

## Etap 5 — Start

Ruszamy, gdy wszystkie poniższe są prawdziwe:

- [ ] każda funkcja z `PAKIET-BASIC.md` i `PAKIET-PRO.md` działa i została
      sprawdzona na produkcji (Etapy 1–2);
- [ ] pełny przebieg od zamówienia do odnowienia przeszedł raz (Etap 2);
- [ ] CI pilnuje testów i typów (Etap 3);
- [ ] agent zdrowia raportuje czysto przez siedem dni z rzędu;
- [ ] kopia zapasowa powstaje codziennie i ma niezerową treść;
- [ ] atrybucja wiąże zamówienie z kampanią (Etap 4a);
- [ ] materiały i zgody Meta gotowe (Etap 0 i 4b).

Siedem dni czystych raportów jest warunkiem celowo: awarie, które nas kosztowały
najwięcej, były ciche i ujawniały się dopiero po czasie.
