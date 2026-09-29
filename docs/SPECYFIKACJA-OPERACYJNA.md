# Nobooking — specyfikacja operacyjna

Utworzona 2026-09-25. Opisuje, **czym system jest i co musi być zawsze prawdziwe**,
a nie jak zbudować kolejną funkcję. Powstała, bo audyt z 2026-09-05 wykazał, że
wszystkie usterki klasy P0 były naruszeniami reguł, których nikt nigdy nie zapisał.

Dokumenty pokrewne: `AUDYT-2026-09-05.md` (co było zepsute),
`WDROZENIE-KROK-PO-KROKU.md` (jak to wdrożono), `TECHNICZNA-DOKUMENTACJA.md` (jak działa kod).

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
konta połączone (Express) pod `acct_1UKa8vBYbNUONJ2O`. Casa Sol **nie jest** i nie
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
   **Zastrzeżenie:** Stripe wymaga od platformy Connect podpisania
   *Refunds and chargebacks liability acknowledgement*. Jeśli konto właściciela
   wyjdzie na minus i nie da się tego pokryć z jego salda ani rachunku, obciążenie
   spada na Nobooking. Tego nie da się wyłączyć — to warunek korzystania
   z Connect. Ryzyko jest realne przy wynajmie: chargeback trafia zwykle po
   pobycie, gdy właściciel zdążył już wypłacić środki.
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

### Operacje

13. **Awaria musi być widoczna.** Każdy `try/catch` wokół wysyłki, zapisu kopii lub
    webhooka albo loguje błąd tak, by trafił do raportu agenta zdrowia, albo
    przerywa wykonanie. Trzy awarie z września (backup, webhooki, poczta) były
    niewidoczne miesiącami właśnie przez ciche `catch`.
14. **Kopia zapasowa nigdy nie nadpisuje dobrej wersji gorszą.** Spadek liczby
    wierszy poniżej połowy przerywa zapis.
15. **Migracja poprzedza wdrożenie kodu, który jej wymaga.**
16. **Żadna sesja Checkout nie podaje `payment_method_types`.** Stripe sam
    pokazuje metody włączone na koncie, na którym powstaje płatność. Sztywna
    lista wywraca **całą** sesję, gdy choć jednej metody brakuje — Stripe nie
    pomija niedostępnej. Zdarzyło się dwa razy: przy rezerwacjach dla
    właścicieli spoza Polski (2026-09-05) i przy odnowieniach po zmianie konta
    platformy (2026-09-29: nowe konto nie ma `p24`). Lista metod zależy też od
    waluty, więc nie da się jej ustalić w kodzie.
17. **Klient nie dostaje danych logowania, zanim jego strona nie przejdzie
    sprawdzenia.** Provisioning weryfikuje własną pracę: config (opis, zdjęcia,
    cennik, pojemność) i to, czy strona się otwiera. Usterka blokująca wstrzymuje
    maile i zostawia w `orders.notes` znacznik `[PROVISION-CHECK]`, po którym
    agent zdrowia zgłasza sprawę. Zasada powstała, bo cron raportował sukces
    także dla strony z zerem zdjęć albo ceną 0 za noc — a klient dowiadywał się
    pierwszy. Implementacja: `src/lib/provisionCheck.ts`.

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

**Cokolwiek dziwnego z danymi Casa Sol** → `casa-sol/docs/DIAGNOSTYKA-kalendarz.sql`
(tylko odczyt) i kopia z `backups/casasol_bookings_latest.json`.

**Przed każdym DDL** → ustal, w którym projekcie Supabase jesteś. Nie ufaj
`.env.local`; porównaj z Vercel → Environment Variables.

**Przed typecheckiem** → `find . -name "* 2.*" -not -path "./node_modules/*" -delete`
(iCloud tworzy duplikaty psujące `tsc`).
