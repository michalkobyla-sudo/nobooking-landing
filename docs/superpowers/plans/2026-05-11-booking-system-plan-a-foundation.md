# Multi-Tenant Booking System — Plan A: Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Zbudować fundament multi-tenant systemu: schemat bazy danych, Stripe Connect provisioning, automatyczne tworzenie konta właściciela w Supabase Auth i site record po wypełnieniu onboardingu.

**Architecture:** Po opłaceniu i onboardingu klient dostaje: (1) rekord w tabeli `sites` z config JSONB, (2) konto Supabase Auth z tymczasowym hasłem, (3) Stripe Connect Express account. Wszystko triggerowane automatycznie przez istniejący endpoint `POST /api/onboarding/[token]`. Plan B buduje na tym system rezerwacji.

**Tech Stack:** Next.js App Router, Supabase (Postgres + Auth + service_role), Stripe Connect Express, Brevo email, TypeScript.

---

## Struktura plików

```
# NOWE
docs/supabase/booking_schema.sql           ← tabele: sites, bookings, blocked_dates, reviews, discount_codes, checkin_forms
src/lib/stripe-connect.ts                  ← createConnectAccount(), getConnectAccount()
src/lib/provision-site.ts                  ← provisionSite() — tworzy site + auth user + connect account
src/app/api/connect/onboard/route.ts       ← GET — redirect do Stripe Connect onboarding URL
src/app/api/connect/callback/route.ts      ← GET — Stripe callback po zakończeniu onboardingu

# MODYFIKOWANE
src/app/api/onboarding/[token]/route.ts    ← POST — po submit wywołuje provisionSite()
src/lib/email.ts                           ← dodać sendOwnerWelcomeEmail()
src/lib/types.ts                           ← dodać typy Site, Booking, BlockedDate, Review
```

---

## Task 1: Schemat bazy danych

**Files:**
- Create: `docs/supabase/booking_schema.sql`

- [ ] **Step 1: Utwórz plik SQL**

```sql
-- docs/supabase/booking_schema.sql
-- Run in: Supabase Dashboard → SQL Editor → New query → Run

-- ─── SITES ───────────────────────────────────────────────────────────────────
create table if not exists sites (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  order_id        uuid not null references orders(id) on delete cascade,
  slug            text not null unique,
  plan            text not null check (plan in ('basic', 'pro')),
  active          boolean not null default true,
  config          jsonb not null default '{}',   -- ApartmentConfig JSON
  owner_email     text not null,
  owner_user_id   uuid,                          -- Supabase auth.users id
  stripe_account_id text,                        -- Stripe Connect account id (e.g. acct_xxx)
  stripe_onboarded boolean not null default false
);

create index if not exists sites_slug_idx      on sites (slug);
create index if not exists sites_order_id_idx  on sites (order_id);

alter table sites enable row level security;
create policy "no_anon_sites" on sites for all to anon using (false);

-- ─── BOOKINGS ────────────────────────────────────────────────────────────────
create table if not exists bookings (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  site_id           uuid not null references sites(id) on delete cascade,
  guest_name        text not null,
  guest_email       text not null,
  guest_phone       text not null,
  check_in          date not null,
  check_out         date not null,
  nights            int not null,
  guests_count      int not null default 1,
  total_price       numeric not null,
  currency          text not null default 'EUR',
  stripe_session_id text,
  stripe_payment_id text,
  stripe_paid       boolean not null default false,
  status            text not null default 'pending'
                      check (status in ('pending','confirmed','cancelled','completed')),
  token             uuid not null default gen_random_uuid(), -- guest portal token
  discount_code     text,
  discount_pct      int default 0,
  notes             text,
  -- Pro: check-in
  checkin_sent      boolean not null default false,
  checkin_submitted boolean not null default false
);

create index if not exists bookings_site_id_idx   on bookings (site_id);
create index if not exists bookings_check_in_idx  on bookings (check_in);
create index if not exists bookings_token_idx     on bookings (token);
create index if not exists bookings_status_idx    on bookings (status);

alter table bookings enable row level security;
create policy "no_anon_bookings" on bookings for all to anon using (false);

-- ─── BLOCKED DATES ───────────────────────────────────────────────────────────
create table if not exists blocked_dates (
  id        uuid primary key default gen_random_uuid(),
  site_id   uuid not null references sites(id) on delete cascade,
  date      date not null,
  reason    text,
  unique (site_id, date)
);

create index if not exists blocked_dates_site_idx on blocked_dates (site_id);

alter table blocked_dates enable row level security;
create policy "no_anon_blocked" on blocked_dates for all to anon using (false);

-- ─── REVIEWS ─────────────────────────────────────────────────────────────────
create table if not exists reviews (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  site_id     uuid not null references sites(id) on delete cascade,
  booking_id  uuid references bookings(id),
  guest_name  text not null,
  score       int not null check (score between 1 and 5),
  text        text not null,
  published   boolean not null default false
);

create index if not exists reviews_site_id_idx on reviews (site_id, published);

alter table reviews enable row level security;
create policy "no_anon_reviews" on reviews for all to anon using (false);

-- ─── DISCOUNT CODES (Pro only) ───────────────────────────────────────────────
create table if not exists discount_codes (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  site_id     uuid not null references sites(id) on delete cascade,
  code        text not null,
  discount_pct int not null check (discount_pct between 1 and 100),
  max_uses    int,
  uses_count  int not null default 0,
  valid_until date,
  active      boolean not null default true,
  unique (site_id, code)
);

alter table discount_codes enable row level security;
create policy "no_anon_codes" on discount_codes for all to anon using (false);

-- ─── CHECKIN FORMS (Pro only) ────────────────────────────────────────────────
create table if not exists checkin_forms (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  booking_id   uuid not null references bookings(id) on delete cascade unique,
  guests_data  jsonb not null default '[]',  -- [{name, dob, passport, country}]
  arrival_time text,
  notes        text
);

alter table checkin_forms enable row level security;
create policy "no_anon_checkin" on checkin_forms for all to anon using (false);
```

