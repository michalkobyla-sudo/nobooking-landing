# Weryfikacja pakietów — 2026-09-29

Sprawdzenie, czy każda funkcja obiecana w `basicFeatures`, `proFeatures`, siatce
funkcji i tabeli porównawczej (`src/lib/translations.ts`) faktycznie istnieje
i działa.

Metoda: dla każdej obietnicy szukany kod, który ją realizuje, a tam gdzie to
możliwe — wywołanie na produkcji (`nobooking.eu`, strona `apart-sunny`).
Brak kodu traktowany jest jako brak funkcji, niezależnie od tego, jak wygląda
wersja demonstracyjna.

**Wynik ogólny: 10 z 15 obietnic działa. Trzy nie istnieją, dwie działają
połowicznie.**

*(Pierwsza wersja mówiła „11 z 15, dwie nie istnieją". Dashboard analityczny
okazał się makietą, nie funkcją działającą z zastrzeżeniem — sprostowanie niżej.)*

---

## Nie istnieje

### SMS (Pro) — obiecane, niezbudowane

| Sprawdzenie | Wynik |
|---|---|
| Zmienna środowiskowa dostawcy SMS na produkcji | brak jakiejkolwiek |
| Funkcja wysyłająca SMS w `src/` | brak |
| Wywołanie wysyłki w webhooku rezerwacji | brak |

Istnieje wyłącznie zbieranie numeru (`orders.ob_sms_phone`) i makiety w wersji
demonstracyjnej `/admin/demo/zamowienia`, które pokazują przełącznik „SMS do
gości" i przycisk „Wyślij SMS" — oba bez działania, opisane jako demo.

Klient, który kupi Pro, poda numer telefonu w onboardingu i **nigdy nie dostanie
żadnego SMS-a**. Nic go o tym nie poinformuje.

### Online check-in (Pro) — obiecane, niezbudowane

| Sprawdzenie | Wynik |
|---|---|
| Trasa formularza check-in dla gościa | brak |
| Tabela na odpowiedzi gościa | **jest** — `checkin_forms` istnieje na produkcji, pusta, nieużywana przez kod |
| E-mail z linkiem do check-inu | brak |

Istnieje wyłącznie pole `orders.ob_checkin_fields`, w którym właściciel opisuje,
jakich dodatkowych pól sobie życzy, oraz makieta w demo.

---

## Działa połowicznie

### Kody rabatowe (Pro) — można użyć, nie można utworzyć

Realizacja kodu działa i jest solidna: walidacja przynależności do strony,
aktywności, ważności, limitu użyć i planu; osobna trasa do podglądu rabatu przed
rezerwacją; limit żądań chroniący przed zgadywaniem kodów.

**Nie ma jak utworzyć kodu.** W panelu właściciela sekcja „Kody rabatowe" ma
pola i przycisk „Dodaj kod", ale przycisk **nie ma żadnej obsługi zdarzenia**
(`OwnerAdminApp.tsx`). W całym kodzie nie ma ani jednego `insert` do
`discount_codes`, nie ma też funkcji bazodanowej, która by to robiła.
W bazie jest dziś **zero kodów**. Dodać można wyłącznie ręcznie w SQL.

### Sprostowanie do pierwszej wersji tego raportu

Pierwsza wersja twierdziła, że `uses_count` nigdy nie rośnie i `max_uses` jest
niewykonalne. **To było nieprawdą.** Licznik zwiększa funkcja bazodanowa
`increment_discount_usage`, wywoływana z webhooka przy potwierdzeniu rezerwacji;
wyszukiwanie po nazwie kolumny w kodzie TypeScript jej nie pokazało, bo
inkrementacja żyje w Postgresie. Funkcja istnieje na produkcji (sprawdzone
wywołaniem) i jest poprawna — atomowy `uses_count = uses_count + 1`, ograniczony
do strony i kodu.

