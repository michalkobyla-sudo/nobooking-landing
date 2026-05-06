# Nobooking — Order Form + Admin CMS Spec

## Goal

Dodać formularz zamówienia przed płatnością Stripe, zapisywać zamówienia w Supabase, zbudować chroniony panel `/admin` dla Michała do zarządzania zamówieniami i klientami.

## Architecture

Wszystko w jednym projekcie `nobooking-landing` (Next.js 15 App Router). Supabase jako baza danych (PostgreSQL) + Supabase Auth do ochrony `/admin`. Resend do emaili notyfikacyjnych. Istniejące route `/api/stripe/checkout` i `/api/stripe/webhook` zostają rozszerzone o obsługę `order_id`.

**Tech Stack:** Next.js 15, TypeScript, Supabase (DB + Auth), `@supabase/ssr`, Resend (już w projekcie), TailwindCSS → inline styles (zgodnie z resztą projektu)

---

## User Flow

### Klient
1. Klika "Kup Basic" lub "Kup Pro" na stronie głównej
2. Trafia na `/zamow?plan=basic` (lub `pro`)
3. Wypełnia formularz — dane kontaktowe, opcjonalne dane do faktury, info o apartamencie
4. Klika "Przejdź do płatności →" → `POST /api/orders` zapisuje zamówienie w Supabase (status: `new`, `stripe_paid: false`), zwraca `order_id`
5. Frontend przekierowuje na Stripe Checkout (URL z `/api/stripe/checkout` z `order_id` w body)
6. Po płatności: Stripe webhook aktualizuje `stripe_paid = true`, `stripe_session_id`
7. Klient trafia na `/sukces` — widzi potwierdzenie, info że dostanie formularz onboardingowy emailem
8. Michał dostaje email (Resend) z danymi zamówienia

### Formularz onboardingowy
1. Michał w `/admin` klika "Wyślij formularz onboardingowy" przy danym zamówieniu
2. API wysyła email do klienta z linkiem `/onboarding/[token]` (token = `onboarding_token` z tabeli)
3. Klient wypełnia szczegółowy formularz budowy strony
4. Submit → `POST /api/onboarding/[token]` → zapisuje dane do Supabase, ustawia `onboarding_submitted = true`
5. Michał dostaje email: "Klient [imię] wypełnił formularz onboardingowy"

### Admin
1. Michał wchodzi na `/admin` → redirect na `/admin/login` jeśli niezalogowany
2. Loguje się emailem + hasłem (Supabase Auth)
3. Widzi listę zamówień z filtrami
4. Klika zamówienie → widzi wszystkie dane + zmienia status

---

## Database Schema (Supabase)

### Tabela `orders`

```sql
CREATE TABLE orders (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at           TIMESTAMPTZ DEFAULT now(),

  -- Plan
  plan                 TEXT NOT NULL CHECK (plan IN ('basic', 'pro')),
  currency             TEXT NOT NULL CHECK (currency IN ('pln', 'eur')),
  status               TEXT NOT NULL DEFAULT 'new'
                         CHECK (status IN ('new','contacted','onboarding_sent','building','completed')),

  -- Stripe
  stripe_session_id    TEXT,
  stripe_paid          BOOLEAN NOT NULL DEFAULT false,

  -- Onboarding
  onboarding_token     UUID NOT NULL DEFAULT gen_random_uuid(),
  onboarding_submitted BOOLEAN NOT NULL DEFAULT false,

  -- Dane kontaktowe
  first_name           TEXT NOT NULL,
  last_name            TEXT NOT NULL,
  email                TEXT NOT NULL,
  phone                TEXT NOT NULL,

  -- Dane do faktury (opcjonalne)
  invoice_company      TEXT,
  invoice_nip          TEXT,
  invoice_address      TEXT,

  -- Apartament
  apartment_name       TEXT NOT NULL,
  apartment_location   TEXT NOT NULL,
  notes                TEXT,

  -- Formularz onboardingowy (wypełniany po płatności przez klienta)
  ob_description       TEXT,
  ob_price_per_night   INTEGER,
  ob_max_guests        INTEGER,
  ob_checkin_time      TEXT,
  ob_checkout_time     TEXT,
  ob_amenities         TEXT,
  ob_rules             TEXT,
  ob_seasons           TEXT,   -- JSON string: [{label, from, to, price}]
  ob_photos_link       TEXT    -- link do Google Drive / WeTransfer
);
```