- [ ] **Step 2: Uruchom SQL w Supabase**

Wejdź na https://supabase.com/dashboard → projekt → SQL Editor → New query → wklej cały plik → Run.

Oczekiwany wynik: `Success. No rows returned` (lub podobny bez błędów).

- [ ] **Step 3: Zweryfikuj tabele**

```sql
select table_name from information_schema.tables
where table_schema = 'public'
order by table_name;
```

Oczekiwane: bookings, blocked_dates, checkin_forms, discount_codes, orders, reviews, sites.

- [ ] **Step 4: Commit**

```bash
git add docs/supabase/booking_schema.sql
git commit -m "feat: booking system DB schema — sites, bookings, blocked_dates, reviews, discount_codes, checkin_forms"
```

---

## Task 2: Typy TypeScript

**Files:**
- Modify: `src/lib/types.ts`

- [ ] **Step 1: Dodaj typy na końcu pliku**

Otwórz `src/lib/types.ts` i dodaj po istniejącym typie `Order`:

```typescript
// ─── SITE ────────────────────────────────────────────────────────────────────

export interface Site {
  id: string
  created_at: string
  order_id: string
  slug: string
  plan: 'basic' | 'pro'
  active: boolean
  config: Record<string, unknown>   // ApartmentConfig JSON
  owner_email: string
  owner_user_id: string | null
  stripe_account_id: string | null
  stripe_onboarded: boolean
}

// ─── BOOKING ─────────────────────────────────────────────────────────────────

export type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'

export interface Booking {
  id: string
  created_at: string
  site_id: string
  guest_name: string
  guest_email: string
  guest_phone: string
  check_in: string        // YYYY-MM-DD
  check_out: string       // YYYY-MM-DD
  nights: number
  guests_count: number
  total_price: number
  currency: string
  stripe_session_id: string | null
  stripe_payment_id: string | null
  stripe_paid: boolean
  status: BookingStatus
  token: string
  discount_code: string | null
  discount_pct: number
  notes: string | null
  checkin_sent: boolean
  checkin_submitted: boolean
}

// ─── BLOCKED DATE ─────────────────────────────────────────────────────────────

export interface BlockedDate {
  id: string
  site_id: string
  date: string    // YYYY-MM-DD
  reason: string | null
}

// ─── REVIEW ──────────────────────────────────────────────────────────────────

export interface Review {
  id: string
  created_at: string
  site_id: string
  booking_id: string | null
  guest_name: string
  score: number
  text: string
  published: boolean
}

// ─── DISCOUNT CODE ────────────────────────────────────────────────────────────

export interface DiscountCode {
  id: string
  created_at: string
  site_id: string
  code: string
  discount_pct: number
  max_uses: number | null
  uses_count: number
  valid_until: string | null
  active: boolean
}

// ─── CHECKIN FORM ─────────────────────────────────────────────────────────────

export interface CheckinGuest {
  name: string
  dob: string
  passport: string
  country: string
}

export interface CheckinForm {
  id: string
  created_at: string
  booking_id: string
  guests_data: CheckinGuest[]
  arrival_time: string | null
  notes: string | null
}
```