Zostaje jednak mniejsza usterka w tym samym miejscu: wywołanie jest opakowane
w `try/catch` z pustym blokiem i komentarzem „ignore if RPC not set up".
To narusza zasadę widoczności awarii (niezmiennik 13) podwójnie — `supabase.rpc`
przy błędzie **nie rzuca wyjątkiem**, tylko zwraca `{ error }`, więc `catch`
i tak nigdy się nie wykona, a błąd przepada bez śladu.

### System opinii (Basic) — karuzela tak, obieg nie

Obietnica z siatki funkcji brzmi: „Email → formularz → moderacja → karuzela na
stronie głównej".

| Element | Stan |
|---|---|
| Karuzela na stronie apartamentu | działa — renderuje `config.reviews.items` |
| Moderacja w panelu właściciela | trasy `owner/reviews` istnieją (odczyt i zmiana statusu) |
| Formularz dla gościa | **brak** |
| E-mail z prośbą o opinię do gościa | **brak** |
| Zapis do tabeli `reviews` | **brak — zero `insert` w całym kodzie** |

Karuzela pokazuje opinie wpisane do configu przy generowaniu strony, a nie
prawdziwe opinie gości. Panel właściciela moderuje tabelę, do której nic nie
trafia. Na `apart-sunny` config ma dziś **zero** opinii, więc sekcja jest pusta.

Uwaga: cron `review-requests` istnieje, ale pyta o opinię **klientów Nobookinga**
(właścicieli apartamentów, tabela `orders`) na temat samej usługi — nie gości
o apartament. To inna funkcja o mylącej nazwie.

---

## Działa, z zastrzeżeniem

### Powiadomienia e-mail (Basic)

Działa: potwierdzenie rezerwacji dla gościa i powiadomienie dla właściciela,
plus cała ścieżka zamówienia i provisioningu (osiem funkcji, `PAKIET-BASIC.md`).

Siatka funkcji obiecuje jednak „Potwierdzenie, **anulowanie**, **przypomnienie
przed przyjazdem**". Ani maila o anulowaniu, ani przypomnienia przed przyjazdem
w kodzie nie ma.

### Płatności (Basic)

Mechanizm działa i został sprawdzony wywołaniami na koncie platformy. Ale:

- **Dziś żadna strona nie przyjmie płatności** — `apart-sunny` nie ma ukończonego
  Connect (`stripe_onboarded: false`), więc `/book` zwraca 402, a strona pokazuje
  dane kontaktowe. Przyczyna: Stripe blokuje tworzenie żywych kont połączonych
  do czasu weryfikacji tożsamości właściciela platformy.
- Obietnica „karta, BLIK, P24" zależy od konta właściciela i waluty. Kod
  świadomie nie wymusza listy metod (niezmiennik 16) — dla właściciela
  z polskim kontem obietnica jest prawdziwa, dla zagranicznego lista będzie inna.

### Dashboard analityczny (Pro) — sprostowanie z 2026-09-29

Pierwsza wersja raportu zaliczyła tę pozycję do dzialajacych z zastrzezeniem.
**To bylo blednie.** Zakladka „Analityka" w panelu wlasciciela byla rozmazana
makieta z liczbami wpisanymi na sztywno (1 248 odwiedzin, 3.4% konwersji,
12 400 EUR, wykres z tablicy [40, 55, 60, ...]) i nakladka „Analityka dostepna
w planie PRO" — wyswietlana **wszystkim, takze planowi Pro**. Komponent nie
przyjmowal nawet informacji o planie. Klient Pro zobaczylby ten sam ekran
zachety do przejscia na Pro, za ktory wlasnie zaplacil.

Myline bylo to, ze endpoint `owner/stats` istnieje i dziala — ale on zasila
kafelki **pulpitu**, ktory nalezy do pakietu Basic, a nie zakladke analityki.

