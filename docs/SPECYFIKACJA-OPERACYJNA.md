# Nobooking — specyfikacja operacyjna

Utworzona 2026-09-25. Opisuje, **czym system jest i co musi być zawsze prawdziwe**,
a nie jak zbudować kolejną funkcję. Powstała, bo audyt z 2026-09-05 wykazał, że
wszystkie usterki klasy P0 były naruszeniami reguł, których nikt nigdy nie zapisał.

Dokumenty pokrewne: `AUDYT-2026-09-05.md` (co było zepsute),
`WDROZENIE-KROK-PO-KROKU.md` (jak to wdrożono), `TECHNICZNA-DOKUMENTACJA.md` (jak działa kod),
`PAKIET-BASIC.md` i `PAKIET-PRO.md` (co sprzedajemy),
`WERYFIKACJA-PAKIETOW-2026-09-29.md` (co z tego faktycznie działa),
`PLAN-DO-STARTU.md` (zasady działania i kolejność prac do startu).

---

## 1. Czym jest Nobooking

Wielodostępny SaaS: jedna instalacja obsługuje wielu właścicieli apartamentów.
**Jeden wiersz w `sites` = jeden klient.** Każda zmiana w kodzie dotyczy wszystkich
klientów naraz — inaczej niż w `casa-sol/`, które jest stroną jednego mieszkania.

| | Nobooking | Casa Sol |
|---|---|---|
| Repo | `nobooking-landing` | `casa-sol-torrevieja` |
| Domena | `nobooking.eu` | `casasol-almadelmar.com` |
| Supabase | `cgsfhvgddtwppmqvdecz` | `ejteazvuaufaltmhcrwi` |
| Vercel | `nobooking-landing` | `casa-sol-app` |
| Poczta | Brevo | Resend |
| Stripe | `acct_1UKa8vBYbNUONJ2O` „Nobooking" | `acct_1TCfH5C4nRKn3H7A` „Casasol-almadelmar" |

Do 2026-09-28 oba projekty dzieliły jedno konto Stripe i zdarzenia płatności
Casa Sol trafiały także do webhooka Nobookinga. Konta są rozdzielone, ale reguła
zostaje: **każdy handler ignoruje zdarzenia, których nie rozpoznaje** — nigdy ich
nie zgaduje. Kosztuje jedną instrukcję `if`, a chroni przed każdym przyszłym
zlaniem źródeł.

Nobooking jest platformą Connect; konta właścicieli apartamentów powstają jako
konta połączone pod `acct_1UKa8vBYbNUONJ2O` — od 2026-10-01 w konfiguracji
odpowiadającej kontu Standard (pełny panel, opłaty Stripe po stronie właściciela),
nie Express. Casa Sol **nie jest** i nie
ma być jednym z nich — to osobne, samodzielne konto Stripe.

---

## 2. Niezmienniki

Zdania, które muszą być prawdziwe zawsze. Każde jest testowalne i każde zostało
kiedyś naruszone — data w nawiasie to moment, w którym to wyszło.

### Najemcy i dane

1. **`sites.slug` jest unikalny w skali platformy, a tworzenie strony nigdy nie
   nadpisuje istniejącej.** (2026-09-05: `upsert onConflict: slug` pozwalał drugiemu
   klientowi o tej samej nazwie apartamentu przejąć stronę pierwszego.)
2. **Slug nigdy nie jest pusty.** Nazwy zapisane wyłącznie cyrylicą, pismem
   chińskim albo emoji dawały pusty ciąg i zlewały się w jeden wiersz.
3. **Żadna operacja na jednym najemcy nie dotyka danych innego.** Zapytania do
   `bookings`, `blocked_dates` i `reviews` zawsze filtrują po `site_id`.
   Dotyczy to także stron pobierających wiersz po identyfikatorze: portal gościa
   sprawdza, że `booking.site_id` zgadza się ze stroną ze slugu (2026-09-29 ten
   sam identyfikator otwierał się pod dowolnym slugiem). Wyjątki, świadome
   i globalne: crony, kopia zapasowa, anonimizacja RODO i webhook Stripe.

### Pieniądze

4. **Rezerwacja przechodzi w `confirmed` wyłącznie po potwierdzonej wpłacie.**
   Wymaga `payment_status === 'paid'` **oraz** zgodności kwoty z ceną rezerwacji.
5. **Webhook jest idempotentny na poziomie zdarzenia.** Stripe gwarantuje
   at-least-once delivery; powtórka to norma, nie awaria. Rozstrzyga klucz główny
   na `stripe_webhook_events.event_id`, nie odczyt-potem-zapis.
6. **Zdarzenia platformy (zamówienia, odnowienia) przychodzą bez `event.account`.**
   Właściciel kontroluje własne konto połączone i mógłby inaczej wystawić sobie
   sesję z metadanymi `{type:'renewal'}` i przedłużyć subskrypcję za darmo.