- [ ] **Step 2: Sprawdź kompilację**

```bash
cd "/Users/michalkobylinski/Library/Mobile Documents/com~apple~CloudDocs/Projekty AI/Mieszkanie - Torrevieja/nobooking-landing"
npx tsc --noEmit 2>&1 | head -20
```

Oczekiwane: brak błędów (lub tylko pre-istniejące).

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts
git commit -m "feat: add Site, Booking, Review, DiscountCode, CheckinForm types"
```

---

## Task 3: Stripe Connect helper

**Files:**
- Create: `src/lib/stripe-connect.ts`

- [ ] **Step 1: Utwórz plik**

```typescript
// src/lib/stripe-connect.ts
import { createRequire } from 'module'

const _require = createRequire(import.meta.url)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const StripeLib = _require('stripe') as any

function getStripe() {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  return new StripeLib(
    (process.env.STRIPE_SECRET_KEY ?? '').trim(),
    { apiVersion: '2026-04-22.dahlia' }
  )
}

/**
 * Create a Stripe Connect Express account for an apartment owner.
 * Returns the account id (acct_xxx).
 */
export async function createConnectAccount(email: string): Promise<string> {
  const stripe = getStripe()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  const account = await stripe.accounts.create({
    type: 'express',
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_type: 'individual',
    settings: {
      payouts: { schedule: { interval: 'weekly', weekly_anchor: 'monday' } },
    },
  })
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  return account.id as string
}

/**
 * Generate an onboarding URL for a Connect Express account.
 * Owner visits this URL to set up their Stripe account.
 */