To wiec **trzecia nieistniejaca funkcja Pro**, obok SMS-ow i check-inu.
Zbudowana tego samego dnia: `src/lib/analytics.ts` i `owner/analytics`.
Swiadomie bez odwiedzin strony i konwersji, ktore obiecywala makieta —
wymagalyby zbierania ruchu, czyli osobnego podsystemu i zgod cookie. Lepiej
pokazac mniej rzeczy prawdziwych niz wiecej wymyslonych.

Przy okazji uniknieta regresja: bramka planu **nie moze** trafic do
`owner/stats`, bo zostawilaby wlascicieli Basic z pustym pulpitem.

### Domeny (Basic)

Strona działa pod `nobooking.eu/sites/<slug>`. Własna domena klienta jest
zbierana w onboardingu i podpinana ręcznie — to usługa, nie automat, i tak też
powinna być opisywana.

Subdomeny `*.nobooking.eu` **nie działają** (alias wskazuje na nieistniejące
wdrożenie sprzed pół roku). Nie ma to dziś znaczenia, bo żaden link w produkcie
nie prowadzi na subdomenę — wszystkie adresy, maile i przekierowania Stripe
używają ścieżki `/sites/<slug>`.

---

## Działa bez zastrzeżeń

| Obietnica | Czym potwierdzone |
|---|---|
| Kalendarz i rezerwacje online | `/api/sites/apart-sunny/availability` → 200; constraint `bookings_no_overlap` w bazie; cron sprzątający `pending` |
| Panel administracyjny | logowanie HMAC, unieważnianie sesji przez `token_version`, limit żądań |
| Portal gościa | działa; od 2026-09-29 sprawdza przynależność rezerwacji do strony |
| Cztery języki | config `apart-sunny` ma opis w `pl`, `en`, `es`, `de`; interfejs strony ma własne tłumaczenia |
| Galeria zdjęć i wideo | zdjęcia i filmy w panelu właściciela (zakładka Galeria); zapis przez `owner/gallery` — **domknięte 2026-10-01** |
| Kalkulator ceny z sezonami | `bookingPricing.ts`, 12 testów: sezony, minimalne noce, rabat, przeliczenie na grosze, limit 365 nocy |
| Mapa i okolica | `config.map.embedUrl` osadzony; 5 pozycji w okolicy |
| Serwer i poczta na 2 lata | `expires_at` ustawiane przy provisioningu; cron przypomnień D-90/30/14/7/1; Brevo wysyła (potwierdzone raportem agenta zdrowia) |

---

## Co z tym zrobić — propozycja kolejności

Rozstrzyga ryzyko, że klient zapłaci za coś, czego nie dostanie.

1. **Zdjąć z oferty to, czego nie ma**, albo zbudować przed pierwszą sprzedażą
   Pro. Dziś sprzedaż pakietu Pro oznacza obietnicę SMS-ów i check-inu, których
   klient nie dostanie i o których braku nic go nie uprzedzi. To jedyna pozycja
   na tej liście, która jest problemem wobec klienta, a nie usterką techniczną.
2. **Kody rabatowe: dodać tworzenie kodów.** Funkcja jest w 80% gotowa —
   realizacja i licznik użyć działają, brakuje wyłącznie ścieżki zapisu
   (przycisk już jest, bez obsługi). Przy okazji odsłonić błąd RPC, który dziś
   przepada w pustym `catch`.
3. **Opinie: dopiąć obieg albo poprawić opis.** Karuzela z opiniami z configu
   też jest funkcją — tylko inną niż opisana. Najtańsze uczciwe rozwiązanie:
   zmienić opis w ofercie. Pełny obieg to formularz, e-mail i zapis.
4. **Analityka: sprawdzać plan po stronie serwera**, tak jak robią to kody
   rabatowe.
5. **Maile o anulowaniu i przed przyjazdem** — dwie funkcje wzorowane na
   istniejących, niskie ryzyko.

Pozycje 2–5 to praca inżynierska. Pozycja 1 to decyzja biznesowa i tylko Ty
możesz ją podjąć.


---

# Przegląd kontrolny — 2026-10-01

