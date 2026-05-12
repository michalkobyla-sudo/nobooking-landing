# Multi-Tenant Booking System — Plan B: Reservations

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Podłączyć działający system rezerwacji do strony apartamentu — od wyboru dat przez formularz, płatność Stripe, po portal gościa i emaile potwierdzające.

**Architecture:** Istniejący `BookingForm` i `CalendarPricer` w `ApartmentPage.tsx` mają gotowe UI ale fake handlery — podłączamy je do prawdziwych API routes. Kalendarz pokazuje live dostępność z `bookings` + `blocked_dates`. Formularz tworzy booking record i redirectuje do Stripe Checkout. Webhook potwierdza płatność i wysyła emaile. Portal gościa `/sites/[slug]/guest/[bookingId]` działa przez UUID token.

**Tech Stack:** Next.js App Router, Supabase (service_role), Stripe Checkout, Brevo email, TypeScript, inline styles.

---

## Struktura plików

```
# NOWE
src/app/api/sites/[slug]/availability/route.ts   ← GET booked + blocked dates
src/app/api/sites/[slug]/book/route.ts           ← POST create booking + Stripe Checkout
src/app/api/sites/[slug]/discount/route.ts       ← POST validate discount code
src/app/sites/[slug]/guest/[bookingId]/page.tsx  ← guest portal (server component)

# MODYFIKOWANE
src/app/sites/[slug]/page.tsx                    ← read from sites table, pass siteId+slug
src/components/apartment/ApartmentPage.tsx       ← wire CalendarPricer + BookingForm to API
src/app/api/stripe/webhook/route.ts              ← add booking_id metadata handling
src/lib/email.ts                                 ← add sendBookingConfirmation + sendOwnerBookingNotification
```

---

## Task 1: Zaktualizuj `/sites/[slug]/page.tsx` — czytaj z tabeli `sites`

**Files:**
- Modify: `src/app/sites/[slug]/page.tsx`

Aktualnie strona czyta z tabeli `orders`. Musimy czytać z `sites` (tam jest `id`, `plan`, `stripe_account_id`, `config` jako obiekt JSONB, nie string).

- [ ] **Step 1: Zastąp cały plik**

```typescript
import { createServiceClient } from '@/lib/supabase'
import ApartmentPage from '@/components/apartment/ApartmentPage'
import type { ApartmentConfig } from '@/lib/apartmentTypes'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function SitePage({ params }: Props) {
  const { slug } = await params
  const supabase = createServiceClient()

  const { data: site } = await supabase
    .from('sites')
    .select('id, config, active')
    .eq('slug', slug)
    .eq('active', true)
    .single()

  if (!site?.config) {
    return (
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: '2rem',
        fontFamily: '-apple-system, sans-serif',
      }}>
        <div style={{ textAlign: 'center', maxWidth: '480px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🚧</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', marginBottom: '0.75rem' }}>
            Strona w przygotowaniu
          </h1>
          <p style={{ color: '#6B7280', fontSize: '0.9rem' }}>
            Ta strona apartamentu jest właśnie budowana. Wróć wkrótce!
          </p>
        </div>
      </div>
    )
  }

  const config = site.config as unknown as ApartmentConfig

  return (
    <ApartmentPage
      config={config}
      siteId={site.id as string}
      slug={slug}
      showDemoBanner={false}
    />
  )
}
```

- [ ] **Step 2: Sprawdź kompilację**

```bash
cd "/Users/michalkobylinski/Library/Mobile Documents/com~apple~CloudDocs/Projekty AI/Mieszkanie - Torrevieja/nobooking-landing"
npx tsc --noEmit 2>&1 | head -20
```

Oczekiwane: błąd `siteId` i `slug` nie istnieją jako props ApartmentPage — to normalne, naprawiamy w Task 2.

- [ ] **Step 3: Commit**

```bash
git add "src/app/sites/[slug]/page.tsx"
git commit -m "feat: sites page reads from sites table (not orders)"
```

---

## Task 2: Dodaj `siteId` i `slug` props do `ApartmentPage`

**Files:**
- Modify: `src/components/apartment/ApartmentPage.tsx`

Komponent `ApartmentPage` i jego pod-komponenty (`CalendarPricer`, `BookingForm`) muszą otrzymać `siteId` i `slug` żeby wywołać prawdziwe API.

- [ ] **Step 1: Zaktualizuj props `ApartmentPage` (linia ~954)**

Znajdź:
```typescript
export default function ApartmentPage({ config, showDemoBanner = false }: {
  config: ApartmentConfig
  showDemoBanner?: boolean
}) {
```

Zastąp:
```typescript
export default function ApartmentPage({ config, siteId = '', slug = '', showDemoBanner = false }: {
  config: ApartmentConfig
  siteId?: string
  slug?: string
  showDemoBanner?: boolean
}) {
```

- [ ] **Step 2: Przekaż `siteId` i `slug` do CalendarPricer i BookingForm**

Znajdź wywołanie `<CalendarPricer`:
```typescript
<CalendarPricer config={config} lang={lang} ui={ui} primary={primary} isMobile={isMobile} />
```
Zastąp:
```typescript
<CalendarPricer config={config} lang={lang} ui={ui} primary={primary} isMobile={isMobile} siteId={siteId} slug={slug} />
```

Znajdź wywołanie `<BookingForm`:
```typescript
<BookingForm config={config} lang={lang} ui={ui} primary={primary} isMobile={isMobile} />
```
Zastąp:
```typescript
<BookingForm config={config} lang={lang} ui={ui} primary={primary} isMobile={isMobile} siteId={siteId} slug={slug} />
```

- [ ] **Step 3: Zaktualizuj sygnatury `CalendarPricer` i `BookingForm`**

Znajdź:
```typescript
function CalendarPricer({ config, lang, ui, primary, isMobile }: {
  config: ApartmentConfig; lang: Lang; ui: typeof UI.pl; primary: string; isMobile: boolean
}) {
```
Zastąp:
```typescript
function CalendarPricer({ config, lang, ui, primary, isMobile, slug }: {
  config: ApartmentConfig; lang: Lang; ui: typeof UI.pl; primary: string; isMobile: boolean
  siteId: string; slug: string
}) {
```

