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

### Model: Platform (Destination Charges)

```
Gość → płaci → Stripe Checkout → środki na konto właściciela (acct_xxx)
                                  ↑
                    Nobooking = platforma (sk_live_...)
```

Pieniądze trafiają **bezpośrednio** na konto bankowe właściciela. Nobooking nie widzi tych środków (chyba że zostanie ustawiona prowizja `application_fee_amount`).

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

// Tworzy Checkout Session z destination charge:
payment_intent_data: {
  transfer_data: { destination: site.stripe_account_id }
}
```

**Jeśli Stripe nie połączony** — strona apartamentu zamiast przycisku płatności pokazuje dane kontaktowe właściciela.

### Webhook Stripe

`POST /api/stripe/webhook` — nasłuchuje zdarzenia `checkout.session.completed`:

1. Pobiera `booking_id` z metadata sesji
2. Ustawia `stripe_paid = true`, `status = 'confirmed'`
3. Wysyła emaile potwierdzające (do gościa i właściciela)

**WAŻNE:** Klucz `STRIPE_WEBHOOK_SECRET` musi być ustawiony. W Stripe Dashboard → Webhooks → Endpoint: `https://www.nobooking.eu/api/stripe/webhook`, zdarzenie: `checkout.session.completed`.

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
