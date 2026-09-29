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
| Galeria zdjęć i wideo | 6 zdjęć w configu; mechanizm wideo (modal + odtwarzacz) działa, `videoUrl` opcjonalny |
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