Znajdź:
```typescript
function BookingForm({ config, lang, ui, primary, isMobile }: {
  config: ApartmentConfig; lang: Lang; ui: typeof UI.pl; primary: string; isMobile: boolean
}) {
```
Zastąp:
```typescript
function BookingForm({ config, lang, ui, primary, isMobile, slug }: {
  config: ApartmentConfig; lang: Lang; ui: typeof UI.pl; primary: string; isMobile: boolean
  siteId: string; slug: string
}) {
```

- [ ] **Step 4: Sprawdź kompilację**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Oczekiwane: brak błędów.

- [ ] **Step 5: Commit**

```bash
git add src/components/apartment/ApartmentPage.tsx
git commit -m "feat: thread siteId+slug props through ApartmentPage to CalendarPricer+BookingForm"
```

---

## Task 3: Availability API

**Files:**
- Create: `src/app/api/sites/[slug]/availability/route.ts`

Zwraca tablicę dat YYYY-MM-DD które są zajęte (rezerwacje + blokady ręczne). Kalendarz używa tego do kolorowania.

- [ ] **Step 1: Stwórz katalogi**

```bash
mkdir -p "/Users/michalkobylinski/Library/Mobile Documents/com~apple~CloudDocs/Projekty AI/Mieszkanie - Torrevieja/nobooking-landing/src/app/api/sites/[slug]/availability"
```

- [ ] **Step 2: Stwórz plik**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

interface Params { params: Promise<{ slug: string }> }

// Expand a check_in..check_out range into individual YYYY-MM-DD strings.
// check_out day is NOT included (guest departs that morning).
function expandRange(checkIn: string, checkOut: string): string[] {
  const dates: string[] = []
  const end = new Date(checkOut)
  for (const d = new Date(checkIn); d < end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10))
  }
  return dates
}

// GET /api/sites/[slug]/availability
// Returns { bookedDates: string[] } — all occupied YYYY-MM-DD strings.
export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params
  const supabase = createServiceClient()

  // Get site id
  const { data: site } = await supabase
    .from('sites')
    .select('id')
    .eq('slug', slug)
    .eq('active', true)
    .single()

  if (!site) {
    return NextResponse.json({ bookedDates: [] })
  }

  // Confirmed + pending bookings
  const { data: bookings } = await supabase
    .from('bookings')
    .select('check_in, check_out')
    .eq('site_id', site.id)
    .in('status', ['confirmed', 'pending'])

  // Manually blocked dates
  const { data: blocked } = await supabase
    .from('blocked_dates')
    .select('date')
    .eq('site_id', site.id)

  const bookedDates = new Set<string>()

  for (const b of bookings ?? []) {
    for (const d of expandRange(b.check_in as string, b.check_out as string)) {
      bookedDates.add(d)
    }
  }

  for (const b of blocked ?? []) {
    bookedDates.add(b.date as string)
  }

  return NextResponse.json(
    { bookedDates: Array.from(bookedDates) },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
```

- [ ] **Step 3: Sprawdź kompilację**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/sites/[slug]/availability"
git commit -m "feat: GET /api/sites/[slug]/availability — live booked dates"
```

---

## Task 4: Discount validation API

**Files:**
- Create: `src/app/api/sites/[slug]/discount/route.ts`

- [ ] **Step 1: Stwórz katalog i plik**

```bash
mkdir -p "/Users/michalkobylinski/Library/Mobile Documents/com~apple~CloudDocs/Projekty AI/Mieszkanie - Torrevieja/nobooking-landing/src/app/api/sites/[slug]/discount"
```

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

interface Params { params: Promise<{ slug: string }> }

// POST /api/sites/[slug]/discount
// Body: { code: string }
// Returns: { valid: boolean, discount_pct: number }
export async function POST(req: NextRequest, { params }: Params) {
  const { slug } = await params
  const { code } = await req.json() as { code?: string }

  if (!code?.trim()) {
    return NextResponse.json({ valid: false, discount_pct: 0 })
  }

  const supabase = createServiceClient()

  const { data: site } = await supabase
    .from('sites')
    .select('id, plan')
    .eq('slug', slug)
    .single()

  if (!site || site.plan !== 'pro') {
    return NextResponse.json({ valid: false, discount_pct: 0 })
  }

  const now = new Date().toISOString().slice(0, 10)

  const { data: dc } = await supabase
    .from('discount_codes')
    .select('id, discount_pct, max_uses, uses_count, valid_until, active')
    .eq('site_id', site.id)
    .eq('code', code.trim().toUpperCase())
    .eq('active', true)
    .single()

  if (!dc) return NextResponse.json({ valid: false, discount_pct: 0 })
  if (dc.valid_until && (dc.valid_until as string) < now) return NextResponse.json({ valid: false, discount_pct: 0 })
  if (dc.max_uses !== null && (dc.uses_count as number) >= (dc.max_uses as number)) return NextResponse.json({ valid: false, discount_pct: 0 })

  return NextResponse.json({ valid: true, discount_pct: dc.discount_pct as number })
}
```

- [ ] **Step 2: Sprawdź kompilację**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/sites/[slug]/discount"
git commit -m "feat: POST /api/sites/[slug]/discount — validate discount codes (Pro)"
```

---

## Task 5: Booking API — create booking + Stripe Checkout

**Files:**
- Create: `src/app/api/sites/[slug]/book/route.ts`

Najważniejszy endpoint. Waliduje daty, liczy cenę, tworzy rekord rezerwacji i zwraca URL Stripe Checkout.

- [ ] **Step 1: Stwórz katalog**

```bash
mkdir -p "/Users/michalkobylinski/Library/Mobile Documents/com~apple~CloudDocs/Projekty AI/Mieszkanie - Torrevieja/nobooking-landing/src/app/api/sites/[slug]/book"
```

- [ ] **Step 2: Stwórz plik**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { createBookingCheckout } from '@/lib/stripe-connect'
import type { ApartmentConfig } from '@/lib/apartmentTypes'

interface Params { params: Promise<{ slug: string }> }

// Determine season tier based on check_in month
function getTier(checkIn: string, config: ApartmentConfig): 'low' | 'mid' | 'high' {
  const month = new Date(checkIn).getMonth() + 1 // 1-12
  if ([7, 8, 9].includes(month)) return 'high'
  if ([5, 6, 10].includes(month)) return 'mid'
  return 'low'
}

function countNights(checkIn: string, checkOut: string): number {
  return Math.round(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
  )
}

function expandRange(checkIn: string, checkOut: string): string[] {
  const dates: string[] = []
  const end = new Date(checkOut)
  for (const d = new Date(checkIn); d < end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10))
  }
  return dates
}