7. **Merchant of record to właściciel apartamentu** (direct charges). On płaci
   prowizję Stripe i w pierwszej kolejności odpowiada za zwroty i chargebacki.
   Nie wracać do `transfer_data.destination` — przy nim koszt prowizji ponosiła
   platforma.
   **Sprostowanie 2026-10-01:** stało tu, że odpowiedzialność platformy za ujemne
   saldo konta właściciela jest warunkiem korzystania z Connect i nie da się jej
   wyłączyć. To była prawda dla kont **Express**, które zakładaliśmy do tego dnia
   (`controller.losses.payments = application`), ale nie dla Connect w ogóle.
   Konta tworzone teraz mają `losses_collector: stripe` — za ujemne saldo konta
   właściciela odpowiada Stripe, nie Nobooking. Platforma nadal odpowiada za
   ujemne saldo **własnego** konta.

   Przy Expressie ta sama konfiguracja przerzucała na platformę także **opłaty
   za obsługę płatności** (`fees.payer = application_express`) — czyli model
   opisany powyżej jako „właściciel płaci prowizję Stripe" nie był tym, co
   robił kod. Na danych Casa Sol to 370–590 zł rocznie na klienta przy ~400 zł
   rocznego przychodu z pakietu Basic.
8. **Dwa terminy nie mogą się nakładać.** Gwarantuje to constraint
   `bookings_no_overlap` w bazie. Sprawdzenie w kodzie ma okno wyścigu i nie wystarcza.

### Bezpieczeństwo

9. **Każdy endpoint `/api/cron/*` wymaga `CRON_SECRET` i zawodzi „na zamknięto".**
   Brak zmiennej = 401, nigdy przepustka.
10. **Sekrety i hasła pochodzą z CSPRNG.** `Math.random()` nie służy do niczego,
    co chroni dostęp.
11. **Treść od użytkowników to dane, nie polecenia.** Komentarze i wiadomości
    wchodzą do modelu w oznaczonej ramce; odpowiedź bota jest publiczna i firmowana marką.
12. **Zmiana hasła unieważnia pozostałe sesje** (`sites.token_version`).

### Oferta

  0. **Oferta opisuje wyłącznie to, co działa.** Funkcja trafia do
     `src/lib/translations.ts` dopiero wtedy, gdy da się ją pokazać na działającej
     stronie; makieta w `/admin/demo` nie jest funkcją. (2026-09-29: pakiet Pro
     sprzedawał SMS-y i online check-in, które istniały wyłącznie jako makiety.)

### Operacje

13. **Awaria musi być widoczna.** Każdy `try/catch` wokół wysyłki, zapisu kopii lub
    webhooka albo loguje błąd tak, by trafił do raportu agenta zdrowia, albo
    przerywa wykonanie. Trzy awarie z września (backup, webhooki, poczta) były
    niewidoczne miesiącami właśnie przez ciche `catch`.
14. **Kopia zapasowa nigdy nie nadpisuje dobrej wersji gorszą.** Spadek liczby
    wierszy poniżej połowy przerywa zapis. Strażnik nie odróżnia utraty danych
    od świadomego usunięcia, więc po zamierzonej kasacie blokuje zapis na stałe —
    wyjściem jest jawne `?rebaseline=1`, które odkłada dotychczasową kopię pod
    osobną nazwą i oznacza nową znacznikiem `przebazowanie`. Bez tego wyjścia
    alarm o nieaktualnej kopii powtarzałby się codziennie i przestałby być czytany.
15. **Migracja poprzedza wdrożenie kodu, który jej wymaga.**
16. **Żadna sesja Checkout nie podaje `payment_method_types`.** Stripe sam
    pokazuje metody włączone na koncie, na którym powstaje płatność. Sztywna
    lista wywraca **całą** sesję, gdy choć jednej metody brakuje — Stripe nie
    pomija niedostępnej. Zdarzyło się dwa razy: przy rezerwacjach dla
    właścicieli spoza Polski (2026-09-05) i przy odnowieniach po zmianie konta
    platformy (2026-09-29: nowe konto nie ma `p24`). Lista metod zależy też od
    waluty, więc nie da się jej ustalić w kodzie.
17. **Strona renderuje się z `sites.config`, więc każda regeneracja musi tam
    trafić.** `orders.generated_config` to kopia robocza, której nic nie czyta.
    Poprawki i ręczne generowanie z panelu admina zapisywały wyłącznie ją —
    klient dostawał mail „strona zaktualizowana", a strona zostawała bez zmian.