export async function createOnboardingLink(
  accountId: string,
  slug: string,
): Promise<string> {
  const stripe = getStripe()
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://nobooking.eu').trim().replace(/\/$/, '')

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${siteUrl}/api/connect/onboard?slug=${slug}&refresh=1`,
    return_url:  `${siteUrl}/api/connect/callback?slug=${slug}`,
    type: 'account_onboarding',
  })
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  return link.url as string
}

/**
 * Check if a Connect account has completed onboarding.
 */
export async function isConnectAccountReady(accountId: string): Promise<boolean> {
  const stripe = getStripe()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  const account = await stripe.accounts.retrieve(accountId)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  return account.details_submitted === true && account.charges_enabled === true
}

/**
 * Create a Stripe Checkout session with destination charge to owner's Connect account.
 * Used when a guest books an apartment.
 */
export async function createBookingCheckout(params: {
  accountId: string
  amountCents: number   // total in smallest currency unit
  currency: string      // 'pln' | 'eur'
  bookingId: string
  siteSlug: string
  guestEmail: string
  description: string   // e.g. "Apartament Playa Azul — 12–19 lip 2026"
}): Promise<string> {
  const stripe = getStripe()
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://nobooking.eu').trim().replace(/\/$/, '')

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card', 'blik', 'p24'],
    customer_email: guestEmail,
    line_items: [{
      price_data: {
        currency: params.currency,
        unit_amount: params.amountCents,
        product_data: { name: params.description },
      },
      quantity: 1,
    }],
    success_url: `${siteUrl}/sites/${params.siteSlug}/guest/${params.bookingId}?paid=1`,
    cancel_url:  `${siteUrl}/sites/${params.siteSlug}?cancelled=1`,
    metadata: { booking_id: params.bookingId, site_slug: params.siteSlug },
    payment_intent_data: {
      transfer_data: { destination: params.accountId },
    },
  }, {
    stripeAccount: undefined, // platform account creates session, not connected account
  })

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  return session.url as string
}
```

- [ ] **Step 2: Sprawdź kompilację**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Oczekiwane: brak nowych błędów.

- [ ] **Step 3: Commit**

```bash
git add src/lib/stripe-connect.ts
git commit -m "feat: Stripe Connect helpers — createConnectAccount, createOnboardingLink, createBookingCheckout"
```

---

## Task 4: provisionSite() — automatyczne tworzenie konta po onboardingu

**Files:**
- Create: `src/lib/provision-site.ts`

- [ ] **Step 1: Utwórz plik**

```typescript
// src/lib/provision-site.ts
import { createServiceClient } from '@/lib/supabase'
import { createConnectAccount } from '@/lib/stripe-connect'
import type { Order } from '@/lib/types'

const TEMP_PASSWORD_LENGTH = 12

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#'
  return Array.from({ length: TEMP_PASSWORD_LENGTH }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('')
}

export interface ProvisionResult {
  siteId: string
  ownerUserId: string
  stripeAccountId: string
  tempPassword: string
}

/**
 * Called after onboarding form is submitted and site config is generated.
 * Creates:
 *   1. Supabase Auth user for the apartment owner
 *   2. Stripe Connect Express account
 *   3. Row in `sites` table
 * Returns credentials for the welcome email.
 */
export async function provisionSite(
  order: Order,
  slug: string,
  configJson: string,
): Promise<ProvisionResult> {
  const supabase = createServiceClient()

  // ── 1. Create Supabase Auth user ──────────────────────────────────────────
  const tempPassword = generateTempPassword()
  const ownerEmail = (order.ob_contact_email ?? order.email).toLowerCase().trim()

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: ownerEmail,
    password: tempPassword,
    email_confirm: true,
  })

  if (authError && !authError.message.includes('already been registered')) {
    throw new Error(`Auth user creation failed: ${authError.message}`)
  }

  // If user already exists (e.g. re-provision), fetch existing user id
  let ownerUserId: string
  if (authError?.message.includes('already been registered')) {
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    const existing = existingUsers?.users?.find(u => u.email === ownerEmail)
    if (!existing) throw new Error('Could not find existing auth user')
    ownerUserId = existing.id
  } else {
    ownerUserId = authData.user!.id
  }

  // ── 2. Create Stripe Connect account ─────────────────────────────────────
  let stripeAccountId = ''
  try {
    stripeAccountId = await createConnectAccount(ownerEmail)
  } catch (err) {
    // Non-fatal — owner can connect Stripe later via admin panel
    console.error('[provision-site] Stripe Connect error:', err)
  }

  // ── 3. Create site record ─────────────────────────────────────────────────
  const { data: site, error: siteError } = await supabase
    .from('sites')
    .upsert({
      order_id: order.id,
      slug,
      plan: order.plan,
      active: true,
      config: JSON.parse(configJson),
      owner_email: ownerEmail,
      owner_user_id: ownerUserId,
      stripe_account_id: stripeAccountId || null,
      stripe_onboarded: false,
    }, { onConflict: 'slug' })
    .select('id')
    .single()

  if (siteError || !site) {
    throw new Error(`Site record creation failed: ${siteError?.message}`)
  }

  return {
    siteId: site.id,
    ownerUserId,
    stripeAccountId,
    tempPassword: authError ? '(konto już istnieje)' : tempPassword,
  }
}
```

- [ ] **Step 2: Sprawdź kompilację**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/provision-site.ts
git commit -m "feat: provisionSite — creates Supabase Auth user + Stripe Connect + sites record"
```

---

## Task 5: Welcome email dla właściciela

**Files:**
- Modify: `src/lib/email.ts`

- [ ] **Step 1: Dodaj funkcję na końcu pliku `src/lib/email.ts`**

```typescript
/** Email: Welcome owner — login credentials + Stripe Connect link */
export async function sendOwnerWelcomeEmail(params: {
  email: string
  first_name: string
  apartment_name: string
  slug: string
  temp_password: string
  stripe_onboard_url: string
  plan: 'basic' | 'pro'
}) {
  const { email, first_name, apartment_name, slug, temp_password, stripe_onboard_url, plan } = params
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://nobooking.eu').trim().replace(/\/$/, '')
  const adminUrl = `${siteUrl}/sites/${slug}/admin`
  const previewUrl = `${siteUrl}/sites/${slug}`

  await sendEmail(
    email,
    `🎉 Twoja strona jest gotowa — dostępy do panelu admina`,
    wrapEmail(`
      ${renderHeader('Witaj na pokładzie!')}

      <div style="padding: 2rem;">
        <p style="font-size: 1rem; margin: 0 0 1rem;">Cześć <strong>${escapeHtml(first_name)}</strong>! 🎉</p>
        <p style="color: #374151; margin: 0 0 1.5rem; line-height: 1.7;">
          Twoja strona apartamentu <strong>${escapeHtml(apartment_name)}</strong> jest gotowa
          i zaczyna przyjmować rezerwacje!
        </p>

        <!-- Site preview -->
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 1.25rem 1.5rem; margin-bottom: 1.5rem;">
          <div style="font-size: 0.875rem; font-weight: 700; color: #059669; margin-bottom: 0.25rem;">
            🏠 Twoja strona
          </div>
          <a href="${previewUrl}" style="color: #059669; font-weight: 600; word-break: break-all; font-size: 0.9rem;">${previewUrl}</a>
        </div>

        <!-- Admin credentials -->
        <div style="background: #1f2937; border-radius: 10px; padding: 1.5rem; margin-bottom: 1.5rem; color: white;">
          <div style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #9ca3af; margin-bottom: 1rem;">
            Dane logowania do panelu admina
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 0.4rem 0; color: #9ca3af; font-size: 0.8rem; width: 40%;">Adres panelu</td>
              <td style="padding: 0.4rem 0; font-size: 0.8rem;">
                <a href="${adminUrl}" style="color: #34d399; word-break: break-all;">${adminUrl}</a>
              </td>
            </tr>
            <tr>
              <td style="padding: 0.4rem 0; color: #9ca3af; font-size: 0.8rem;">Email</td>
              <td style="padding: 0.4rem 0; font-size: 0.8rem; color: white;">${escapeHtml(email)}</td>
            </tr>
            <tr>
              <td style="padding: 0.4rem 0; color: #9ca3af; font-size: 0.8rem;">Hasło tymczasowe</td>
              <td style="padding: 0.4rem 0; font-size: 0.9rem; font-weight: 700; color: #fbbf24; font-family: monospace; letter-spacing: 0.05em;">
                ${escapeHtml(temp_password)}
              </td>
            </tr>
          </table>
          <p style="margin: 1rem 0 0; font-size: 0.75rem; color: #6b7280;">
            ⚠️ Zmień hasło po pierwszym logowaniu w Ustawieniach panelu.
          </p>
        </div>

        <!-- Stripe Connect CTA -->
        <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 10px; padding: 1.25rem 1.5rem; margin-bottom: 1.5rem;">
          <div style="font-size: 0.875rem; font-weight: 700; color: #92400e; margin-bottom: 0.5rem;">
            💳 Krok obowiązkowy: podłącz płatności Stripe
          </div>
          <p style="font-size: 0.8rem; color: #78350f; margin: 0 0 1rem; line-height: 1.6;">
            Aby goście mogli płacić za rezerwacje, musisz podłączyć swoje konto Stripe.
            Zajmuje to 5 minut.
          </p>
          <a href="${stripe_onboard_url}" style="display: inline-block; background: #d97706; color: white; padding: 0.75rem 1.75rem; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 0.875rem;">
            Podłącz płatności →
          </a>
        </div>

        ${plan === 'pro' ? `
        <div style="background: #f5f3ff; border: 1px solid #ddd6fe; border-radius: 10px; padding: 1rem 1.25rem; margin-bottom: 1.5rem; font-size: 0.8rem; color: #5b21b6;">
          ⭐ <strong>Plan Pro</strong> — SMS, online check-in i kody rabatowe są już aktywne w Twoim panelu.
        </div>
        ` : ''}

        <div style="text-align: center; margin: 2rem 0;">
          <a href="${adminUrl}" style="display: inline-block; background: #059669; color: white; padding: 1rem 2.5rem; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 1rem;">
            Przejdź do panelu admina →
          </a>
        </div>

        <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 2rem 0;" />
        <p style="color: #374151; margin: 0; font-size: 0.875rem; line-height: 1.7;">
          W razie pytań odpowiedz na tego emaila — jestem do dyspozycji.<br/>
          <strong>Michał · Nobooking</strong>
        </p>
      </div>

      ${renderFooter()}
    `)
  )
}
```

- [ ] **Step 2: Sprawdź kompilację**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/email.ts
git commit -m "feat: sendOwnerWelcomeEmail — credentials + Stripe Connect link"
```

---

## Task 6: Stripe Connect callback routes

**Files:**
- Create: `src/app/api/connect/onboard/route.ts`
- Create: `src/app/api/connect/callback/route.ts`

- [ ] **Step 1: Utwórz katalog**

```bash
mkdir -p "src/app/api/connect/onboard" "src/app/api/connect/callback"
```

- [ ] **Step 2: Utwórz `src/app/api/connect/onboard/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { createOnboardingLink } from '@/lib/stripe-connect'

// GET /api/connect/onboard?slug=casa-sol
// Called from admin panel "Connect Stripe" button or from welcome email link
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug')
  if (!slug) {
    return NextResponse.json({ error: 'missing_slug' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data: site, error } = await supabase
    .from('sites')
    .select('stripe_account_id')
    .eq('slug', slug)
    .single()

  if (error || !site?.stripe_account_id) {
    return NextResponse.json({ error: 'site_not_found' }, { status: 404 })
  }

  try {
    const url = await createOnboardingLink(site.stripe_account_id, slug)
    return NextResponse.redirect(url)
  } catch (err) {
    console.error('[connect/onboard] error:', err)
    return NextResponse.json({ error: 'stripe_error' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Utwórz `src/app/api/connect/callback/route.ts`**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { isConnectAccountReady } from '@/lib/stripe-connect'

// GET /api/connect/callback?slug=casa-sol
// Stripe redirects here after owner completes Connect onboarding
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug')
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://nobooking.eu').trim().replace(/\/$/, '')

  if (!slug) {
    return NextResponse.redirect(`${siteUrl}`)
  }

  const supabase = createServiceClient()
  const { data: site } = await supabase
    .from('sites')
    .select('stripe_account_id')
    .eq('slug', slug)
    .single()

  if (site?.stripe_account_id) {
    try {
      const ready = await isConnectAccountReady(site.stripe_account_id)
      if (ready) {
        await supabase
          .from('sites')
          .update({ stripe_onboarded: true })
          .eq('slug', slug)
      }
    } catch (err) {
      console.error('[connect/callback] error:', err)
    }
  }

  // Redirect to admin panel
  return NextResponse.redirect(`${siteUrl}/sites/${slug}/admin?stripe_connected=1`)
}
```

- [ ] **Step 4: Sprawdź kompilację**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/connect/
git commit -m "feat: Stripe Connect onboard + callback routes"
```

---

## Task 7: Podpięcie provisionSite() do onboarding flow

**Files:**
- Modify: `src/app/api/onboarding/[token]/route.ts`

- [ ] **Step 1: Zaktualizuj POST handler**

W pliku `src/app/api/onboarding/[token]/route.ts` znajdź blok IIFE który generuje stronę (zaczyna się od `;(async () => {`) i zastąp go poniższym kodem:

```typescript
  // Generate site config + provision (non-blocking)
  const supabaseForUpdate = createServiceClient()
  ;(async () => {
    try {
      const updatedOrder = { ...order, ...Object.fromEntries(
        Object.entries(body).map(([k, v]) => [k, v ?? null])
      ) } as Order

      // 1. Generate AI config
      const config = await generateSiteConfig(updatedOrder)
      const slug = toSlug(order.apartment_name)
      const configJson = JSON.stringify(config)

      // 2. Update orders table
      await supabaseForUpdate
        .from('orders')
        .update({
          site_slug: slug,
          generated_config: configJson,
          site_generated_at: new Date().toISOString(),
        })
        .eq('id', order.id)

      // 3. Provision site (creates sites record + auth user + Stripe Connect)
      const { tempPassword, stripeAccountId } = await provisionSite(updatedOrder, slug, configJson)

      // 4. Generate Stripe Connect onboarding URL
      const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://nobooking.eu').trim().replace(/\/$/, '')
      let stripeOnboardUrl = `${siteUrl}/sites/${slug}/admin`
      if (stripeAccountId) {
        const { createOnboardingLink } = await import('@/lib/stripe-connect')
        stripeOnboardUrl = await createOnboardingLink(stripeAccountId, slug)
      }

      // 5. Send welcome email with credentials
      const { sendOwnerWelcomeEmail } = await import('@/lib/email')
      await sendOwnerWelcomeEmail({
        email: (updatedOrder.ob_contact_email ?? updatedOrder.email).toLowerCase().trim(),
        first_name: updatedOrder.first_name,
        apartment_name: updatedOrder.apartment_name,
        slug,
        temp_password: tempPassword,
        stripe_onboard_url: stripeOnboardUrl,
        plan: updatedOrder.plan,
      })

      // 6. Also send site-ready email with revision link
      await sendSiteReadyEmail(updatedOrder, slug, 0, 4)

    } catch (err) {
      console.error('[onboarding] provision error:', err)
    }
  })()
```

Na początku pliku dodaj import:

```typescript
import { provisionSite } from '@/lib/provision-site'
```

- [ ] **Step 2: Sprawdź kompilację**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/onboarding/
git commit -m "feat: wire provisionSite into onboarding flow — auto-creates auth user + Stripe Connect"
```

---

## Task 8: Deploy i test end-to-end

- [ ] **Step 1: Push do GitHub**

```bash
git push
```

- [ ] **Step 2: Poczekaj na Vercel deploy** (~2 min)

Wejdź na vercel.com i sprawdź czy build przeszedł.

- [ ] **Step 3: Uruchom SQL w Supabase** (jeśli jeszcze nie zrobione w Task 1)

SQL Editor → wklej `docs/supabase/booking_schema.sql` → Run.

- [ ] **Step 4: Test flow**

1. Wejdź na `nobooking.eu/zamow?plan=basic&currency=pln`
2. Wypełnij formularz testowymi danymi (twój email)
3. Przejdź przez Stripe (użyj karty testowej `4242 4242 4242 4242`)
4. Wejdź na `nobooking.eu/admin/zamowienia` → wyślij onboarding
5. Wypełnij formularz onboardingowy
6. Sprawdź czy dostałeś 2 emaile: welcome (z hasłem) + site-ready (z linkiem do poprawek)
7. Sprawdź Supabase → tabela `sites` — czy pojawił się rekord
8. Sprawdź Stripe Dashboard → Connect → Accounts — czy pojawił się nowy account

- [ ] **Step 5: Commit po weryfikacji**

```bash
git add -A
git commit -m "chore: Plan A complete — foundation, DB, Stripe Connect, provisioning"
```

---

## Gotowe — Plan A ukończony ✅

Po tym planie masz:
- Wszystkie tabele w Supabase
- Automatyczne tworzenie konta właściciela po onboardingu
- Stripe Connect Express per klient
- Welcome email z hasłem + linkiem do Stripe onboardingu

**Następny krok: Plan B** — system rezerwacji na /sites/[slug] (kalendarz, booking form, płatności, portal gościa, emaile).