// POST /api/sites/[slug]/book
// Body: { check_in, check_out, guests_count, guest_name, guest_email, guest_phone, notes?, discount_code? }
// Returns: { checkoutUrl: string }
export async function POST(req: NextRequest, { params }: Params) {
  const { slug } = await params
  const body = await req.json() as {
    check_in: string
    check_out: string
    guests_count: number
    guest_name: string
    guest_email: string
    guest_phone: string
    notes?: string
    discount_code?: string
  }

  const { check_in, check_out, guests_count, guest_name, guest_email, guest_phone, notes, discount_code } = body

  // ── Validate inputs ─────────────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10)
  if (!check_in || !check_out || check_in >= check_out || check_in < today) {
    return NextResponse.json({ error: 'invalid_dates' }, { status: 400 })
  }
  if (!guest_name?.trim() || !guest_email?.trim()) {
    return NextResponse.json({ error: 'missing_guest_info' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // ── Get site ─────────────────────────────────────────────────────────────────
  const { data: site } = await supabase
    .from('sites')
    .select('id, config, plan, stripe_account_id, stripe_onboarded')
    .eq('slug', slug)
    .eq('active', true)
    .single()

  if (!site) return NextResponse.json({ error: 'site_not_found' }, { status: 404 })

  const config = site.config as unknown as ApartmentConfig

  // ── Validate guests count ────────────────────────────────────────────────────
  if (guests_count < 1 || guests_count > config.specs.guests) {
    return NextResponse.json({ error: 'invalid_guests_count' }, { status: 400 })
  }

  // ── Check availability ────────────────────────────────────────────────────────
  const requestedDates = new Set(expandRange(check_in, check_out))

  const { data: conflicts } = await supabase
    .from('bookings')
    .select('check_in, check_out')
    .eq('site_id', site.id)
    .in('status', ['confirmed', 'pending'])
    .lt('check_in', check_out)
    .gt('check_out', check_in)

  if (conflicts && conflicts.length > 0) {
    return NextResponse.json({ error: 'dates_unavailable' }, { status: 409 })
  }

  const { data: blockedConflicts } = await supabase
    .from('blocked_dates')
    .select('date')
    .eq('site_id', site.id)
    .in('date', Array.from(requestedDates))

  if (blockedConflicts && blockedConflicts.length > 0) {
    return NextResponse.json({ error: 'dates_unavailable' }, { status: 409 })
  }

  // ── Calculate price ───────────────────────────────────────────────────────────
  const nights = countNights(check_in, check_out)
  const tier = getTier(check_in, config)
  const pricePerNight = config.pricing.tiers[tier].pricePerNight
  const minNights = config.pricing.tiers[tier].minNights

  if (nights < minNights) {
    return NextResponse.json({ error: 'min_nights', minNights }, { status: 400 })
  }

  let discountPct = 0
  if (discount_code?.trim() && site.plan === 'pro') {
    const now = new Date().toISOString().slice(0, 10)
    const { data: dc } = await supabase
      .from('discount_codes')
      .select('id, discount_pct, max_uses, uses_count, valid_until, active')
      .eq('site_id', site.id)
      .eq('code', discount_code.trim().toUpperCase())
      .eq('active', true)
      .single()

    if (
      dc &&
      (!dc.valid_until || (dc.valid_until as string) >= now) &&
      (dc.max_uses === null || (dc.uses_count as number) < (dc.max_uses as number))
    ) {
      discountPct = dc.discount_pct as number
    }
  }

  const baseAmount = nights * pricePerNight + config.pricing.cleaningFee
  const discountAmount = Math.round(baseAmount * discountPct / 100)
  const totalPrice = baseAmount - discountAmount
  const currency = config.pricing.currency.toLowerCase() // 'eur' or 'pln'
  const amountCents = Math.round(totalPrice * 100)

  // ── Create booking record ─────────────────────────────────────────────────────
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      site_id: site.id,
      guest_name: guest_name.trim(),
      guest_email: guest_email.trim().toLowerCase(),
      guest_phone: guest_phone?.trim() ?? '',
      check_in,
      check_out,
      nights,
      guests_count,
      total_price: totalPrice,
      currency: currency.toUpperCase(),
      status: 'pending',
      discount_code: discountPct > 0 ? discount_code!.trim().toUpperCase() : null,
      discount_pct: discountPct,
      notes: notes?.trim() ?? null,
    })
    .select('id, token')
    .single()

  if (bookingError || !booking) {
    console.error('[book] insert error:', bookingError)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  const bookingId = booking.id as string

  // ── Stripe Checkout ───────────────────────────────────────────────────────────
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://nobooking.eu').trim().replace(/\/$/, '')

  try {
    const hasConnect = !!site.stripe_account_id && site.stripe_onboarded === true
    const description = `${config.name} · ${check_in} – ${check_out} (${nights} nocy)`

    let checkoutUrl: string

    if (hasConnect) {
      checkoutUrl = await createBookingCheckout({
        accountId: site.stripe_account_id as string,
        amountCents,
        currency,
        bookingId,
        siteSlug: slug,
        guestEmail: guest_email.trim().toLowerCase(),
        description,
      })
    } else {
      // Platform takes payment directly (no Connect yet)
      const { createRequire } = await import('module')
      const _require = createRequire(import.meta.url)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const StripeLib = _require('stripe') as any
      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      const stripe = new StripeLib(
        (process.env.STRIPE_SECRET_KEY ?? '').trim(),
        { apiVersion: '2026-04-22.dahlia' }
      )
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        payment_method_types: ['card', 'blik', 'p24'],
        customer_email: guest_email.trim().toLowerCase(),
        line_items: [{ price_data: { currency, unit_amount: amountCents, product_data: { name: description } }, quantity: 1 }],
        success_url: `${siteUrl}/sites/${slug}/guest/${bookingId}?paid=1`,
        cancel_url: `${siteUrl}/sites/${slug}?cancelled=1`,
        metadata: { booking_id: bookingId, site_slug: slug },
      })
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      checkoutUrl = session.url as string
    }

    return NextResponse.json({ checkoutUrl })

  } catch (err) {
    console.error('[book] stripe error:', err)
    // Clean up pending booking on Stripe error
    await supabase.from('bookings').delete().eq('id', bookingId)
    return NextResponse.json({ error: 'payment_error' }, { status: 500 })
  }
}
```

- [ ] **Step 3: Sprawdź kompilację**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/sites/[slug]/book"
git commit -m "feat: POST /api/sites/[slug]/book — create booking + Stripe Checkout"
```