Powtórzenie weryfikacji po zamknięciu Etapu 1, rozszerzone o dwa pytania:
czy agent zdrowia pilnuje każdego newralgicznego punktu i czy system jest gotowy
wygenerować komplet dla nowego klienta.

## Funkcje — stan na produkcji

Każda trasa odpytana na żywo. Wszystkie odpowiadają zgodnie z oczekiwaniem,
łącznie z odmowami tam, gdzie mają odmawiać.

| Sprawdzenie | Oczekiwane | Wynik |
|---|---|---|
| Strona apartamentu, kalendarz, zamówienie | 200 | 200 |
| Portal gościa z nieznanym id | odmowa | odmowa |
| Check-in na planie Basic | 403 | 403 |
| Opinia z nieznanym id | 404 | 404 |
| Kody rabatowe, analityka, statystyki bez sesji | 401 | 401 |
| Poprawki z nieznanym tokenem | `found:false` | `found:false` |
| Wycena i rezerwacja | 402 `stripe_not_connected` | 402, bez śmiecia w bazie |

Sekcje renderowane na stronie: galeria, kalendarz, opinie, mapa, udogodnienia,
cennik sezonowy, formularz rezerwacji.

## Znalezione w tym przeglądzie

### Regeneracja cofała zdjęcia do zastępczych — naprawione

`generate-site.ts` ustawia `config.photos = PLACEHOLDER_PHOTOS` przy **każdej**
generacji, bo model nie potrafi wytworzyć prawdziwych zdjęć. Ochrona przy
scalaniu obejmowała tylko `pricing` i `contact`.

Łańcuch: klient dostaje stronę ze zdjęciami z Unsplasha → zdjęcia zostają
podmienione na prawdziwe → klient wysyła poprawkę opisu → **zdjęcia wracają do
stockowych**. Do 2026-09-29 nieszkodliwe, bo regeneracja w ogóle nie trafiała na
stronę; od naprawy — realne.

`photos` i `videos` dołączone do gałęzi chronionych.

### Lista kontrolna schematu była nieaktualna — naprawione

`WYMAGANE` w agencie zdrowia kończyło się na wpisach z 25 września: sześć
pozycji. Nie obejmowało kolumn poprawek, znacznika prośby o opinię, tabel SMS,
check-inu, powiadomień gości ani atrybucji — czyli **żadnej z funkcji dodanych
później**. Agent nie wyłapałby ani jednej z trzech awarii znalezionych ręcznie
30 września.

Rozszerzone do 19 pozycji, pogrupowanych tematycznie. Tabele bota celowo
pominięte: mają nie istnieć do etapu 4.

### Brak kontroli retencji RODO — dodane

Formularze check-in zawierają numery dokumentów i mają znikać tydzień po
wyjeździe. Kasuje je cron sprzątający; gdyby przestał działać, nic by tego nie
pokazało, bo nikt nie zagląda do tabeli, której nie używa. Agent zdrowia liczy
teraz formularze trzymane po terminie i zgłasza je jako **krytyczne**.

### Brak kontroli zaciętego crona powiadomień — dodane

`guest-reminders` kończy się sukcesem także wtedy, gdy nic nie wyśle. Agent
sprawdza teraz rezerwacje, którym **wczoraj** minął termin przypomnienia i nie
mają śladu w `guest_notifications`. Wczorajszy, nie dzisiejszy — cron chodzi
o 08:00, a raport o 06:00.

## Rozjazdy oferty, nie usterki

Dwie rzeczy działają inaczej, niż sugeruje opis pakietu:

**„Galeria zdjęć i wideo"** — mechanizm wideo działa (modal z odtwarzaczem), ale
generator nie produkuje pola `videos` i **nie ma ścieżki, którą właściciel mógłby
dodać film**. Dla Casa Sol config powstał ręcznie; nowy klient nie dostanie tej
części.

