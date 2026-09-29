# Weryfikacja pakietów — 2026-09-29

Sprawdzenie, czy każda funkcja obiecana w `basicFeatures`, `proFeatures`, siatce
funkcji i tabeli porównawczej (`src/lib/translations.ts`) faktycznie istnieje
i działa.

Metoda: dla każdej obietnicy szukany kod, który ją realizuje, a tam gdzie to
możliwe — wywołanie na produkcji (`nobooking.eu`, strona `apart-sunny`).
Brak kodu traktowany jest jako brak funkcji, niezależnie od tego, jak wygląda
wersja demonstracyjna.

**Wynik ogólny: 11 z 15 obietnic działa. Dwie nie istnieją, dwie działają
połowicznie.**

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
| Tabela lub kolumny na odpowiedzi gościa | brak |
| E-mail z linkiem do check-inu | brak |

Istnieje wyłącznie pole `orders.ob_checkin_fields`, w którym właściciel opisuje,
jakich dodatkowych pól sobie życzy, oraz makieta w demo.

---

## Działa połowicznie

### Kody rabatowe (Pro) — można użyć, nie można utworzyć

Realizacja kodu działa i jest solidna: walidacja przynależności do strony,
aktywności, ważności, limitu użyć i planu; osobna trasa do podglądu rabatu przed
rezerwacją; limit żądań chroniący przed zgadywaniem kodów.

Brakuje dwóch rzeczy po stronie zapisu:

1. **Nie ma jak utworzyć kodu.** W panelu właściciela sekcja „Kody rabatowe" ma
   pola i przycisk „Dodaj kod", ale przycisk **nie ma żadnej obsługi zdarzenia**
   (`OwnerAdminApp.tsx`). W całym kodzie nie ma ani jednego `insert` do
   `discount_codes`. Kod można dziś dodać wyłącznie ręcznie w SQL.
2. **`uses_count` nigdy nie rośnie.** Kolumna jest tylko odczytywana — w trzech
   miejscach do sprawdzenia limitu, w zerowych do zwiększenia. Oznacza to, że
   `max_uses` jest niewykonalne: kod z limitem jednego użycia zadziała dowolną
   liczbę razy.

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

### Dashboard analityczny (Pro)

Endpoint `owner/stats` działa, a zakładka „Analityka" jest w interfejsie
oznaczona jako Pro i ukryta dla Basic. Ale **sam endpoint nie sprawdza planu** —
właściciel z planem Basic, który wywoła go bezpośrednio, dostanie dane.
Niskie ryzyko (to jego własne dane, nie cudze), ale rozjazd z ofertą.

Dla porównania: trasy kodów rabatowych sprawdzają plan po stronie serwera
(`site.plan !== 'pro'` → 403). Analityka powinna robić to samo.

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
2. **Kody rabatowe: dodać zapis i licznik użyć.** Funkcja jest w 80% gotowa —
   brakuje formularza (przycisk już jest, bez obsługi) i inkrementacji
   `uses_count` przy potwierdzeniu rezerwacji. Bez licznika `max_uses` jest
   ozdobą.
3. **Opinie: dopiąć obieg albo poprawić opis.** Karuzela z opiniami z configu
   też jest funkcją — tylko inną niż opisana. Najtańsze uczciwe rozwiązanie:
   zmienić opis w ofercie. Pełny obieg to formularz, e-mail i zapis.
4. **Analityka: sprawdzać plan po stronie serwera**, tak jak robią to kody
   rabatowe.
5. **Maile o anulowaniu i przed przyjazdem** — dwie funkcje wzorowane na
   istniejących, niskie ryzyko.

Pozycje 2–5 to praca inżynierska. Pozycja 1 to decyzja biznesowa i tylko Ty
możesz ją podjąć.