---

## Task 6: Rozszerz Stripe webhook o obsługę rezerwacji

**Files:**
- Modify: `src/app/api/stripe/webhook/route.ts`

Aktualnie webhook obsługuje płatności za zamówienia nobooking. Dodajemy obsługę rezerwacji gości (metadata ma `booking_id`).

- [ ] **Step 1: Sprawdź aktualny koniec pliku**

```bash
cat -n "/Users/michalkobylinski/Library/Mobile Documents/com~apple~CloudDocs/Projekty AI/Mieszkanie - Torrevieja/nobooking-landing/src/app/api/stripe/webhook/route.ts"
```

- [ ] **Step 2: Dodaj booking handling**

Znajdź blok `if (orderId) {` i po jego zamknięciu `}` dodaj:

```typescript
    // ── Booking payment ────────────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const bookingId = session.metadata?.booking_id as string | undefined
    if (bookingId) {
      const supabase = createServiceClient()

      const { data: booking } = await supabase
        .from('bookings')
        .select('id, guest_email, guest_name, site_id, check_in, check_out, total_price, currency, discount_code')
        .eq('id', bookingId)
        .single()

      if (booking) {
        await supabase
          .from('bookings')
          .update({
            stripe_paid: true,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            stripe_session_id: session.id as string,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            stripe_payment_id: session.payment_intent as string | null,
            status: 'confirmed',
          })
          .eq('id', bookingId)

        // Increment discount code usage if applicable
        if (booking.discount_code) {
          await supabase.rpc('increment_discount_usage', {
            p_site_id: booking.site_id,
            p_code: booking.discount_code,
          }).catch(() => { /* ignore if RPC not set up */ })
        }

        // Send confirmation emails
        try {
          const { sendBookingConfirmation, sendOwnerBookingNotification } = await import('@/lib/email')
          await sendBookingConfirmation(booking as Parameters<typeof sendBookingConfirmation>[0])
          await sendOwnerBookingNotification(booking as Parameters<typeof sendOwnerBookingNotification>[0])
        } catch (emailErr) {
          console.error('[webhook] booking email error:', emailErr)
        }
      }
    }
```

- [ ] **Step 3: Sprawdź kompilację**

```bash
npx tsc --noEmit 2>&1 | head -30
```

TypeScript będzie narzekał na typy `booking` — to naprawimy po dodaniu email functions w Task 7.

- [ ] **Step 4: Commit po Task 7**

Commit razem z Task 7.

---

## Task 7: Emaile potwierdzające rezerwację

**Files:**
- Modify: `src/lib/email.ts`

- [ ] **Step 1: Dodaj typy i funkcje na końcu `src/lib/email.ts`**

```typescript
// ─── Booking types for emails ─────────────────────────────────────────────────

export interface BookingEmailData {
  id: string
  guest_name: string
  guest_email: string
  site_id: string
  check_in: string     // YYYY-MM-DD
  check_out: string    // YYYY-MM-DD
  total_price: number
  currency: string
  discount_code: string | null
}

/** Email: Guest booking confirmation */
export async function sendBookingConfirmation(booking: BookingEmailData) {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://nobooking.eu').trim().replace(/\/$/, '')
  const guestPortalUrl = `${siteUrl}/sites/SLUG/guest/${booking.id}`
  // Note: slug not available here — guest portal uses bookingId directly

  const nights = Math.round(
    (new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) / (1000 * 60 * 60 * 24)
  )

  await sendEmail(
    booking.guest_email,
    `✅ Rezerwacja potwierdzona — ${formatDate(booking.check_in)} → ${formatDate(booking.check_out)}`,
    wrapEmail(`
      ${renderHeader('Rezerwacja potwierdzona!')}
      <div style="padding: 2rem;">
        <p style="font-size: 1rem; margin: 0 0 1rem;">Cześć <strong>${escapeHtml(booking.guest_name)}</strong>! 🎉</p>
        <p style="color: #374151; margin: 0 0 1.5rem; line-height: 1.7;">
          Twoja rezerwacja została potwierdzona. Płatność przyjęta — czekamy na Ciebie!
        </p>

        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 1.25rem 1.5rem; margin-bottom: 1.5rem;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 0.35rem 0; font-size: 0.85rem; color: #6b7280; width: 40%;">📅 Przyjazd</td>
              <td style="padding: 0.35rem 0; font-size: 0.85rem; font-weight: 700;">${formatDate(booking.check_in)}</td>
            </tr>
            <tr>
              <td style="padding: 0.35rem 0; font-size: 0.85rem; color: #6b7280;">📅 Wyjazd</td>
              <td style="padding: 0.35rem 0; font-size: 0.85rem; font-weight: 700;">${formatDate(booking.check_out)}</td>
            </tr>
            <tr>
              <td style="padding: 0.35rem 0; font-size: 0.85rem; color: #6b7280;">🌙 Liczba nocy</td>
              <td style="padding: 0.35rem 0; font-size: 0.85rem; font-weight: 700;">${nights}</td>
            </tr>
            <tr>
              <td style="padding: 0.35rem 0; font-size: 0.85rem; color: #6b7280;">💳 Kwota</td>
              <td style="padding: 0.35rem 0; font-size: 0.85rem; font-weight: 700; color: #059669;">${booking.total_price} ${booking.currency}</td>
            </tr>
            ${booking.discount_code ? `
            <tr>
              <td style="padding: 0.35rem 0; font-size: 0.85rem; color: #6b7280;">🏷️ Kod rabatowy</td>
              <td style="padding: 0.35rem 0; font-size: 0.85rem; font-weight: 700;">${escapeHtml(booking.discount_code)}</td>
            </tr>
            ` : ''}
          </table>
        </div>

        <p style="color: #374151; font-size: 0.875rem; line-height: 1.7; margin-bottom: 1.5rem;">
          Szczegóły rezerwacji, instrukcje dojazdu i kody dostępu znajdziesz w portalu gościa.
          Link wyślemy osobno przed przyjazdem.
        </p>

        <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 2rem 0;" />
        <p style="color: #374151; margin: 0; font-size: 0.875rem; line-height: 1.7;">
          Do zobaczenia! 🏖️<br/>
          <strong>Nobooking</strong>
        </p>
      </div>
      ${renderFooter()}
    `)
  )
}

/** Email: Owner notification about new booking */
export async function sendOwnerBookingNotification(booking: BookingEmailData) {
  const nights = Math.round(
    (new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) / (1000 * 60 * 60 * 24)
  )

  // Get owner email from sites table
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const res = await fetch(`${supabaseUrl}/rest/v1/sites?id=eq.${booking.site_id}&select=owner_email`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
  })
  const sites = await res.json() as Array<{ owner_email: string }>
  const ownerEmail = sites[0]?.owner_email
  if (!ownerEmail) return

  await sendEmail(
    ownerEmail,
    `🎉 Nowa rezerwacja! ${escapeHtml(booking.guest_name)} · ${formatDate(booking.check_in)} → ${formatDate(booking.check_out)}`,
    wrapEmail(`
      ${renderHeader('Nowa rezerwacja!')}
      <div style="padding: 2rem;">
        <p style="font-size: 1rem; margin: 0 0 1.5rem;">Masz nową potwierdzoną rezerwację! 🎉</p>

        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 1.25rem 1.5rem; margin-bottom: 1.5rem;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 0.35rem 0; font-size: 0.85rem; color: #6b7280; width: 40%;">👤 Gość</td>
              <td style="padding: 0.35rem 0; font-size: 0.85rem; font-weight: 700;">${escapeHtml(booking.guest_name)}</td>
            </tr>
            <tr>
              <td style="padding: 0.35rem 0; font-size: 0.85rem; color: #6b7280;">✉️ Email</td>
              <td style="padding: 0.35rem 0; font-size: 0.85rem;">${escapeHtml(booking.guest_email)}</td>
            </tr>
            <tr>
              <td style="padding: 0.35rem 0; font-size: 0.85rem; color: #6b7280;">📅 Przyjazd</td>
              <td style="padding: 0.35rem 0; font-size: 0.85rem; font-weight: 700;">${formatDate(booking.check_in)}</td>
            </tr>
            <tr>
              <td style="padding: 0.35rem 0; font-size: 0.85rem; color: #6b7280;">📅 Wyjazd</td>
              <td style="padding: 0.35rem 0; font-size: 0.85rem; font-weight: 700;">${formatDate(booking.check_out)}</td>
            </tr>
            <tr>
              <td style="padding: 0.35rem 0; font-size: 0.85rem; color: #6b7280;">🌙 Noce</td>
              <td style="padding: 0.35rem 0; font-size: 0.85rem; font-weight: 700;">${nights}</td>
            </tr>
            <tr>
              <td style="padding: 0.35rem 0; font-size: 0.85rem; color: #6b7280;">💳 Kwota</td>
              <td style="padding: 0.35rem 0; font-size: 0.85rem; font-weight: 700; color: #059669;">${booking.total_price} ${booking.currency}</td>
            </tr>
          </table>
        </div>

        <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 2rem 0;" />
        <p style="color: #374151; margin: 0; font-size: 0.875rem;">
          <strong>Nobooking</strong>
        </p>
      </div>
      ${renderFooter()}
    `)
  )
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })
}
```