### Row Level Security
- `orders` jest dostępna tylko przez service role key (API routes) i authenticated users (admin)
- Publiczny dostęp: tylko `GET/POST /api/onboarding/[token]` — weryfikacja po tokenie, nie po auth
- Admin ma pełny dostęp po zalogowaniu przez Supabase Auth

---

## Pages & Components

### `/zamow` — Strona formularza zamówienia

**Parametry URL:** `?plan=basic|pro&currency=pln|eur`

**Formularz — sekcje:**

1. **Plan (readonly)** — badge z wybranym planem i ceną, link "Zmień plan" → `/#cennik`
2. **Dane kontaktowe** (wymagane):
   - Imię (`first_name`) *
   - Nazwisko (`last_name`) *
   - Email (`email`) *
   - Telefon (`phone`) *
3. **Dane do faktury** (toggle "Chcę fakturę na firmę"):
   - Nazwa firmy (`invoice_company`)
   - NIP (`invoice_nip`) — format: 10 cyfr
   - Adres (`invoice_address`) — textarea
4. **Informacje o apartamencie** (wymagane):
   - Nazwa apartamentu (`apartment_name`) *
   - Lokalizacja — miasto/region (`apartment_location`) *
   - Notatki / dodatkowe info (`notes`) — textarea, opcjonalne
5. **Submit:** "Przejdź do płatności →" (primary button)
   - Walidacja po stronie klienta (required fields, email format, NIP format)
   - Loading state podczas zapisu i redirect do Stripe
   - Error state jeśli API zwróci błąd

**Styl:** zgodny z resztą strony — Plus Jakarta Sans, CSS custom properties, `section-wrap` layout, `container` max-width 640px centered.

---

### `/onboarding/[token]` — Formularz budowy strony

Dostępny tylko gdy token istnieje w bazie. Jeśli `onboarding_submitted = true` → pokazuje "Formularz już wypełniony, dziękujemy!".

**Sekcje formularza:**

1. **O apartamencie:**
   - Opis (textarea, `ob_description`) *
   - Cena za noc (number, `ob_price_per_night`) *
   - Maks. liczba gości (number, `ob_max_guests`) *
   - Godzina check-in (`ob_checkin_time`) *
   - Godzina check-out (`ob_checkout_time`) *
2. **Udogodnienia i zasady:**
   - Udogodnienia (textarea, `ob_amenities`) — np. "WiFi, Parking, Klimatyzacja"
   - Zasady pobytu (textarea, `ob_rules`) — np. "Zakaz palenia, Zakaz imprez"
3. **Ceny sezonowe** (opcjonalne):
   - Dynamiczne wiersze: Nazwa sezonu · Data od · Data do · Cena/noc
   - "Dodaj sezon" button, zapisywane jako JSON do `ob_seasons`
4. **Zdjęcia:**
   - Pole tekstowe na link do Google Drive / WeTransfer / Dropbox (`ob_photos_link`)
   - Nota: "Prześlij zdjęcia (min. 10) przez Google Drive lub WeTransfer"
5. **Submit:** "Wyślij formularz →"

---

### `/admin/login` — Logowanie

Prosty formularz: email + hasło → Supabase Auth `signInWithPassword`. Po zalogowaniu redirect na `/admin/zamowienia`.

### `/admin/zamowienia` — Lista zamówień

Tabela z kolumnami:
- Data zamówienia
- Imię i nazwisko
- Email
- Plan (Basic/Pro badge)
- Kwota
- Status (kolorowy badge)
- Stripe paid (✓ zielony / ✗ czerwony)
- Formularz onbordingowy (wypełniony / niewypełniony)

Filtry: All · Nowe · W kontakcie · Formularz wysłany · W budowie · Ukończone

Kliknięcie wiersza → `/admin/zamowienia/[id]`

### `/admin/zamowienia/[id]` — Szczegóły zamówienia