**Zdjęcia** — nowy klient dostaje sześć zdjęć zastępczych z Unsplasha. Nie ma
w panelu właściciela miejsca na wgranie własnych; jedyna ścieżka to
`orders.ob_photos_link` i ręczna podmiana. To usługa, nie automat, i tak
powinna być opisywana.

Obie są świadomymi brakami, nie awariami — ale zasada Z1 mówi, że oferta opisuje
to, co działa.

### Domknięte 2026-10-01

Obie luki powyżej są zamknięte — zamiast zwężać opis pakietu, dołożyliśmy
brakującą funkcję.

- `src/lib/galeria.ts` — walidacja list zdjęć i filmów, 24 testy.
- `GET/PUT /api/sites/[slug]/owner/gallery` — odczyt i podmiana całości.
  Bez bramki planu: galeria jest w Basicu.
- `src/components/owner/GaleriaView.tsx` — zakładka **Galeria** w panelu.
  Kolejność zdjęć, opisy, usuwanie, filmy z YouTube.

Trzy rzeczy, które wyszły dopiero przy budowaniu:

1. `ApartmentPhoto.videoUrl` — pole istnieje w typie i było opisane w pakiecie
   jako działające wideo, ale **żaden komponent go nie renderuje**. Wideo żyje
   wyłącznie w `config.videos`. Panel nie przyjmuje `videoUrl`, a opis pakietu
   został poprawiony.
2. `ApartmentPage` składa źródło ramki jako `${embedUrl}?autoplay=1`, więc adres
   z własnym zapytaniem (`?si=…` z przycisku „Udostępnij") dałby dwa znaki
   zapytania i film by nie wstał. Walidacja sprowadza każdy adres do czystej
   postaci `embed/<id>`.
3. `video.title` jest czterojęzyczne i czytane przez `t(title, lang)` — niepełne
   pole pokazałoby części gości puste miejsce na kaflu. Tytuł podany raz trafia
   w cztery języki tą samą treścią; nie tłumaczymy go i nie udajemy, że
   tłumaczymy.

Sprawdzone na `apart-sunny`: dodanie zdjęcia i filmu, zapis, render sekcji wideo
na stronie publicznej (`iframe` z poprawnym `?autoplay=1`), usunięcie obu
i powrót do stanu wyjściowego. Zły adres zdjęcia pokazuje w panelu krzyżyk
zamiast miniatury, zanim właściciel zapisze.

Agent zdrowia: strony, które wciąż mają zdjęcia z Unsplasha, trafiają do raportu
jako **informacja** (nie ostrzeżenie — taka strona działa, a alarm powtarzany co
tydzień przestałby być czytany; zasada Z4).

## Gotowość do obsługi nowego klienta

Prześledzone od zamówienia do gotowej strony:

| Element | Stan |
|---|---|
| `revision_token` | nadawany automatycznie przez bazę (`gen_random_uuid()`) |
| `revision_count` | `0`, limit czterech rund czytany z kodu |
| `review_request_sent_at` | puste → prośba o opinię pójdzie po trzech dniach |
| Hasło tymczasowe | generowane z CSPRNG, trafia do maila powitalnego |
| `sites.sms_phone` | kopiowane z onboardingu, znormalizowane do E.164 |
| Config | komplet pól; `videos` właściciel dodaje w panelu |
| Zdjęcia | sześć zastępczych, próg weryfikacji spełniony; właściciel podmienia je w panelu |
| Konto Stripe Connect | tworzone, błąd nie przerywa provisioningu |
| Mail „strona gotowa" | zawiera token poprawek (źródło: `select('*')`) |
| Krok weryfikacji | sprawdza config i to, czy strona się otwiera |

**Jedyna rzecz, która dziś zatrzyma nowego klienta, to Connect.** Strona
powstanie, maile wyjdą, panel zadziała — ale płatności zwrócą 402, dopóki
właściciel nie podepnie Stripe'a, a tego nie da się zrobić przed odblokowaniem
weryfikacji tożsamości platformy.