- [ ] **Step 2: Sprawdź kompilację**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit (razem z webhook z Task 6)**

```bash
git add src/lib/email.ts "src/app/api/stripe/webhook/route.ts"
git commit -m "feat: booking confirmation emails + extend Stripe webhook for bookings"
```

---

## Task 8: Podłącz CalendarPricer do live availability API

**Files:**
- Modify: `src/components/apartment/ApartmentPage.tsx` (funkcja `CalendarPricer`)

CalendarPricer już ma UI — tylko zamień statyczny `config.bookedDates` na dane z API.

- [ ] **Step 1: Zaktualizuj `CalendarPricer`**

Znajdź w `CalendarPricer` linię:
```typescript
  const bookedSet = new Set(config.bookedDates)
```

Zastąp całą funkcję `CalendarPricer` (od `function CalendarPricer` do zamykającego `}` przed `// ─── Reviews`) poniższym kodem:

```typescript
function CalendarPricer({ config, lang, ui, primary, isMobile, slug }: {
  config: ApartmentConfig; lang: Lang; ui: typeof UI.pl; primary: string; isMobile: boolean
  siteId: string; slug: string
}) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [nights, setNights] = useState(7)
  const [season, setSeason] = useState<'low' | 'mid' | 'high'>('high')
  const [liveBookedDates, setLiveBookedDates] = useState<string[]>(config.bookedDates)

  // Fetch live availability
  useState(() => {
    if (!slug) return
    fetch(`/api/sites/${slug}/availability`)
      .then(r => r.json())
      .then((data: { bookedDates: string[] }) => {
        if (data.bookedDates) setLiveBookedDates(data.bookedDates)
      })
      .catch(() => { /* fallback to config.bookedDates */ })
  })

  const bookedSet = new Set(liveBookedDates)
  const tier = config.pricing.tiers[season]
  const total = nights * tier.pricePerNight + config.pricing.cleaningFee
  const curr = config.pricing.currency

  function isBooked(d: number) {
    const str = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    return bookedSet.has(str)
  }

  const firstDay = new Date(year, month, 1).getDay()
  const startOffset = firstDay === 0 ? 6 : firstDay - 1
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  function prevMonth() { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  function nextMonth() { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }

  return (
    <section id="kalendarz" style={{ padding: isMobile ? '3rem 1.25rem' : '6rem 1.5rem', background: '#F8F5EF' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <Overline color={primary}>{ui.calTitle}</Overline>
        <h2 style={{ fontSize: isMobile ? '1.6rem' : '2.2rem', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: isMobile ? '1.5rem' : '2.5rem', lineHeight: 1.1 }}>{ui.pricerTitle}</h2>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '1rem' : '2rem', alignItems: 'start' }}>
          {/* Calendar */}
          <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 16, padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <button onClick={prevMonth} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#374151', padding: '0.2rem 0.5rem' }}>‹</button>
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{ui.months[month]} {year}</span>
              <button onClick={nextMonth} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#374151', padding: '0.2rem 0.5rem' }}>›</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
              {ui.days.map(d => <div key={d} style={{ textAlign: 'center', fontSize: '0.62rem', fontWeight: 700, color: '#9CA3AF', padding: '0.2rem 0' }}>{d}</div>)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
              {Array.from({ length: startOffset }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const booked = isBooked(day)
                const isPast = new Date(year, month, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate())
                return (
                  <div key={day} style={{ textAlign: 'center', padding: '0.4rem 0', fontSize: '0.8rem', fontWeight: 600, borderRadius: 6, background: booked ? '#FEE2E2' : isPast ? '#F9FAFB' : '#F0FDF4', color: booked ? '#DC2626' : isPast ? '#D1D5DB' : '#15803D', textDecoration: booked ? 'line-through' : 'none' }}>{day}</div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: '#6B7280' }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: '#F0FDF4', border: '1px solid #BBF7D0', display: 'inline-block' }} /> {ui.calFree}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: '#6B7280' }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: '#FEE2E2', border: '1px solid #FECACA', display: 'inline-block' }} /> {ui.calBooked}
              </span>
            </div>
          </div>

          {/* Price calculator */}
          <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 16, padding: '1.5rem' }}>
            <h3 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '1.25rem' }}>{ui.pricerTitle}</h3>
            <div style={{ marginBottom: '1.125rem' }}>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{ui.pricerSeason}</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {(['low', 'mid', 'high'] as const).map(s => {
                  const tier2 = config.pricing.tiers[s]
                  return (
                    <label key={s} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: season === s ? '#EFF6FF' : '#F9FAFB', border: `1.5px solid ${season === s ? primary : '#E5E7EB'}`, borderRadius: 8, padding: '0.5rem 0.75rem', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <input type="radio" name="season" value={s} checked={season === s} onChange={() => setSeason(s)} style={{ accentColor: primary }} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t(tier2.label, lang)}</span>
                        <span style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>{tier2.months}</span>
                      </div>
                      <span style={{ fontWeight: 800, color: primary, fontSize: '0.9rem' }}>{tier2.pricePerNight} {curr}<span style={{ fontSize: '0.7rem', fontWeight: 500, color: '#9CA3AF' }}>{ui.pricerPerNight}</span></span>
                    </label>
                  )
                })}
              </div>
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{ui.pricerNights}</label>
                <span style={{ fontWeight: 800, fontSize: '1rem', color: primary }}>{nights}</span>
              </div>
              <input type="range" min={tier.minNights} max={28} value={nights} onChange={e => setNights(+e.target.value)} style={{ width: '100%', accentColor: primary }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#9CA3AF', marginTop: '0.2rem' }}>
                <span>{ui.pricerMin} {tier.minNights}</span><span>28</span>
              </div>
            </div>
            <div style={{ background: '#F9FAFB', borderRadius: 10, padding: '0.875rem', marginBottom: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.85rem' }}>
                <span style={{ color: '#6B7280' }}>{nights} × {tier.pricePerNight} {curr}</span>
                <span>{nights * tier.pricePerNight} {curr}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.85rem' }}>
                <span style={{ color: '#6B7280' }}>{ui.pricerCleaning}</span>
                <span>{config.pricing.cleaningFee} {curr}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E5E7EB', paddingTop: '0.4rem', fontWeight: 800, fontSize: '1rem' }}>
                <span>{ui.pricerTotal}</span>
                <span style={{ color: primary }}>{total} {curr}</span>
              </div>
            </div>
            <a href="#kontakt" style={{ display: 'block', textAlign: 'center', background: primary, color: 'white', padding: '0.825rem', borderRadius: 10, fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none' }}>
              {ui.pricerBook}
            </a>
            <div style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.72rem', color: '#9CA3AF' }}>🔒 {ui.stripeNote}</div>
          </div>
        </div>
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Sprawdź kompilację**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/components/apartment/ApartmentPage.tsx
git commit -m "feat: CalendarPricer fetches live availability from API"
```