Sekcje:
1. **Header:** imię, plan, status dropdown (zmiana natychmiast zapisuje), data
2. **Dane kontaktowe:** imię, nazwisko, email (klikalne), telefon (klikalne)
3. **Dane do faktury:** jeśli wypełnione — firma, NIP, adres; jeśli nie — "Brak danych do faktury"
4. **Informacje o apartamencie:** nazwa, lokalizacja, notatki
5. **Płatność:** stripe_session_id, stripe_paid, plan, currency, kwota
6. **Formularz onboardingowy:**
   - Jeśli `onboarding_submitted = false` i `stripe_paid = true`: przycisk "Wyślij formularz onboardingowy →" (wysyła email)
   - Jeśli `onboarding_submitted = false` i `stripe_paid = false`: "Oczekiwanie na płatność"
   - Jeśli `onboarding_submitted = true`: wszystkie dane z formularza wyświetlone

---

## API Routes

### `POST /api/orders`
Body: `{ plan, currency, first_name, last_name, email, phone, invoice_company?, invoice_nip?, invoice_address?, apartment_name, apartment_location, notes? }`

1. Walidacja pól wymaganych
2. Insert do Supabase (service role key)
3. Zwraca `{ order_id, stripe_url }` — stripe_url z `/api/stripe/checkout` wywołanego serwerowo

Zmiana w `/api/stripe/checkout`: przyjmuje teraz `order_id` w body, dodaje go do `metadata: { plan, currency, order_id }`.

### `GET /api/onboarding/[token]`
- Szuka zamówienia po `onboarding_token`
- Zwraca `{ found: true, submitted: boolean, first_name, apartment_name }` lub `{ found: false }`

### `POST /api/onboarding/[token]`
Body: wszystkie pola `ob_*`
- Szuka zamówienia po tokenie
- Jeśli `onboarding_submitted = true` → zwraca 409
- Update Supabase: zapisuje pola `ob_*`, ustawia `onboarding_submitted = true`
- Wysyła email do Michała przez Resend: "Klient [imię] wypełnił formularz"

### `POST /api/admin/orders/[id]/send-onboarding`
- Chroniony (Supabase Auth session)
- Pobiera zamówienie z Supabase
- Wysyła email do klienta przez Resend z linkiem `/onboarding/[onboarding_token]`
- Aktualizuje status na `onboarding_sent`

### `PATCH /api/admin/orders/[id]`
Body: `{ status }`
- Chroniony (Supabase Auth session)
- Aktualizuje status zamówienia

### Webhook `/api/stripe/webhook` (rozszerzenie istniejącego)
- Po `checkout.session.completed` dodatkowo aktualizuje `stripe_paid = true`, `stripe_session_id` w Supabase po `order_id` z metadata

---

## Auth & Middleware

Plik `src/middleware.ts`:
- Chroni wszystkie ścieżki `/admin/*` (oprócz `/admin/login`)
- Używa `@supabase/ssr` do weryfikacji sesji z cookies
- Niezalogowany → redirect `/admin/login`

Supabase Auth: jeden użytkownik (Michał) tworzony manualnie w Supabase Dashboard.

---

## Email Templates (Resend)

### 1. Powiadomienie dla Michała — nowe zamówienie
Temat: `Nowe zamówienie Nobooking — [imię] [nazwisko] ([plan])`
Treść: wszystkie dane z formularza, plan, kwota, data

### 2. Email do klienta — formularz onboardingowy
Temat: `Twoja strona Nobooking — wypełnij formularz`
Treść: imię, info o następnym kroku, przycisk "Wypełnij formularz →" z linkiem `/onboarding/[token]`

### 3. Powiadomienie dla Michała — formularz wypełniony
Temat: `Formularz onboardingowy wypełniony — [imię] [nazwisko]`
Treść: link do `/admin/zamowienia/[id]`

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Resend (już istnieje)
RESEND_API_KEY=

# Admin email — adres Michała do powiadomień
ADMIN_EMAIL=michal.kobyla@gmail.com
```

---

## Non-Goals
- Możliwość rejestracji/tworzenia kont przez klientów
- Upload zdjęć bezpośrednio w formularzu (link do zewnętrznego storage)
- Multi-tenant admin (jest tylko jeden admin — Michał)
- Responsywność `/admin` na mobile (używane z desktopa)
- Paginacja w liście zamówień (YAGNI — mało zamówień na start)
