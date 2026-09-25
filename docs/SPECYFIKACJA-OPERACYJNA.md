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
| Stripe | **wspólne konto** `acct_1TCfH5C4nRKn3H7A` | **to samo konto** |

Stripe to ostatni wspólny element. Do czasu rozdzielenia: zdarzenia płatności
Casa Sol trafiają także do webhooka Nobookinga (i odwrotnie), więc **każdy
handler musi ignorować zdarzenia, których nie rozpoznaje** — nigdy ich nie zgadywać.

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
   prowizję Stripe i odpowiada za chargebacki. Nie wracać do
   `transfer_data.destination` — przy nim koszt prowizji ponosiła platforma.
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

**Cokolwiek dziwnego z danymi Casa Sol** → `casa-sol/docs/DIAGNOSTYKA-kalendarz.sql`
(tylko odczyt) i kopia z `backups/casasol_bookings_latest.json`.

**Przed każdym DDL** → ustal, w którym projekcie Supabase jesteś. Nie ufaj
`.env.local`; porównaj z Vercel → Environment Variables.

**Przed typecheckiem** → `find . -name "* 2.*" -not -path "./node_modules/*" -delete`
(iCloud tworzy duplikaty psujące `tsc`).