---

## Task 9: Podłącz BookingForm do prawdziwego API

**Files:**
- Modify: `src/components/apartment/ApartmentPage.tsx` (funkcja `BookingForm`)

Zastępujemy fake `handleSubmit` + fake `checkDiscount` prawdziwymi wywołaniami API.

- [ ] **Step 1: Zastąp funkcję `BookingForm`**

Znajdź `function BookingForm(` i zastąp całą funkcję (do zamykającego `}` przed `// ─── Footer`):

```typescript
function BookingForm({ config, lang, ui, primary, isMobile, slug }: {
  config: ApartmentConfig; lang: Lang; ui: typeof UI.pl; primary: string; isMobile: boolean
  siteId: string; slug: string
}) {
  void lang
  const [form, setForm] = useState({ arrival: '', departure: '', guests: '2', name: '', email: '', phone: '', message: '', discount: '' })
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [discountValid, setDiscountValid] = useState<boolean | null>(null)
  const [discountPct, setDiscountPct] = useState(0)
  const [checkingDiscount, setCheckingDiscount] = useState(false)

  function set(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm(f => ({ ...f, [k]: e.target.value }))
      if (k === 'discount') { setDiscountValid(null); setDiscountPct(0) }
    }
  }

  // Calculate estimated price for display
  function calcPrice() {
    if (!form.arrival || !form.departure) return null
    const nights = Math.round((new Date(form.departure).getTime() - new Date(form.arrival).getTime()) / (1000 * 60 * 60 * 24))
    if (nights <= 0) return null
    const month = new Date(form.arrival).getMonth() + 1
    const tier = [7,8,9].includes(month) ? 'high' : [5,6,10].includes(month) ? 'mid' : 'low'
    const pricePerNight = config.pricing.tiers[tier].pricePerNight
    const base = nights * pricePerNight + config.pricing.cleaningFee
    const discount = Math.round(base * discountPct / 100)
    return { nights, total: base - discount, currency: config.pricing.currency, discount }
  }

  async function checkDiscount() {
    if (!form.discount.trim() || !slug) return
    setCheckingDiscount(true)
    try {
      const res = await fetch(`/api/sites/${slug}/discount`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: form.discount }),
      })
      const data = await res.json() as { valid: boolean; discount_pct: number }
      setDiscountValid(data.valid)
      setDiscountPct(data.valid ? data.discount_pct : 0)
    } catch {
      setDiscountValid(false)
    } finally {
      setCheckingDiscount(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!slug) return
    setSending(true)
    setError(null)

    try {
      const res = await fetch(`/api/sites/${slug}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          check_in: form.arrival,
          check_out: form.departure,
          guests_count: parseInt(form.guests),
          guest_name: form.name,
          guest_email: form.email,
          guest_phone: form.phone,
          notes: form.message || undefined,
          discount_code: discountValid && form.discount ? form.discount : undefined,
        }),
      })
      const data = await res.json() as { checkoutUrl?: string; error?: string; minNights?: number }

      if (!res.ok) {
        const msgs: Record<string, string> = {
          invalid_dates: 'Nieprawidłowe daty. Sprawdź czy data wyjazdu jest późniejsza niż przyjazdu.',
          dates_unavailable: 'Niestety wybrane daty są już zajęte. Wybierz inne terminy.',
          min_nights: `Minimalny pobyt w tym sezonie to ${data.minNights ?? '?'} noce.`,
          missing_guest_info: 'Uzupełnij imię i email.',
          payment_error: 'Błąd płatności. Spróbuj ponownie.',
        }
        setError(msgs[data.error ?? ''] ?? 'Coś poszło nie tak. Spróbuj ponownie.')
        return
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else {
        setSent(true)
      }
    } catch {
      setError('Błąd połączenia. Sprawdź internet i spróbuj ponownie.')
    } finally {
      setSending(false)
    }
  }

  const pricePreview = calcPrice()

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #D1D5DB',
    borderRadius: 10, fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none',
    boxSizing: 'border-box', background: 'white', height: '48px',
    WebkitAppearance: 'none', appearance: 'none',
  }

  return (
    <section id="kontakt" style={{ padding: isMobile ? '3rem 1.25rem' : '6rem 1.5rem', background: 'white' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <Overline color={primary}>{ui.bookOverline}</Overline>
        <h2 style={{ fontSize: isMobile ? '1.6rem' : '2.2rem', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: '0.5rem', lineHeight: 1.1 }}>{ui.bookTitle}</h2>
        <p style={{ color: '#6B7280', fontSize: '0.875rem', marginBottom: '2rem' }}>
          ✉️ {ui.bookSuccessNote}
        </p>

        <div style={{ marginBottom: '1.5rem' }}>
          <CheckInBanner ui={ui} primary={primary} isMobile={isMobile} />
        </div>

        {sent ? (
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 16, padding: '2.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>✅</div>
            <div style={{ fontWeight: 700, fontSize: '1.2rem', color: '#15803D', marginBottom: '0.5rem' }}>{ui.bookSuccess}</div>
            <div style={{ color: '#6B7280', fontSize: '0.875rem' }}>{ui.bookSuccessNote}</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ background: '#FAFAFA', border: '1px solid #E5E7EB', borderRadius: 20, padding: isMobile ? '1.5rem' : '2.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0.875rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>{ui.bookArrival}</label>
                <input type="date" value={form.arrival} onChange={set('arrival')} style={inputStyle} required min={new Date().toISOString().slice(0,10)} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>{ui.bookDeparture}</label>
                <input type="date" value={form.departure} onChange={set('departure')} style={inputStyle} required min={form.arrival || new Date().toISOString().slice(0,10)} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>{ui.bookGuests}</label>
              <select value={form.guests} onChange={set('guests')} style={inputStyle}>
                {Array.from({ length: config.specs.guests }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>{ui.bookName}</label>
              <input type="text" value={form.name} onChange={set('name')} style={inputStyle} required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0.875rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>{ui.bookEmail}</label>
                <input type="email" value={form.email} onChange={set('email')} style={inputStyle} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>{ui.bookPhone}</label>
                <input type="tel" value={form.phone} onChange={set('phone')} style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>{ui.bookMsg}</label>
              <textarea value={form.message} onChange={set('message')} rows={3} style={{ ...inputStyle, height: 'auto', resize: 'vertical' }} />
            </div>

            {/* Discount code (Pro only — hidden for basic) */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>🏷️ {ui.bookDiscount}</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="text" value={form.discount} onChange={set('discount')} placeholder="np. WIOSNA10" style={{ ...inputStyle, flex: 1, textTransform: 'uppercase', borderColor: discountValid === true ? '#16A34A' : discountValid === false ? '#DC2626' : '#D1D5DB' }} />
                <button type="button" onClick={checkDiscount} disabled={checkingDiscount} style={{ background: '#F3F4F6', border: '1.5px solid #D1D5DB', borderRadius: 10, padding: '0 1rem', fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', color: '#374151', whiteSpace: 'nowrap' }}>
                  {checkingDiscount ? '...' : 'Sprawdź'}
                </button>
              </div>
              {discountValid === true && <p style={{ fontSize: '0.78rem', color: '#16A34A', marginTop: '0.3rem' }}>✓ Kod aktywny — {discountPct}% zniżki</p>}
              {discountValid === false && <p style={{ fontSize: '0.78rem', color: '#DC2626', marginTop: '0.3rem' }}>✗ Nieprawidłowy kod rabatowy</p>}
            </div>

            {/* Live price preview */}
            {pricePreview && (
              <div style={{ background: '#EFF6FF', border: '1.5px solid #BFDBFE', borderRadius: 12, padding: '1rem 1.25rem' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1D4ED8', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Szacunkowy koszt</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#374151', marginBottom: '0.2rem' }}>
                  <span>{pricePreview.nights} nocy + sprzątanie</span>
                  {pricePreview.discount > 0 && <span style={{ color: '#16A34A' }}>-{pricePreview.discount} {pricePreview.currency}</span>}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '1.1rem' }}>
                  <span>Łącznie</span>
                  <span style={{ color: primary }}>{pricePreview.total} {pricePreview.currency}</span>
                </div>
              </div>
            )}

            {error && (
              <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '0.875rem 1rem', fontSize: '0.875rem', color: '#DC2626' }}>
                ⚠️ {error}
              </div>
            )}

            <button type="submit" disabled={sending} style={{ background: primary, color: 'white', border: 'none', borderRadius: 12, padding: '0.95rem', fontSize: '1rem', fontWeight: 800, cursor: sending ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: sending ? 0.75 : 1, marginTop: '0.25rem' }}>
              {sending ? '⏳ Przekierowanie do płatności...' : `💳 ${ui.bookSubmit}`}
            </button>

            <div style={{ textAlign: 'center', fontSize: '0.72rem', color: '#9CA3AF' }}>🔒 {ui.stripeNote}</div>
          </form>
        )}
      </div>
    </section>
  )
}
```

- [ ] **Step 2: Sprawdź kompilację**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/components/apartment/ApartmentPage.tsx
git commit -m "feat: BookingForm wired to real booking API + Stripe redirect"
```

---

## Task 10: Portal gościa

**Files:**
- Create: `src/app/sites/[slug]/guest/[bookingId]/page.tsx`

Strona dostępna po opłaconej rezerwacji — szczegóły pobytu, instrukcje, status.

- [ ] **Step 1: Stwórz katalogi**

```bash
mkdir -p "/Users/michalkobylinski/Library/Mobile Documents/com~apple~CloudDocs/Projekty AI/Mieszkanie - Torrevieja/nobooking-landing/src/app/sites/[slug]/guest/[bookingId]"
```

- [ ] **Step 2: Stwórz plik**

```typescript
import { createServiceClient } from '@/lib/supabase'
import type { ApartmentConfig } from '@/lib/apartmentTypes'

interface Props {
  params: Promise<{ slug: string; bookingId: string }>
  searchParams: Promise<{ paid?: string }>
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function GuestPortalPage({ params, searchParams }: Props) {
  const { slug, bookingId } = await params
  const { paid } = await searchParams
  const supabase = createServiceClient()

  const { data: booking } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single()

  const { data: site } = await supabase
    .from('sites')
    .select('config, slug')
    .eq('slug', slug)
    .single()

  if (!booking || !site) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827' }}>Rezerwacja nie znaleziona</h1>
        </div>
      </div>
    )
  }

  const config = site.config as unknown as ApartmentConfig
  const primary = config.theme?.primary ?? '#1A5276'
  const nights = Math.round(
    (new Date(booking.check_out as string).getTime() - new Date(booking.check_in as string).getTime()) / (1000 * 60 * 60 * 24)
  )
  const isPaid = booking.stripe_paid === true
  const justPaid = paid === '1'

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Header */}
      <div style={{ background: primary, color: 'white', padding: '1.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8, marginBottom: '0.35rem' }}>Portal gościa</div>
        <div style={{ fontSize: '1.4rem', fontWeight: 900 }}>{config.name}</div>
        <div style={{ fontSize: '0.85rem', opacity: 0.85, marginTop: '0.25rem' }}>📍 {config.location}</div>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '2rem 1.25rem' }}>

        {/* Just paid banner */}
        {justPaid && isPaid && (
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 16, padding: '1.5rem', textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎉</div>
            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#15803D', marginBottom: '0.25rem' }}>Rezerwacja potwierdzona!</div>
            <div style={{ color: '#374151', fontSize: '0.875rem' }}>Email z potwierdzeniem został wysłany na {booking.guest_email as string}</div>
          </div>
        )}

        {/* Booking details */}
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', padding: '1.5rem', marginBottom: '1rem' }}>
          <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '1rem', color: '#111827' }}>📋 Szczegóły rezerwacji</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            {[
              ['👤 Gość', booking.guest_name as string],
              ['📅 Przyjazd', formatDate(booking.check_in as string)],
              ['📅 Wyjazd', formatDate(booking.check_out as string)],
              ['🌙 Liczba nocy', `${nights}`],
              ['👥 Osoby', `${booking.guests_count as number}`],
              ['💳 Kwota', `${booking.total_price as number} ${booking.currency as string}`],
              ['📌 Status', isPaid ? '✅ Opłacona' : '⏳ Oczekuje na płatność'],
            ].map(([label, value]) => (
              <tr key={label} style={{ borderBottom: '1px solid #F3F4F6' }}>
                <td style={{ padding: '0.6rem 0', fontSize: '0.85rem', color: '#6B7280', width: '45%' }}>{label}</td>
                <td style={{ padding: '0.6rem 0', fontSize: '0.85rem', fontWeight: 600, color: '#111827' }}>{value}</td>
              </tr>
            ))}
          </table>
        </div>

        {/* Contact */}
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', padding: '1.5rem', marginBottom: '1rem' }}>
          <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '1rem', color: '#111827' }}>📞 Kontakt z właścicielem</div>
          <div style={{ fontSize: '0.875rem', color: '#374151', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {config.contact.email && (
              <a href={`mailto:${config.contact.email}`} style={{ color: primary, fontWeight: 600 }}>✉️ {config.contact.email}</a>
            )}
            {config.contact.phone && (
              <a href={`tel:${config.contact.phone}`} style={{ color: primary, fontWeight: 600 }}>📱 {config.contact.phone}</a>
            )}
          </div>
        </div>

        {/* Address */}
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', padding: '1.5rem' }}>
          <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '0.75rem', color: '#111827' }}>📍 Adres</div>
          <div style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '1rem' }}>{config.address}</div>
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(config.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-block', background: primary, color: 'white', padding: '0.6rem 1.25rem', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none' }}
          >
            Otwórz w Google Maps →
          </a>
        </div>

      </div>
    </div>
  )
}
```

- [ ] **Step 3: Sprawdź kompilację**

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] **Step 4: Commit**

```bash
git add "src/app/sites/[slug]/guest"
git commit -m "feat: guest portal /sites/[slug]/guest/[bookingId]"
```

---

## Task 11: Push, deploy i test end-to-end

- [ ] **Step 1: Push**

```bash
git push
```

- [ ] **Step 2: Poczekaj na Vercel build** (~2 min)

- [ ] **Step 3: Test flow**

1. Wejdź na `nobooking.eu/sites/apart-sunny`
2. Sprawdź czy kalendarz ładuje się (zielone dni = wolne)
3. Wypełnij formularz rezerwacji:
   - Data przyjazdu: za 30 dni
   - Data wyjazdu: za 37 dni (7 nocy)
   - Twoje dane kontaktowe
4. Kliknij "Zarezerwuj" — powinno przekierować do Stripe Checkout
5. Zapłać kartą testową `4242 4242 4242 4242` exp `12/34` CVC `123`
6. Sprawdź redirect na `/sites/apart-sunny/guest/[bookingId]?paid=1`
7. Sprawdź inbox — email potwierdzający do gościa
8. Sprawdź Supabase → tabela `bookings` — rekord ze `status=confirmed`, `stripe_paid=true`

**Uwaga:** Stripe Checkout użyje trybu live (sk_live). Żeby testować bez prawdziwej płatności, tymczasowo zmień `STRIPE_SECRET_KEY` w Vercel na klucz testowy `sk_test_...` i użyj karty `4242 4242 4242 4242`.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: Plan B complete — booking system live"
```

---

## Gotowe — Plan B ukończony ✅

Po tym planie:
- Kalendarz pokazuje live dostępność
- Formularz tworzy rezerwację i kieruje do Stripe
- Webhook potwierdza płatność i wysyła emaile
- Portal gościa pokazuje szczegóły rezerwacji

**Następny: Plan C** — panel admina `/sites/[slug]/admin`