18. **Slug strony bierze się z `orders.site_slug`, nigdy z nazwy apartamentu.**
    Przy kolizji nazw drugi klient dostaje `nazwa-2`; `toSlug(apartment_name)`
    wskazałby wtedy stronę pierwszego i nadpisał ją cudzą treścią.
19. **Regeneracja strony nie cofa zmian właściciela.** `pricing` i `contact`
    z panelu wygrywają z tym, co model wygeneruje z niezmiennych danych
    onboardingowych. Rozstrzyga różnica względem `orders.generated_config`,
    które musi przechowywać wersję **wygenerowaną**, nie scaloną.
20. **Klient nie dostaje danych logowania, zanim jego strona nie przejdzie
    sprawdzenia.** Provisioning weryfikuje własną pracę: config (opis, zdjęcia,
    cennik, pojemność) i to, czy strona się otwiera. Usterka blokująca wstrzymuje
    maile i zostawia w `orders.notes` znacznik `[PROVISION-CHECK]`, po którym
    agent zdrowia zgłasza sprawę. Zasada powstała, bo cron raportował sukces
    także dla strony z zerem zdjęć albo ceną 0 za noc — a klient dowiadywał się
    pierwszy. Implementacja: `src/lib/provisionCheck.ts`.
21. **Zdjęcie czegoś spod ochrony to zmiana progu zaufania, nie zmiana trasy.**
    Zanim adres stanie się publiczny, trzeba obejrzeć nie tylko to, czy działa,
    ale co ze sobą niesie: dane, adresy, identyfikatory, treści przygotowane
    w założeniu, że zobaczy je wyłącznie zalogowany. Zasada powstała
    2026-10-03: demo panelu przeniesione spod `/admin` (bo odwiedzający lądował
    na ekranie logowania) wystawiło do internetu adresy wyglądające na
    prawdziwe skrzynki, numery paszportów i adres właściciela. Dane zastąpione
    pulami zarezerwowanymi na przykłady (RFC 2606).
22. **Żadne środowisko nie zleca operacji finansowej innemu.** Trasy nie wołają
    siebie nawzajem po adresie bezwzględnym z konfiguracji — logika idzie
    bezpośrednio, a adresy powrotu biorą się z bieżącego żądania. Zasada
    powstała 2026-10-02: `/api/orders` tworzyło sesję płatności, wołając
    `${NEXT_PUBLIC_SITE_URL}/api/stripe/checkout`, więc serwer deweloperski
    zapisywał zamówienie u siebie, a po sesję szedł na produkcję — kluczem
    live. Powstały dwie prawdziwe sesje na 1199 zł.
23. **Adres właściciela to adres kupującego, nie kontakt publiczny ze strony.**
    `ob_contact_email` wyświetla się gościom i bywa wspólną skrzynką, aliasem
    albo adresem, który jeszcze nie istnieje. Hasło do panelu, powiadomienia
    o rezerwacjach i konto do logowania idą na `orders.email` — ten jest
    sprawdzony, bo klient odebrał na nim link onboardingowy.
    Implementacja: `adresWlasciciela` w `src/lib/provision-site.ts`.
24. **Slug nie jest uprawnieniem.** Slug to publiczny adres strony apartamentu
    — każdy, kto widział link do oferty, go zna. Trasa, która na podstawie
    samego sluga oddaje cokolwiek dotyczącego właściciela, jest trasą otwartą
    dla wszystkich. Zasada powstała 2026-10-03: `GET /api/connect/onboard?slug=`
    nie sprawdzała niczego i przekierowywała na świeżo wygenerowany link
    onboardingowy Stripe Connect **do konta wskazanego przez slug** — czyli do
    panelu, w którym ustawia się konto bankowe do wypłat. Trasa istniała jako
    zapasowy odnośnik w mailu powitalnym. Teraz wymaga sesji właściciela,
    a bez niej odsyła na logowanie, żeby odnośnik z maila dalej działał.

---

## 3. Tryby awarii i co robią

| Co pada | Objaw | Zachowanie systemu |
|---|---|---|
| Stripe nie odpowiada przy tworzeniu sesji | 500 z `/book` | rezerwacja `pending` jest kasowana, termin się zwalnia |
| Webhook przychodzi dwa razy | — | drugie zdarzenie odrzucone po `event_id` |
| Webhook pada w trakcie | 500 | zaklepanie zwalniane, Stripe ponawia |
| Anthropic nie odpowiada przy generowaniu strony | zamówienie bez `site_slug` | cron ponawia po 15 min; agent zdrowia zgłasza po dobie |
| Provisioning trwa dłużej niż cykl crona | — | `provisioning_started_at` blokuje drugie przetworzenie |
| Baza pada przy obsłudze bota | — | wiadomość przechodzi (milczący bot gorszy niż podwójna odpowiedź) |
| Baza pada przy sprawdzaniu limitu | — | jak wyżej — przepuszczamy |
| Poczta pada | cisza | **to jest ten tryb, który trzeba wykrywać aktywnie** — agent zdrowia sprawdza klucz Brevo |

