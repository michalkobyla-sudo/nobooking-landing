# Nobooking — Dokumentacja Techniczna

> **Backup tag:** `backup-2026-05-12` (git tag na GitHubie — można wrócić do tego stanu w każdej chwili)
>
> **Stack:** Next.js 16 App Router · Supabase (PostgreSQL) · Stripe Connect · Brevo (email) · Vercel

---

## 1. Architektura systemu

```
nobooking.eu                    Panel właściciela
    │                               │
    ▼                               ▼
/sites/[slug]              /sites/[slug]/admin
ApartmentPage.tsx          OwnerAdminApp.tsx
    │                               │
    ▼                               ▼
/api/sites/[slug]/book     /api/sites/[slug]/owner/*
    │                               │
    └──────────────┬────────────────┘
                   ▼
            Supabase (sites, bookings,
            blocked_dates, reviews)
                   │
                   ▼
            Stripe Connect
        (płatności bezpośrednio
         na konto właściciela)
```

---

## 2. Baza danych Supabase — tabela `sites`

Każdy klient Nobooking = jeden wiersz w tabeli `sites`.

| Kolumna | Typ | Opis |
|---|---|---|
| `id` | uuid | PK |
| `slug` | text | URL apartamentu, np. `apart-sunny` |
| `plan` | text | `'basic'` lub `'pro'` |
| `active` | bool | Czy strona jest widoczna |
| `config` | jsonb | Pełna konfiguracja apartamentu (`ApartmentConfig`) |
| `owner_email` | text | Email właściciela (do logowania i powiadomień) |
| `owner_user_id` | uuid | ID użytkownika Supabase Auth (opcjonalne) |
| `admin_password_hash` | text | Hasło do panelu, format: `scrypt:SALT:HASH` |
| `stripe_account_id` | text | ID konta Stripe Connect, np. `acct_xxx` |
| `stripe_onboarded` | bool | Czy właściciel ukończył onboarding Stripe |
| `order_id` | uuid | Powiązanie z zamówieniem (tabela `orders`) |

### Tabela `bookings`

| Kolumna | Opis |
|---|---|
| `site_id` | FK → sites.id |
| `status` | `pending` / `confirmed` / `cancelled` / `completed` |
| `stripe_paid` | Czy zaliczka zapłacona |
| `stripe_session_id` | ID sesji Stripe Checkout |
| `token` | UUID — link do portalu gościa `/sites/[slug]/guest/[token]` |
| `checkin_sent` / `checkin_submitted` | Status online check-in |

### Tabela `blocked_dates`

Daty zablokowane przez właściciela (własne pobyty, remonty).
`date` format: `YYYY-MM-DD`.

---

## 3. Konfiguracja apartamentu — `ApartmentConfig` (JSON w `sites.config`)

```typescript
{
  slug: "apart-sunny",
  name: "Apart Sunny",
  location: "Torrevieja",
  pricing: {
    currency: "EUR",        // waluta — zmieniana w panelu admina
    cleaningFee: 80,
    tiers: {
      high: { pricePerNight: 120, minNights: 7,  label: {pl: "Wysoki sezon"}, months: "Jul–Sep" },
      mid:  { pricePerNight: 90,  minNights: 5,  label: {pl: "Średni sezon"}, months: "May–Jun, Oct" },
      low:  { pricePerNight: 70,  minNights: 3,  label: {pl: "Niski sezon"},  months: "Nov–Apr" }
    }
  },
  contact: {
    email: "owner@email.com",
    phone: "+48 000 000 000"
  }
  // ...zdjęcia, amenities, opisy, reviews itp.
}
```

**Ważne:** `pricing.currency` to jedyne źródło prawdy dla waluty — czyta ją strona, formularz rezerwacji, Stripe Checkout, emaile i panel admina.

---

## 4. Autentykacja właściciela — panel admina

**Plik:** `src/lib/ownerAuth.ts`

### Jak działa logowanie

1. Właściciel wchodzi na `/sites/[slug]/admin/login`, wpisuje hasło
2. POST `/api/sites/[slug]/owner/login` — weryfikuje hasło przez `verifyPassword()` (scrypt)
3. Jeśli OK — tworzy token JWT (`createOwnerToken()`) i ustawia cookie:
   - Nazwa: `nb_owner_{slug}` (np. `nb_owner_apart_sunny`)
   - Path: `/` (WAŻNE — musi być `/`, nie `/sites/...`, bo inaczej API routes nie dostają cookie)
   - HttpOnly, SameSite=Lax, 7 dni

### Format tokena

```
base64url(JSON payload) . HMAC-SHA256 podpis
```

Payload zawiera: `siteId`, `slug`, `exp` (Unix timestamp wygaśnięcia).

### Klucz podpisu (`OWNER_JWT_SECRET`)