---

## 4. Model pieniędzy

- Przychód Nobookinga: **jednorazowa opłata za stronę**, 799–1199 zł za 2 lata
  (`src/lib/prices.ts`). Zero prowizji od rezerwacji.
- Cena odnowienia jest **zamrażana w chwili zakupu** (`sites.renewal_price_*`).
- Rezerwacje gości: direct charge na koncie właściciela. Nobooking nie dotyka
  tych środków i nie ponosi ich kosztów.

---

## 5. Decyzje i ich uzasadnienia

| Decyzja | Dlaczego |
|---|---|
| Direct charges zamiast destination charges | przy destination to platforma płaciła prowizję Stripe za wszystkich klientów i odpowiadała za ich chargebacki |
| Własny HMAC dla sesji właścicieli zamiast Supabase Auth | panel właściciela jest per-`site`, nie per-użytkownik; Auth służy tylko koncie administracyjnym |
| Idempotencja w bazie, nie w kodzie | odczyt-potem-zapis ma okno wyścigu przy równoległych dostarczeniach |
| Limit bota w tabeli, nie w pamięci | Vercel uruchamia wiele instancji; licznik w pamięci nie obowiązuje |
| Raport zdrowia tylko gdy jest problem | codzienne „wszystko OK" przestaje się czytać po tygodniu |

---

## 6. Runbook

**Płatność przeszła, ale aplikacja o niej nie wie** → sprawdź dopasowanie sekretu:
podpisz nieszkodliwe zdarzenie (`type: "ping"`) sekretem z Vercela i wyślij na
endpoint. 200 = sekret dobry, 400 = rozjazd. W Stripe widać to jako 100% błędów
na celu webhooka.

**Klient zapłacił i nie dostał strony** → `orders` z `onboarding_submitted = true`
i `site_slug IS NULL`; sprawdź logi `provision-sites`.

**Strona powstała, ale klient nie dostał maila** → to celowe wstrzymanie.
Szukaj `orders` z `site_slug` niepustym i `notes LIKE '%[PROVISION-CHECK]%'` —
ostatnia linia notatki mówi, co nie przeszło. Popraw config strony w panelu,
a potem wyślij dane logowania ręcznie; cron nie ponowi wysyłki, bo `site_slug`
jest już ustawiony.

**Provisioning pada na tworzeniu konta właściciela** → sprawdź, czy to uprawnienia
klucza, czy blokada Connect. Stripe podaje brakujące uprawnienie wprost w treści
błędu, razem z linkiem do edycji konkretnego klucza. Klucz `rk_live_` Nobookinga
potrzebuje w kolumnie *In your account*: **Accounts** (Write), **Account Links**
(Write), **Events** (Read), a w kolumnie *In connected accounts*: **Checkout
Sessions** (Write). Uwaga na pułapkę nazw: „Accounts **v2**" to inny zasób niż
„Accounts" i nie obsługuje `POST /v1/accounts` używanego przez kod.

**Błąd „You must complete your platform profile to use Connect"** → treść jest
myląca. Sprawdź najpierw `individual.verification` na `GET /v1/account`:
`status: unverified` z wypełnionym `details_code` to odrzucony dokument
tożsamości właściciela platformy, a nie ankieta. `status: pending` oznacza
weryfikację w toku — **nie wgrywaj kolejnego dokumentu**, bo każde wgranie kasuje
trwające sprawdzenie i ustawia cię na końcu kolejki. Baner w panelu pokazuje
wynik poprzedniej próby i nie odświeża się w trakcie bieżącej.

**Backup zwraca `suspicious_drop`** → sprawdź najpierw, czy liczba rezerwacji
w bazie faktycznie spadła i **dlaczego**. Jeśli to utrata danych — nie ruszaj
kopii, odtwórz z niej dane. Jeśli spadek jest zamierzony (np. wyniesienie danych
innego projektu), przebazuj punkt odniesienia:
`curl -H "Authorization: Bearer $CRON_SECRET" "https://www.nobooking.eu/api/cron/backup-bookings?rebaseline=1"`

**Cokolwiek dziwnego z danymi Casa Sol** → `casa-sol/docs/DIAGNOSTYKA-kalendarz.sql`
(tylko odczyt) i kopia z `backups/casasol_bookings_latest.json`.

**Przed każdym DDL** → ustal, w którym projekcie Supabase jesteś. Nie ufaj
`.env.local`; porównaj z Vercel → Environment Variables.

**Przed typecheckiem** → `find . -name "* 2.*" -not -path "./node_modules/*" -delete`
(iCloud tworzy duplikaty psujące `tsc`).