Hierarchia fallback (kod w `jwtSecret()`):
1. `process.env.OWNER_JWT_SECRET` ← **to powinno być ustawione** (jest na Vercelu)
2. `process.env.CRON_SECRET` (tylko jeśli niepusty)
3. `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. `'nobooking-owner-dev-secret'` (tylko local dev)

### Weryfikacja sesji

- **W API routes:** `verifyOwnerSession(slug, cookieHeader)` → zwraca `Site | null`
- **W server pages:** `requireOwnerPage(slug)` → zwraca `Site` lub redirect na `/login`

### Hasło

Format przechowywany w `admin_password_hash`: `scrypt:SALT:HASH`

```typescript
hashPassword("moje_haslo")   // → "scrypt:abc123:def456..."
verifyPassword("moje_haslo", stored)  // → true/false
```

Właściciel zmienia hasło w panelu: Ustawienia → Zmiana hasła (wymaga podania obecnego hasła).

---

## 5. API Routes — panel właściciela

Wszystkie pod `/api/sites/[slug]/owner/*`. Każda weryfikuje sesję przez cookie.

| Endpoint | Metoda | Co robi |
|---|---|---|
| `login` | POST | Logowanie — weryfikuje hasło, ustawia cookie |
| `logout` | POST | Wylogowanie — usuwa cookie |
| `bookings` | GET | Lista wszystkich rezerwacji dla site |
| `bookings/[id]` | PATCH | Zmiana statusu rezerwacji |
| `blocked` | GET | Lista zablokowanych dat |
| `blocked` | POST | Dodanie zablokowanej daty |
| `blocked/[id]` | DELETE | Usunięcie zablokowanej daty |
| `reviews` | GET | Lista opinii |
| `reviews/[id]` | PATCH | Publikowanie / ukrywanie opinii |
| `settings` | GET | Dane apartamentu + status Stripe |
| `settings` | PATCH | Zapis ustawień (email, telefon, waluta, cennik) |
| `stats` | GET | Statystyki na dashboard (rezerwacje, przychód, ocena) |
| `password` | PATCH | Zmiana hasła (wymaga current_password) |
| `connect` | GET | Inicjuje Stripe Connect onboarding |

### Endpoint `settings` PATCH — jak działa merge cennika

Gdy właściciel zmienia ceny w zakładce Cennik, wysyłany jest tylko `pricePerNight` i `minNights`. Serwer **zachowuje** istniejące pola (`label`, `months`) i nadpisuje tylko to co zostało przesłane:

```typescript
mergedTiers[key] = {
  ...currentTiers[key],          // zachowuje label, months
  pricePerNight: patch.pricePerNight,
  minNights: patch.minNights,
}
```

---

## 6. Stripe Connect — jak działa

**Plik:** `src/lib/stripe-connect.ts`

### Model: Direct Charges

> **Zmienione 2026-09-05.** Wcześniej były tu *destination charges*
> (`payment_intent_data.transfer_data`) bez `application_fee_amount`. Przy takim
> ustawieniu merchant of record była **platforma**: Nobooking płacił prowizję
> Stripe od każdej rezerwacji swoich klientów, przekazywał im 100% kwoty
> i odpowiadał za ich chargebacki. Dokumentacja opisywała wtedy model, który nie
> odpowiadał kodowi. Szczegóły: `docs/AUDYT-2026-09-05.md`, P0 #4.

```
Gość → płaci → Stripe Checkout na koncie właściciela (acct_xxx)
                          │
                          └─ prowizja Stripe potrącana z tej płatności
                             reszta → konto bankowe właściciela

Nobooking = platforma: tworzy sesję w imieniu właściciela,
            ale nie jest stroną transakcji
```

Sesja powstaje z opcją `{ stripeAccount: acct_xxx }` (`src/lib/stripe-connect.ts`), co oznacza:

| | Kto |
|---|---|
| Merchant of record | **właściciel apartamentu** |
| Płaci prowizję Stripe | **właściciel** |
| Odpowiada za chargebacki i zwroty | **właściciel** — z zastrzeżeniem niżej |
| Nazwa na wyciągu gościa | firma **właściciela** |
| Przychód Nobooking z rezerwacji | **brak** — model to jednorazowa opłata za stronę |

**Zastrzeżenie o chargebackach.** Stripe wymaga od każdej platformy Connect
podpisania *Refunds and chargebacks liability acknowledgement*. W pierwszej
kolejności obciążany jest właściciel, ale jeśli jego konto wyjdzie na minus
i nie da się tego ściągnąć z salda ani rachunku, koszt spada na Nobooking. Nie
da się tego wyłączyć. Przy wynajmie ryzyko jest realne, bo chargeback przychodzi
zwykle po pobycie, gdy właściciel zdążył już wypłacić środki.

**Konto platformy:** `acct_1UKa8vBYbNUONJ2O` („Nobooking", PL/PLN). Do 2026-09-28
Nobooking dzielił konto z Casa Sol (`acct_1TCfH5C4nRKn3H7A`); są rozdzielone.
Casa Sol **nie jest** kontem połączonym Nobookinga — to osobna, samodzielna
instalacja.

**Nie ustawiamy `payment_method_types` w żadnej sesji Checkout** — ani przy
rezerwacjach, ani przy zakupie strony, ani przy odnowieniu. Stripe pokazuje
metody włączone na koncie, na którym powstaje płatność, i dobiera je do waluty.

Sztywna lista wywraca **całą** sesję, gdy choć jednej metody brakuje; Stripe nie
pomija niedostępnej. Zdarzyło się dwa razy:

- 2026-09-05 — `['card','blik','p24']` przy rezerwacjach psuło sesje dla kont
  spoza Polski, czyli praktycznie każdego właściciela zagranicznego;
- 2026-09-29 — ta sama lista przy odnowieniach przestała działać po przejściu na
  własne konto Stripe, bo nowe konto nie ma włączonego `p24`. Sprawdzone
  wywołaniem: `The payment method type provided: p24 is invalid`.

Po usunięciu listy sesja dobiera metody sama: `card, blik, link, klarna` dla PLN
i `card, bancontact, eps, link, mb_way, klarna, satispay` dla EUR.

**Gdyby kiedyś wprowadzać prowizję Nobooking:** `application_fee_amount` w sesji
plus `stripe_account` — wtedy część kwoty trafia na konto platformy. Dziś: 0.

### Krok 1 — Tworzenie subkonta

`GET /api/sites/[slug]/owner/connect` (po kliknięciu „Połącz Stripe →"):

1. Sprawdza czy `site.stripe_account_id` istnieje
2. Jeśli nie — wywołuje `stripe.accounts.create({ type: 'express', email: owner_email })`
3. Zapisuje `stripe_account_id` w bazie
4. Generuje link onboardingowy (`stripe.accountLinks.create`)
5. Przekierowuje właściciela na stronę Stripe (podaje dane firmy, konto bankowe)

### Krok 2 — Callback po onboardingu

`GET /api/connect/callback?slug=xxx`:

1. Sprawdza status konta: `stripe.accounts.retrieve(accountId)`
2. Jeśli `details_submitted === true && charges_enabled === true` → ustawia `stripe_onboarded = true` w bazie
3. Przekierowuje na `/sites/[slug]/admin?stripe_connected=1`
4. Panel admina pokazuje zielony banner i odświeża dane

### Krok 3 — Płatność gościa

`POST /api/sites/[slug]/book`:

```typescript
if (!site.stripe_account_id || site.stripe_onboarded !== true) {
  return { error: 'stripe_not_connected', status: 402 }  // płatności zablokowane
}

// Tworzy Checkout Session jako direct charge na koncie właściciela:
stripe.checkout.sessions.create(
  { mode: 'payment', line_items: [...], metadata: { booking_id, site_slug } },
  { stripeAccount: site.stripe_account_id },   // ← tu zapada model płatności
)
```

**Jeśli Stripe nie połączony** — strona apartamentu zamiast przycisku płatności pokazuje dane kontaktowe właściciela.

### Webhook Stripe

`POST /api/stripe/webhook` — nasłuchuje zdarzenia `checkout.session.completed`.

**Konfiguracja w Stripe Dashboard — potrzebne DWA endpointy** pod tym samym adresem
`https://www.nobooking.eu/api/stripe/webhook`:

| Typ endpointu | Skąd zdarzenia | Czego dotyczą |
|---|---|---|
| **Account** | konto platformy | zamówienia stron, odnowienia subskrypcji |
| **Connect** | konta połączone | **rezerwacje gości** |

Bez endpointu typu *Connect* rezerwacje nigdy się nie potwierdzą — przy direct
charge płatność powstaje na koncie właściciela, więc jej zdarzenie nie trafia do
endpointu platformowego.

Przebieg:

1. Weryfikacja podpisu (`STRIPE_WEBHOOK_SECRET`)
2. **Zaklepanie zdarzenia** w `stripe_webhook_events` — powtórki są normalnym
   elementem protokołu Stripe (at-least-once delivery), nie awarią
3. Sprawdzenie `payment_status === 'paid'`
4. Sprawdzenie, że kwota z Stripe zgadza się z ceną rezerwacji
5. Sprawdzenie, że `event.account` to konto tej właśnie strony
6. `stripe_paid = true`, `status = 'confirmed'`
7. Emaile potwierdzające (do gościa i właściciela)

Zdarzenia platformowe (zamówienie, odnowienie) są odrzucane, jeśli przyjdą
z konta połączonego — właściciel ma pełną kontrolę nad swoim kontem Stripe
i mógłby inaczej wystawić sobie sesję z metadanymi `{type: 'renewal'}`
i przedłużyć subskrypcję za darmo.

Przy błędzie przetwarzania zaklepanie jest zwalniane, żeby ponowienie ze strony
Stripe mogło dokończyć pracę.

---

## 7. Zmienne środowiskowe (Vercel)

| Zmienna | Do czego |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL Supabase projektu |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Klucz publiczny Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Klucz serwisowy (pełny dostęp do DB) — tylko server-side |
| `STRIPE_SECRET_KEY` | `sk_live_...` — klucz Stripe (live mode) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` — weryfikacja webhooków |
| `OWNER_JWT_SECRET` | Tajny klucz do podpisywania tokenów sesji właściciela |
| `BREVO_API_KEY` | Klucz Brevo — wysyłka emaili |
| `EMAIL_FROM` | Adres nadawcy emaili |
| `NEXT_PUBLIC_SITE_URL` | `https://www.nobooking.eu` — używany w redirect URL-ach |
| `ANTHROPIC_API_KEY` | Klucz do generowania konfiguracji przez Claude |
| `CRON_SECRET` | Autoryzacja cron jobów |

---

## 8. Strona apartamentu — `ApartmentPage.tsx`

**Plik:** `src/components/apartment/ApartmentPage.tsx`

Renderowana pod `/sites/[slug]`. Otrzymuje:
- `config: ApartmentConfig` — pełna konfiguracja z Supabase
- `stripeEnabled: boolean` — czy właściciel ukończył Stripe Connect

Gdy `stripeEnabled = false`:
- Przycisk „Zarezerwuj" jest zastąpiony danymi kontaktowymi (email + telefon)
- Brak notatki „🔒 Bezpieczna płatność · Stripe"

### Kalkulacja ceny

Sezon wybierany na podstawie miesiąca check-in:
- `high`: lipiec, sierpień, wrzesień
- `mid`: maj, czerwień, październik
- `low`: pozostałe miesiące

Całkowita cena = `nights × pricePerNight + cleaningFee - rabat`

---

## 9. Panel właściciela — `OwnerAdminApp.tsx`

**Plik:** `src/components/owner/OwnerAdminApp.tsx`

Single Page Application (client component). Ładuje wszystkie dane równolegle przy montowaniu:

```typescript
Promise.all([
  fetch(`/api/sites/${slug}/owner/bookings`),
  fetch(`/api/sites/${slug}/owner/blocked`),
  fetch(`/api/sites/${slug}/owner/reviews`),
  fetch(`/api/sites/${slug}/owner/settings`),
  fetch(`/api/sites/${slug}/owner/stats`),
])
```

### Zakładki

| Zakładka | Co robi |
|---|---|
| **Dashboard** | Statystyki miesiąca, nadchodzące pobyty, szybkie akcje |
| **Rezerwacje** | Lista z filtrami statusu + wyszukiwanie. Klik → szczegóły + zmiana statusu |
| **Goście** | Baza gości (grupowanie po email) |
| **Cennik** | Edycja cen sezonów i sprzątania — zapis przez PATCH /settings |
| **Kalendarz** | Blokowanie dat (własny pobyt, remont) |
| **Opinie** | Moderacja opinii — publikuj / ukryj |
| **Analityka** | PRO-locked (blur + overlay) |
| **Ustawienia** | Email, telefon, waluta, integracja Stripe, zmiana hasła |

### Waluta

`settings.currency` (= `config.pricing.currency`) jest jedynym źródłem prawdy. Dashboard używa `settings.currency` bezpośrednio — nie polega na `stats.revenue_currency` żeby uniknąć pokazywania złej waluty gdy brak rezerwacji.

---

## 10. Komponent `KalendarzView.tsx`

**Plik:** `src/components/owner/KalendarzView.tsx`

Props: `slug`, `bookings`, `blocked`, `setBlocked`

Wyświetla 3 miesiące obok siebie (desktop) lub 1 miesiąc (mobile). Klik na datę:
- Zajęta przez rezerwację → brak akcji
- Zablokowana → odblokowanie (DELETE `/api/sites/[slug]/owner/blocked/[id]`)
- Wolna → zablokowanie (POST `/api/sites/[slug]/owner/blocked`)

---

## 11. Typowe problemy i jak je naprawić

### Problem: Właściciel nie może się zalogować

1. Sprawdź czy `admin_password_hash` jest ustawiony w tabeli `sites` (Supabase Dashboard)
2. Sprawdź czy `OWNER_JWT_SECRET` jest ustawiony na Vercelu
3. Jeśli hasło zapomniane — wygeneruj nowe przez `hashPassword()` i wstaw ręcznie do DB

```typescript
// node -e "..."
import { hashPassword } from './src/lib/ownerAuth'
console.log(hashPassword('nowe_haslo'))
// Wklej wynik do sites.admin_password_hash
```

### Problem: Cookie nie dociera do API routes

Upewnij się że cookie ma `path: '/'`. Jeśli path jest `/sites/slug/admin`, przeglądarka nie wyśle go do `/api/...`. Kod w `login/route.ts` ustawia `path: '/'`.

### Problem: Płatność nie działa (strona pokazuje kontakt zamiast przycisku)

1. Sprawdź `stripe_onboarded` w tabeli `sites` — musi być `true`
2. Jeśli `false` — właściciel musi przejść onboarding: panel → Ustawienia → „Połącz Stripe →"
3. Jeśli `stripe_account_id` jest null — j.w., konto zostanie stworzone automatycznie

### Problem: Onboarding Stripe właściciela kończy się błędem

Dwie różne przyczyny, mylące się nawzajem:

1. **403 `more_permissions_required`** — klucz `rk_live_` nie ma uprawnienia.
   Stripe pisze w treści błędu, którego dokładnie brakuje, i daje link do edycji
   tego konkretnego klucza. Komplet: **Accounts** (Write) i **Account Links**
   (Write) w kolumnie *In your account*, **Checkout Sessions** (Write)
   w *In connected accounts*, **Events** (Read). „Accounts **v2**" to inny zasób
   i nie zastępuje „Accounts".
2. **„You must complete your platform profile to use Connect"** — mimo treści
   komunikatu zwykle chodzi o weryfikację tożsamości właściciela platformy.
   Sprawdź `individual.verification` w `GET /v1/account`: `pending` to
   weryfikacja w toku (czekać, nie wgrywać kolejnego dokumentu — nowe wgranie
   kasuje trwające sprawdzenie), `unverified` z `details_code` to odrzucenie.
   Baner w panelu pokazuje wynik poprzedniej próby i potrafi wprowadzać w błąd.

### Problem: Webhook Stripe nie działa (rezerwacje nie potwierdzają się)

1. Sprawdź logi Vercela: `npx vercel logs | grep webhook`
2. Sprawdź w Stripe Dashboard → Webhooks → czy endpoint jest aktywny
3. Sprawdź czy `STRIPE_WEBHOOK_SECRET` na Vercelu zgadza się z tym w Stripe

### Problem: Emaile nie wysyłają się

1. Sprawdź `BREVO_API_KEY` na Vercelu
2. Sprawdź logi Vercela pod kątem `[email]` lub `[webhook] booking email error`
3. Sprawdź domenę nadawcy w Brevo — musi być zweryfikowana

### Problem: Cennik nie zapisuje się

Endpoint `PATCH /api/sites/[slug]/owner/settings` — sprawdź:
1. Czy cookie sesji jest wysyłane (F12 → Network → nagłówek Cookie)
2. Czy body JSON zawiera właściwą strukturę (`{ pricing: { tiers: { high: {...} } } }`)

---

## 12. Lokalne uruchomienie

```bash
cd nobooking-landing
cp .env.example .env.local   # wypełnij zmienne
npm install
npm run dev                   # http://localhost:3000
```

Panel właściciela: `http://localhost:3000/sites/apart-sunny/admin`

---

## 13. Deploy

Automatyczny przez Vercel przy każdym push na `main`. Ręcznie:

```bash
npx vercel --prod
```

Cofnięcie do poprzedniej wersji (backup):
```bash
git checkout backup-2026-05-12
# lub na GitHubie: Releases / Tags → backup-2026-05-12
```

---

## 14. Struktura plików — kluczowe

```
src/
├── app/
│   ├── api/
│   │   ├── sites/[slug]/
│   │   │   ├── book/route.ts          ← Tworzenie rezerwacji + Stripe Checkout
│   │   │   ├── availability/route.ts  ← Sprawdzanie dostępności dat
│   │   │   └── owner/
│   │   │       ├── login/route.ts     ← Logowanie
│   │   │       ├── logout/route.ts    ← Wylogowanie
│   │   │       ├── bookings/route.ts  ← Lista rezerwacji
│   │   │       ├── blocked/route.ts   ← Blokowanie dat
│   │   │       ├── settings/route.ts  ← Ustawienia + cennik
│   │   │       ├── stats/route.ts     ← Statystyki dashboard
│   │   │       ├── reviews/route.ts   ← Opinie
│   │   │       ├── password/route.ts  ← Zmiana hasła
│   │   │       └── connect/route.ts   ← Stripe Connect onboarding
│   │   ├── connect/
│   │   │   ├── onboard/route.ts       ← Redirect do Stripe (stary flow)
│   │   │   └── callback/route.ts      ← Powrót ze Stripe → ustawia stripe_onboarded
│   │   └── stripe/
│   │       ├── checkout/route.ts      ← Checkout dla zamówień Nobooking (nie apartamentów)
│   │       └── webhook/route.ts       ← Potwierdzenie płatności
│   └── sites/[slug]/
│       ├── page.tsx                   ← Strona apartamentu
│       └── admin/
│           ├── page.tsx               ← Panel właściciela (server component)
│           └── login/page.tsx         ← Logowanie właściciela
├── components/
│   ├── apartment/ApartmentPage.tsx    ← Pełna strona apartamentu
│   └── owner/
│       ├── OwnerAdminApp.tsx          ← Panel admina SPA (client component)
│       └── KalendarzView.tsx          ← Komponent kalendarza
└── lib/
    ├── ownerAuth.ts                   ← JWT tokeny, hashowanie haseł
    ├── stripe-connect.ts              ← Funkcje Stripe Connect
    ├── supabase.ts                    ← Klient Supabase
    ├── types.ts                       ← TypeScript interfaces (Site, Booking itp.)
    ├── apartmentTypes.ts              ← ApartmentConfig interface
    └── email.ts                       ← Wysyłka emaili przez Brevo
```

---

# UZUPEŁNIENIE 2026-09-25

Audyt wykazał, że dokumentacja opisywała mniej niż połowę systemu. Poniżej
brakujące części. Reguły, które muszą być prawdziwe zawsze, są w osobnym
dokumencie: `SPECYFIKACJA-OPERACYJNA.md`.

## 15. Ścieżka klienta — od zamówienia do działającej strony

```
/zamow  →  POST /api/orders           zapis w `orders` (razem ze źródłem), e-mail do Michała
        →  POST /api/stripe/checkout  sesja płatności (konto platformy)
        →  webhook checkout.session.completed
              stripe_paid = true, status = onboarding_sent
              e-mail z linkiem onboardingowym (token w `orders.onboarding_token`)
        →  /onboarding/[token]        klient opisuje apartament
              onboarding_submitted = true
        →  cron provision-sites (co minutę)
              generuje config przez Claude, tworzy konto Auth,
              konto Stripe Connect i wiersz w `sites`
              SPRAWDZA WŁASNĄ PRACĘ (patrz niżej)
              e-mail powitalny (hasło + link do Connect) i „strona gotowa"
        →  /poprawki/[token]          do 4 rund poprawek (MAX_REVISIONS)
```

Zamówienie jest „zaklepywane" kolumną `orders.provisioning_started_at`, więc
dwa nakładające się uruchomienia crona nie utworzą dwóch kont.

### Poprawki i regeneracja strony

> **Wymaga migracji `2026-09-30-poprawki.sql`.** Kolumny `revision_token`,
> `revision_count` i `revision_notes` nie istniały w bazie do 2026-09-30, mimo
> że cały mechanizm był w kodzie od maja. Mail „strona gotowa" budował link
> `/poprawki/undefined`, a trasa poprawek kończyła się błędem 42703. Ten sam
> wzorzec co przy odnowieniach: kod wdrożony, migracja nie.

Konfiguracja żyje w **dwóch** miejscach i łatwo je pomylić:

| Gdzie | Rola |
|---|---|
| `sites.config` | to, co widzi gość — z tego renderuje się `/sites/[slug]` |
| `orders.generated_config` | kopia robocza przy zamówieniu; **nic jej nie czyta** |

Regeneracja (poprawki klienta i przycisk w panelu admina) musi zapisać do obu —
służy do tego `zapiszConfigStrony` w `src/lib/provision-site.ts`. Do 2026-09-29
zapisywała tylko do `orders`, więc klient dostawał mail „strona zaktualizowana",
tracił rundę poprawek i płacił za wywołanie Claude, a strona zostawała bez zmian.

Slug wyznacza `slugZamowienia` — z `orders.site_slug`, nigdy z nazwy apartamentu.
Przy kolizji nazw `insertSiteWithFreeSlug` nadaje drugiemu klientowi `nazwa-2`,
a `toSlug(apartment_name)` wskazałby stronę pierwszego.

**Zmiany właściciela przeżywają regenerację.** Regeneracja buduje config
z danych onboardingowych, które się nie zmieniają — bez zabezpieczenia cofałaby
ceny i kontakt do stanu sprzed wszystkich edycji w panelu właściciela. To są
kwoty pobierane od gości, więc cichy powrót do starych wartości jest gorszy niż
zignorowanie prośby o zmianę ceny w treści poprawek; tę właściciel wyklika
w dziesięć sekund.

`scalPoRegeneracji` (`src/lib/configMerge.ts`) nie zgaduje: `orders.generated_config`
trzyma **ostatnio wygenerowaną** wersję, więc różnica między nią a stanem
bieżącym to dokładnie to, co zmieniono ręcznie. Zachowywane gałęzie:
`pricing` i `contact` — te, które edytuje `owner/settings`.

Pułapka przy zmianach w tym kodzie: punktem odniesienia musi zostać config
**wygenerowany**, nie scalony. Zapisanie scalonego sprawia, że przy drugiej
rundzie poprawek zmiana właściciela zrównuje się z punktem odniesienia, wygląda
na brak zmiany i zostaje cofnięta. Pilnuje tego test „dwie rundy poprawek".

### Opinie gości

Pełny obieg: e-mail dwa dni po wyjeździe → formularz gościa → moderacja
w panelu właściciela → karuzela na stronie apartamentu.

| Element | Gdzie |
|---|---|
| E-mail z prośbą | cron `guest-reminders`, `sendReviewRequest` |
| Formularz | `/sites/[slug]/guest/[bookingId]/opinia` |
| Zapis | `/api/sites/[slug]/guest/[bookingId]/opinia` |
| Moderacja | `owner/reviews` (istniała wcześniej) |
| Karuzela | `/sites/[slug]/page.tsx` → `ApartmentPage` |

Opinia trafia do bazy **niepublikowana**. Treść jest publiczna i firmowana
marką właściciela, więc nie może się pojawić bez jego zgody.

Jedna opinia na rezerwację — zapis idzie przez `upsert` po `booking_id`, więc
gość może poprawić swoją, ale nie dopisać drugiej. Wymaga to indeksu
`reviews_booking_id_uniq` (migracja `2026-09-29-powiadomienia-gosci.sql`);
bez niego zapis zwraca błąd `ON CONFLICT` i jest on widoczny w logu.

Opinii **nie tłumaczymy** na cztery języki — cudza wypowiedź nie jest nasza do
zmieniania. Ten sam tekst trafia do wszystkich wersji językowych.

Karuzela bierze opinie z tabeli, a `config.reviews.items` zostaje treścią
zastępczą dla stron, które jeszcze żadnej nie zebrały. Do 2026-09-29 karuzela
pokazywała wyłącznie config, a do tabeli nic nie pisało — panel właściciela
moderował zbiór, który zawsze był pusty.

### Powiadomienia do gości

Cron `guest-reminders` (codziennie 08:00 UTC) wysyła dwie rzeczy:
przypomnienie siedem dni przed przyjazdem (z linkiem do check-inu, jeśli strona
ma plan Pro) i prośbę o opinię dwa dni po wyjeździe.

**Jednokrotność gwarantuje baza, nie kod.** Klucz unikalny
`(booking_id, rodzaj)` w `guest_notifications` rozstrzyga, czy wiadomość już
poszła; odczyt-potem-zapis miałby okno wyścigu, a Vercel potrafi powtórzyć
wywołanie crona.

Ślad zapisujemy **przed** wysyłką. Ceną jest to, że nieudany mail nie zostanie
ponowiony automatycznie — świadomy wybór, bo gość woli nie dostać przypomnienia
niż dostać je pięć razy.

Uwaga na nazwy — dwie różne prośby o opinię, łatwe do pomylenia:

| Cron | Do kogo | O czym | Kiedy |
|---|---|---|---|
| `guest-reminders` | gość | apartament | 2 dni po wyjeździe |
| `review-requests` | właściciel apartamentu (nasz klient) | Nobooking | 3 dni po uruchomieniu strony |

Ten drugi **nie wysłał ani jednej wiadomości od maja**: szukał zamówień
w statusie `completed`, który ustawia wyłącznie człowiek w panelu admina — nic
w kodzie go nie nadaje. Do tego okno ±12 h wokół „trzy dni temu" przy dziennym
cyklu pozwalało trafić w to samo zamówienie dwa razy.

Od 2026-09-30 rozstrzyga znacznik `orders.review_request_sent_at`, niezależny
od statusu i od szerokości okna. Zapisywany **po** udanej wysyłce — zapisany
wcześniej odciąłby ponowienie przy awarii poczty, a ta awaria już tu była.

### Online check-in (pakiet Pro)

`src/lib/checkin.ts` — walidacja bez bazy, `/api/sites/[slug]/guest/[bookingId]/checkin`
— odczyt i zapis, `/sites/[slug]/guest/[bookingId]/checkin` — formularz.
Tabela `checkin_forms` istniała w schemacie od początku, nieużywana.

Gość podaje dane osób, godzinę przyjazdu i uwagi. Wejście prowadzi z portalu
gościa i znika po wyjeździe.

**Dostępem jest znajomość identyfikatora rezerwacji** — tak samo jak w portalu
gościa. Stąd trzy sprawdzenia po stronie serwera, z których żadnego nie wolno
pominąć:

1. rezerwacja należy do strony z adresu (niezmiennik 3),
2. strona ma plan Pro,
3. termin nie minął, a rezerwacja nie jest anulowana.

Formularz jest publiczny, więc wszystko, co przychodzi, jest niezaufane:
liczba osób nie może przekroczyć liczby z rezerwacji (inaczej obchodziłaby
limit pojemności pilnowany przy rezerwacji), długości są przycinane, znaki
sterujące usuwane, godzina sprawdzana wzorcem.

Gość może poprawiać wpis do wyjazdu — stąd `upsert` po `booking_id`.

**Retencja RODO.** Numer dokumentu to dane wrażliwe, więc po pobycie nie służą
już niczemu, a ich trzymanie jest samym ryzykiem. Cron `cleanup-pending-bookings`
kasuje formularze rezerwacji zakończonych ponad `DNI_RETENCJI` (7) temu —
niezależnie od tego, czy akurat są wiszące rezerwacje do anulowania. Zbieramy
też jak najmniej pól: im mniej danych, tym mniej do skasowania.

### Powiadomienia SMS (pakiet Pro)

`src/lib/sms.ts` — logika bez sieci i bez bazy (normalizacja numeru, treść,
limit), `src/lib/smsSend.ts` — wysyłka i zapis śladu.
Migracja: `docs/supabase/2026-09-29-sms.sql`.

**Dostawca: Twilio.** Ten sam, którego od kwietnia 2026 używa Casa Sol
(`casa-sol/src/lib/sms.ts`) z polskim numerem nadawcy - wzorzec sprawdzony
w boju, a jeden dostawca zamiast dwóch to jedno miejsce do pilnowania. Przy tej
skali (kilka SMS-ów tygodniowo na właściciela) różnica w cenie wobec dostawców
krajowych nie ma znaczenia. Zmiana dostawcy dotyka jednej funkcji w `smsSend.ts`.

Konfiguracja: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`.
**Poświadczenia muszą być osobne od Casa Sol** - własne konto albo subkonto
Twilio. Casa Sol ma być całkowicie niezależna od Nobookinga, tak samo jak przy
Stripe; wspólne poświadczenia oznaczałyby wspólny rachunek i wspólny numer
nadawcy dla dwóch produktów.

**Bez kompletu zmiennych moduł nie robi nic i mówi o tym w logu** - brak
konfiguracji nie udaje sukcesu, ale też nie wywraca potwierdzenia rezerwacji.

Dwie rzeczy, które odróżniają SMS od e-maila i wymusiły kształt tego kodu:

- **Kosztuje za sztukę.** Stąd dzienny limit na stronę (`MAX_SMS_DZIENNIE`),
  liczony z `sms_log`. Gdy licznika nie da się odczytać, zawodzimy „na
  zamknięto": lepiej nie wysłać jednego SMS-a niż wysłać ich tyle, ile przyjdzie
  zdarzeń.
- **Polski znak potraja cenę.** Operator liczy wiadomość z „ł" albo „ą"
  w alfabecie UCS-2, gdzie limit spada ze 160 znaków do 70. Treść przechodzi
  więc przez `bezOgonkow` i jest przycinana do 160 znaków.

Numer trzymamy w `sites.sms_phone`, nie w configu — config bywa nadpisywany
przy regeneracji strony. Kopiowany z `orders.ob_sms_phone` przy provisioningu,
od razu znormalizowany do postaci `+48600123456`.

Każda wysyłka, udana i nieudana, zostawia wiersz w `sms_log` razem z powodem
błędu. Agent zdrowia raportuje nieudane wysyłki z ostatniej doby — bez tego
byłaby to awaria niewidoczna dla właściciela, bo brak SMS-a niczym się nie
objawia.

Agent zdrowia sprawdza też **same poświadczenia**, tak jak robi to z kluczem
Brevo i Anthropic. Zły token byłby inaczej niewidoczny aż do pierwszej
rezerwacji. Trzy stany: `null` — nieskonfigurowane, i to nie jest awaria, bo
SMS-y są funkcją pakietu Pro; `false` — Twilio odrzuca poświadczenia albo
konfiguracja jest niekompletna; `true` — w porządku.

Niekompletna konfiguracja (jedna lub dwie zmienne z trzech) jest traktowana jak
awaria, nie jak brak: wygląda na włączoną, a moduł i tak nie wyśle nic.

Plan sprawdzany po stronie serwera, w `powiadomORezerwacji` i w trasie ustawień.

### Atrybucja — skąd przyszedł klient

`src/lib/attribution.ts` (czyste), `src/components/ZapiszZrodlo.tsx` (zapis),
migracja `docs/supabase/2026-09-29-atrybucja.sql`.

**Pierwsze dotknięcie wygrywa.** Parametry kampanii lądują na stronie wejścia,
a formularz zamówienia jest kilka kliknięć dalej — przy ostatnim dotknięciu
każde zamówienie miałoby źródło „wejście bezpośrednie". `ZapiszZrodlo` siedzi
w `layout.tsx`, zapisuje źródło do `localStorage` przy pierwszej wizycie
i nie nadpisuje go przy kolejnych. Wyjątek: zapisane „wejście bezpośrednie"
ustępuje późniejszemu źródłu z informacją.

Rozpoznawanie, w kolejności pierwszeństwa:

1. parametry `utm_*` z adresu,
2. `fbclid` / `gclid` — Meta i Google dokładają je nawet bez UTM-ów, więc bez
   tego cały ruch płatny wyglądałby na bezpośredni; dają `source` i `medium: paid`,
3. `document.referrer` — znane domeny mapowane na nazwy (`facebook`, `instagram`,
   `google`, `x`, …), reszta jako `medium: referral`. Referrer wewnętrzny jest
   ignorowany, inaczej każde zamówienie miałoby źródło `nobooking.eu`.

Wartości przechodzą przez `zBody` po stronie serwera: przycięcie do 200 znaków,
usunięcie znaków sterujących, odrzucenie pól spoza zestawu. Pochodzą z adresu
URL, więc są niezaufane. Dostęp do `localStorage` jest w `try/catch` — tryb
prywatny rzuca, a brak atrybucji nie może zablokować zamówienia.

Źródło trafia też jedną linią do maila z powiadomieniem o zamówieniu
(`opisZrodla`).

### Krok weryfikacji przed wysyłką

`src/lib/provisionCheck.ts` — czysta funkcja, bez bazy i bez sieci; pobranie
strony dostaje funkcję pobierającą z zewnątrz, żeby dało się to testować.

Sprawdzane jest:

| Co | Waga |
|---|---|
| nazwa pusta lub wyglądająca na zaślepkę | blokująca |
| opis po polsku krótszy niż 120 znaków, pusty albo z zaślepką (`{{ }}`, `lorem ipsum`, `TODO`) | blokująca |
| mniej niż 3 zdjęcia albo adres inny niż pełny `http(s)` | blokująca |
| cena za noc ≤ 0, `minNights` < 1, nieznana waluta, ujemna opłata za sprzątanie | blokująca |
| `specs.guests` < 1 | blokująca |
| strona `/sites/<slug>` nie zwraca 200 | blokująca |
| brak tłumaczeń, brak tekstów alternatywnych, brak metrażu, brak udogodnień, brak nazwy w treści strony | ostrzeżenie |

Usterka blokująca **wstrzymuje oba maile** i dopisuje do `orders.notes` linię
ze znacznikiem `[PROVISION-CHECK]`. Agent zdrowia szuka tego znacznika i zgłasza
sprawę jako krytyczną — bez tego wstrzymane zamówienie wyglądałoby w bazie
dokładnie jak udane, bo ma wypełniony `site_slug`.

Cron **nie ponowi** takiego zamówienia (`site_slug` jest już ustawiony). Po
poprawieniu configu dane logowania trzeba wysłać ręcznie.

Ostrzeżenia trafiają tylko do logu — klient wolałby dostać stronę bez tłumaczenia
niemieckiego niż nie dostać jej wcale.

## 16. Crony

| Ścieżka | Harmonogram | Co robi | Gdy padnie |
|---|---|---|---|
| `provision-sites` | co minutę | generuje strony z gotowych zamówień | klient nie dostaje strony — zgłasza agent zdrowia |
| `cleanup-pending-bookings` | co 30 min | anuluje `pending` starsze niż 2 h | terminy zostają zablokowane |
| `review-requests` | 10:00 | prośba o opinię 3 dni po uruchomieniu strony | brak opinii |
| `backup-bookings` | 02:00 | kopia do `app-data/backups` | brak kopii — zgłasza agent zdrowia |
| `renewal-reminders` | 09:00 | przypomnienia D-90/30/14/7/1 i wyłączenie po 14 dniach karencji | klient nie wie o wygaśnięciu |
| `health` | 06:00 | raport stanu systemu | — |

Wszystkie wymagają `CRON_SECRET` (`src/lib/cronAuth.ts`) i zawodzą „na zamknięto".

## 17. Odnowienia subskrypcji

`sites.expires_at` + `renewal_price_pln/eur` (cena **zamrożona w chwili zakupu**).
Panel właściciela → `/api/sites/[slug]/owner/renew` tworzy sesję na koncie
platformy z metadanymi `{type:'renewal', site_id}`. Webhook przedłuża `expires_at`
o 2 lata **od dotychczasowej daty**, nie od dziś, i czyści `renewal_reminders`.

## 18. Bot Facebooka

`/api/facebook/webhook` — weryfikacja podpisu Meta, potem:
- **deduplikacja** po `message.mid` w `bot_processed_messages` (Meta ponawia przy
  wolnej odpowiedzi; bez tego gość dostawał dwie odpowiedzi),
- **limit** 20 wiadomości / 10 min per użytkownik, liczony w tej samej tabeli,
- odpowiedź z `claude-sonnet-5`, baza wiedzy w cache promptu, kształt odpowiedzi
  wymuszony przez structured outputs,
- treść od użytkownika wchodzi w oznaczonej ramce jako dane niezaufane.

Pod komentarzami bot nigdy nie zapisuje leada — tylko zaprasza do wiadomości prywatnej.

## 19. Pozostałe tabele

| Tabela | Do czego |
|---|---|
| `orders` | zamówienia stron, onboarding, tokeny, licznik poprawek |
| `discount_codes` | kody rabatowe (plan pro), `uses_count`, `max_uses`, `valid_until` |
| `renewal_reminders` | które przypomnienia już wysłano (`site_id` + `days_before`) |
| `stripe_webhook_events` | idempotencja webhooka — klucz główny na `event_id` |
| `bot_processed_messages` | deduplikacja i limit bota |
| `bot_knowledge`, `bot_settings`, `bot_conversations`, `bot_leads` | baza wiedzy, wyłącznik, historia rozmów, leady |
| `checkin_forms` | check-in online |

## 20. Ograniczanie ruchu i RODO

**Rate limiting** — `src/proxy.ts`, w pamięci instancji (świadome uproszczenie,
do wymiany na Redis przy większej skali). Objęte: logowanie i zmiana hasła
właściciela, rezerwacje, zamówienia, poprawki, checkout, kody rabatowe, tokeny
onboardingu. Webhook Meta celowo pominięty — limit działa tam per użytkownik.

**RODO** — `DELETE /api/admin/guests/[email]` anonimizuje dane gościa we
wszystkich rezerwacjach i zamówieniach, zachowując historię finansową. Adres
zastępczy powstaje z **losowego UUID**; wcześniejszy skrót e-maila dawał się
odwrócić, więc była to pseudonimizacja, a nie anonimizacja.
