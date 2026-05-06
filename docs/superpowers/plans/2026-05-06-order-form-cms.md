# Order Form + Admin CMS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a pre-checkout order form at `/zamow`, store orders in Supabase, build a protected `/admin` CMS for managing orders and sending onboarding forms to clients.

**Architecture:** Next.js 15 App Router, all-in-one repo. `/api/orders` creates DB record + Stripe session atomically. Admin pages are `'use client'` components that call `/api/admin/*` routes. Middleware protects `/admin/*` and `/api/admin/*` using `@supabase/ssr` cookie session.

**Tech Stack:** Next.js 15, TypeScript, Supabase (PostgreSQL + Auth), `@supabase/ssr`, Resend (already installed), TailwindCSS → inline styles

---

## File Map

**New files:**
- `src/lib/types.ts` — Order interface, OrderStatus type
- `src/lib/supabase.ts` — createServiceClient(), createBrowserClient(), requireAdmin()
- `src/lib/prices.ts` — PRICES and PLAN_NAMES constants (shared)
- `src/lib/email.ts` — 3 Resend email template functions
- `src/middleware.ts` — protect /admin/* and /api/admin/*
- `src/app/zamow/page.tsx` — Server Component reading searchParams
- `src/components/OrderForm.tsx` — 'use client' form with all sections
- `src/app/api/orders/route.ts` — POST: validate → Supabase insert → Stripe → return stripe_url
- `src/app/onboarding/[token]/page.tsx` — Server Component verifying token
- `src/components/OnboardingForm.tsx` — 'use client' onboarding form
- `src/app/api/onboarding/[token]/route.ts` — GET check + POST save
- `src/app/admin/layout.tsx` — Admin nav + logout
- `src/app/admin/page.tsx` — redirect to /admin/zamowienia
- `src/app/admin/login/page.tsx` — Supabase Auth signInWithPassword form
- `src/app/admin/zamowienia/page.tsx` — orders list with filters
- `src/app/admin/zamowienia/[id]/page.tsx` — order detail + status change + onboarding send
- `src/app/api/admin/orders/route.ts` — GET list
- `src/app/api/admin/orders/[id]/route.ts` — GET one + PATCH status
- `src/app/api/admin/orders/[id]/send-onboarding/route.ts` — POST send onboarding email

**Modified files:**
- `src/app/api/stripe/checkout/route.ts` — accept order_id, pass in metadata
- `src/app/api/stripe/webhook/route.ts` — update stripe_paid + stripe_session_id in Supabase
- `src/app/sukces/page.tsx` — new design + "formularz onboardingowy zostanie wysłany emailem"
- `src/components/PricingCards.tsx` — handleBuy navigates to /zamow instead of Stripe directly
- `package.json` — add @supabase/supabase-js @supabase/ssr

---

## Task 1: Install packages + Supabase DB setup

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install Supabase packages**

```bash
cd "/Users/michalkobylinski/Library/Mobile Documents/com~apple~CloudDocs/Projekty AI/Mieszkanie - Torrevieja/nobooking-landing"
npm install @supabase/supabase-js @supabase/ssr
```

Expected: packages appear in node_modules, package.json updated

- [ ] **Step 2: Run the SQL migration in Supabase Dashboard**

Go to Supabase Dashboard → SQL Editor → New query. Paste and run:

```sql
CREATE TABLE orders (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at           TIMESTAMPTZ DEFAULT now(),

  plan                 TEXT NOT NULL CHECK (plan IN ('basic', 'pro')),
  currency             TEXT NOT NULL CHECK (currency IN ('pln', 'eur')),
  status               TEXT NOT NULL DEFAULT 'new'
                         CHECK (status IN ('new','contacted','onboarding_sent','building','completed')),

  stripe_session_id    TEXT,
  stripe_paid          BOOLEAN NOT NULL DEFAULT false,

  onboarding_token     UUID NOT NULL DEFAULT gen_random_uuid(),
  onboarding_submitted BOOLEAN NOT NULL DEFAULT false,

  first_name           TEXT NOT NULL,
  last_name            TEXT NOT NULL,
  email                TEXT NOT NULL,
  phone                TEXT NOT NULL,

  invoice_company      TEXT,
  invoice_nip          TEXT,
  invoice_address      TEXT,

  apartment_name       TEXT NOT NULL,
  apartment_location   TEXT NOT NULL,
  notes                TEXT,

  ob_description       TEXT,
  ob_price_per_night   INTEGER,
  ob_max_guests        INTEGER,
  ob_checkin_time      TEXT,
  ob_checkout_time     TEXT,
  ob_amenities         TEXT,
  ob_rules             TEXT,
  ob_seasons           TEXT,
  ob_photos_link       TEXT
);

-- Disable RLS for service-role API access (admin uses service key, public onboarding uses token)
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
```

- [ ] **Step 3: Create Supabase Auth user for Michał**

In Supabase Dashboard → Authentication → Users → "Invite user":
- Email: michal.kobyla@gmail.com
- Set password after invite, or use "Create user" directly

- [ ] **Step 4: Add environment variables to .env.local**

```bash
# In /Users/michalkobylinski/Library/Mobile Documents/com~apple~CloudDocs/Projekty AI/Mieszkanie - Torrevieja/nobooking-landing/.env.local
# Add these lines (get values from Supabase Dashboard → Settings → API):
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
ADMIN_EMAIL=michal.kobyla@gmail.com
```

Also add to Vercel environment variables (Settings → Environment Variables).

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install @supabase/supabase-js @supabase/ssr"
```

---

## Task 2: Shared lib files (types, supabase, prices, email)

**Files:**
- Create: `src/lib/types.ts`
- Create: `src/lib/supabase.ts`
- Create: `src/lib/prices.ts`
- Create: `src/lib/email.ts`

- [ ] **Step 1: Create src/lib/types.ts**

```typescript
export type OrderStatus = 'new' | 'contacted' | 'onboarding_sent' | 'building' | 'completed'

export interface Order {
  id: string
  created_at: string
  plan: 'basic' | 'pro'
  currency: 'pln' | 'eur'
  status: OrderStatus
  stripe_session_id: string | null
  stripe_paid: boolean
  onboarding_token: string
  onboarding_submitted: boolean
  first_name: string
  last_name: string
  email: string
  phone: string
  invoice_company: string | null
  invoice_nip: string | null
  invoice_address: string | null
  apartment_name: string
  apartment_location: string
  notes: string | null
  ob_description: string | null
  ob_price_per_night: number | null
  ob_max_guests: number | null
  ob_checkin_time: string | null
  ob_checkout_time: string | null
  ob_amenities: string | null
  ob_rules: string | null
  ob_seasons: string | null
  ob_photos_link: string | null
}
```

- [ ] **Step 2: Create src/lib/supabase.ts**

```typescript
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/** Server-side client with service role key — bypasses RLS, for API routes */
export function createServiceClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })
}

/** Server-side client with anon key + cookie session — for admin auth checks */
export function createAdminSessionClient(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        )
      },
    },
  })
}

/** Verify admin session in API routes. Returns null if authenticated, or a 401 response. */
export async function requireAdmin(request: NextRequest): Promise<NextResponse | null> {
  const cookieStore = await cookies()
  const supabase = createAdminSessionClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  return null
}
```

- [ ] **Step 3: Create src/lib/prices.ts**

```typescript
export const PRICES = {
  basic: { pln: 79900, eur: 19900 },
  pro:   { pln: 119900, eur: 29900 },
} as const

export const PRICE_LABELS = {
  basic: { pln: '799 zł', eur: '199 €' },
  pro:   { pln: '1 199 zł', eur: '299 €' },
} as const

export const PLAN_NAMES = {
  basic: 'Nobooking Basic (2 lata)',
  pro:   'Nobooking Pro (2 lata)',
} as const
```

- [ ] **Step 4: Create src/lib/email.ts**

```typescript
import { Resend } from 'resend'
import type { Order } from './types'

const resend = new Resend(process.env.RESEND_API_KEY!)
const FROM = process.env.EMAIL_FROM!
const ADMIN_EMAIL = process.env.ADMIN_EMAIL!
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://nobooking.eu').trim().replace(/\/$/, '')

/** Email 1: Notify Michał of new order */
export async function sendNewOrderNotification(order: Order) {
  const planLabel = order.plan === 'pro' ? 'Pro' : 'Basic'
  const priceLabel = order.currency === 'eur'
    ? (order.plan === 'pro' ? '299 €' : '199 €')
    : (order.plan === 'pro' ? '1 199 zł' : '799 zł')

  await resend.emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `Nowe zamówienie Nobooking — ${order.first_name} ${order.last_name} (${planLabel})`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
        <h2 style="background: #059669; color: white; padding: 1.5rem; margin: 0; border-radius: 8px 8px 0 0;">
          Nowe zamówienie Nobooking
        </h2>
        <div style="border: 1px solid #e5e7eb; border-top: none; padding: 1.5rem; border-radius: 0 0 8px 8px;">
          <p><strong>Plan:</strong> ${planLabel} · ${priceLabel}</p>
          <p><strong>Imię i nazwisko:</strong> ${order.first_name} ${order.last_name}</p>
          <p><strong>Email:</strong> <a href="mailto:${order.email}">${order.email}</a></p>
          <p><strong>Telefon:</strong> <a href="tel:${order.phone}">${order.phone}</a></p>
          ${order.invoice_company ? `<p><strong>Firma:</strong> ${order.invoice_company} · NIP: ${order.invoice_nip ?? '–'}</p>` : ''}
          ${order.invoice_address ? `<p><strong>Adres do faktury:</strong> ${order.invoice_address}</p>` : ''}
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 1rem 0;" />
          <p><strong>Apartament:</strong> ${order.apartment_name}</p>
          <p><strong>Lokalizacja:</strong> ${order.apartment_location}</p>
          ${order.notes ? `<p><strong>Notatki:</strong> ${order.notes}</p>` : ''}
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 1rem 0;" />
          <p><strong>Data zamówienia:</strong> ${new Date(order.created_at).toLocaleString('pl-PL')}</p>
          <p><a href="${SITE_URL}/admin/zamowienia/${order.id}" style="background: #059669; color: white; padding: 0.75rem 1.5rem; border-radius: 8px; text-decoration: none; display: inline-block; margin-top: 0.5rem;">Zobacz w panelu →</a></p>
        </div>
      </div>
    `,
  })
}

/** Email 2: Send onboarding form link to client */
export async function sendOnboardingEmail(order: Order) {
  const onboardingUrl = `${SITE_URL}/onboarding/${order.onboarding_token}`

  await resend.emails.send({
    from: FROM,
    to: order.email,
    subject: `Twoja strona Nobooking — wypełnij formularz`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
        <div style="background: #059669; padding: 2rem; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 1.75rem;">Nobooking</h1>
        </div>
        <div style="border: 1px solid #e5e7eb; border-top: none; padding: 2rem; border-radius: 0 0 8px 8px;">
          <p>Cześć ${order.first_name}!</p>
          <p>Dziękujemy za zakup. Aby zbudować Twoją stronę apartamentu, potrzebujemy kilku informacji.</p>
          <p>Kliknij przycisk poniżej i wypełnij krótki formularz — zajmie to ok. 5 minut:</p>
          <p style="text-align: center; margin: 2rem 0;">
            <a href="${onboardingUrl}" style="background: #059669; color: white; padding: 1rem 2rem; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 1rem; display: inline-block;">
              Wypełnij formularz →
            </a>
          </p>
          <p style="font-size: 0.85rem; color: #6b7280;">Jeśli przycisk nie działa, skopiuj ten link: <a href="${onboardingUrl}">${onboardingUrl}</a></p>
          <p>W razie pytań odpowiedz na tego emaila.</p>
          <p>Pozdrawiamy,<br/>Michał · Nobooking</p>
        </div>
      </div>
    `,
  })
}

/** Email 3: Notify Michał that onboarding form was submitted */
export async function sendOnboardingSubmittedNotification(order: Order) {
  await resend.emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `Formularz onboardingowy wypełniony — ${order.first_name} ${order.last_name}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
        <h2 style="background: #059669; color: white; padding: 1.5rem; margin: 0; border-radius: 8px 8px 0 0;">
          Formularz onboardingowy wypełniony
        </h2>
        <div style="border: 1px solid #e5e7eb; border-top: none; padding: 1.5rem; border-radius: 0 0 8px 8px;">
          <p><strong>${order.first_name} ${order.last_name}</strong> wypełnił/a formularz onboardingowy dla <strong>${order.apartment_name}</strong>.</p>
          <p><a href="${SITE_URL}/admin/zamowienia/${order.id}" style="background: #059669; color: white; padding: 0.75rem 1.5rem; border-radius: 8px; text-decoration: none; display: inline-block; margin-top: 0.5rem;">Zobacz formularz w panelu →</a></p>
        </div>
      </div>
    `,
  })
}
```

- [ ] **Step 5: Commit**

```bash
git add src/lib/types.ts src/lib/supabase.ts src/lib/prices.ts src/lib/email.ts
git commit -m "feat: add shared lib files (types, supabase client, prices, email templates)"
```

---

## Task 3: Middleware (protect /admin/*)

**Files:**
- Create: `src/middleware.ts`

- [ ] **Step 1: Create src/middleware.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only protect /admin/* (except /admin/login) and /api/admin/*
  const isAdminRoute = pathname.startsWith('/admin') || pathname.startsWith('/api/admin')
  const isLoginPage = pathname === '/admin/login'

  if (!isAdminRoute || isLoginPage) {
    return NextResponse.next()
  }

  const response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    // API routes return 401, page routes redirect to login
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  return response
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
```

- [ ] **Step 2: Verify middleware compiles**

```bash
cd "/Users/michalkobylinski/Library/Mobile Documents/com~apple~CloudDocs/Projekty AI/Mieszkanie - Torrevieja/nobooking-landing"
npx tsc --noEmit
```

Expected: no errors related to middleware.ts

- [ ] **Step 3: Commit**

```bash
git add src/middleware.ts
git commit -m "feat: add admin middleware — protect /admin/* and /api/admin/*"
```

---

## Task 4: POST /api/orders

**Files:**
- Create: `src/app/api/orders/route.ts`
- Modify: `src/app/api/stripe/checkout/route.ts`

- [ ] **Step 1: Update src/app/api/stripe/checkout/route.ts to accept order_id**

Replace the entire file with:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createRequire } from 'module'
import { PRICES, PLAN_NAMES } from '@/lib/prices'

const _require = createRequire(import.meta.url)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const StripeLib = _require('stripe') as any

export async function POST(request: NextRequest) {
  const { plan, currency, order_id } = await request.json() as {
    plan: 'basic' | 'pro'
    currency: 'pln' | 'eur'
    order_id?: string
  }

  if (!['basic', 'pro'].includes(plan) || !['pln', 'eur'].includes(currency)) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://nobooking.eu')
    .trim()
    .replace(/\/$/, '')

  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    const stripe = new StripeLib(
      (process.env.STRIPE_SECRET_KEY ?? '').trim(),
      { apiVersion: '2026-04-22.dahlia' }
    )
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency,
          unit_amount: PRICES[plan][currency],
          product_data: { name: PLAN_NAMES[plan] },
        },
        quantity: 1,
      }],
      success_url: `${siteUrl}/sukces?plan=${plan}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/#cennik`,
      metadata: { plan, currency, ...(order_id ? { order_id } : {}) },
    })

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('[checkout] Stripe error:', err)
    return NextResponse.json({ error: err?.message || 'Stripe error' }, { status: 500 })
  }
}
```

- [ ] **Step 2: Create src/app/api/orders/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { sendNewOrderNotification } from '@/lib/email'
import type { Order } from '@/lib/types'

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function validateNip(nip: string): boolean {
  return /^\d{10}$/.test(nip.replace(/[-\s]/g, ''))
}

export async function POST(request: NextRequest) {
  const body = await request.json() as {
    plan?: string
    currency?: string
    first_name?: string
    last_name?: string
    email?: string
    phone?: string
    invoice_company?: string
    invoice_nip?: string
    invoice_address?: string
    apartment_name?: string
    apartment_location?: string
    notes?: string
  }

  // Validate required fields
  const required = ['plan', 'currency', 'first_name', 'last_name', 'email', 'phone', 'apartment_name', 'apartment_location'] as const
  for (const field of required) {
    if (!body[field]?.toString().trim()) {
      return NextResponse.json({ error: `missing_${field}` }, { status: 400 })
    }
  }

  if (!['basic', 'pro'].includes(body.plan!)) {
    return NextResponse.json({ error: 'invalid_plan' }, { status: 400 })
  }
  if (!['pln', 'eur'].includes(body.currency!)) {
    return NextResponse.json({ error: 'invalid_currency' }, { status: 400 })
  }
  if (!validateEmail(body.email!)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 })
  }
  if (body.invoice_nip && !validateNip(body.invoice_nip)) {
    return NextResponse.json({ error: 'invalid_nip' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Insert order
  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      plan: body.plan,
      currency: body.currency,
      first_name: body.first_name!.trim(),
      last_name: body.last_name!.trim(),
      email: body.email!.trim().toLowerCase(),
      phone: body.phone!.trim(),
      invoice_company: body.invoice_company?.trim() || null,
      invoice_nip: body.invoice_nip?.trim() || null,
      invoice_address: body.invoice_address?.trim() || null,
      apartment_name: body.apartment_name!.trim(),
      apartment_location: body.apartment_location!.trim(),
      notes: body.notes?.trim() || null,
    })
    .select()
    .single()

  if (error || !order) {
    console.error('[orders] Supabase insert error:', error)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  // Create Stripe session
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://nobooking.eu')
    .trim()
    .replace(/\/$/, '')

  const checkoutRes = await fetch(`${siteUrl}/api/stripe/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan: order.plan, currency: order.currency, order_id: order.id }),
  })

  const checkoutData = await checkoutRes.json() as { url?: string; error?: string }

  if (!checkoutData.url) {
    console.error('[orders] Stripe checkout error:', checkoutData.error)
    return NextResponse.json({ error: 'stripe_error' }, { status: 500 })
  }

  // Send notification email to Michał (non-blocking)
  sendNewOrderNotification(order as Order).catch(err =>
    console.error('[orders] notification email error:', err)
  )

  return NextResponse.json({ order_id: order.id, stripe_url: checkoutData.url })
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd "/Users/michalkobylinski/Library/Mobile Documents/com~apple~CloudDocs/Projekty AI/Mieszkanie - Torrevieja/nobooking-landing"
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/app/api/orders/route.ts src/app/api/stripe/checkout/route.ts
git commit -m "feat: add POST /api/orders — save order to Supabase, return Stripe URL"
```

---

## Task 5: PricingCards — navigate to /zamow instead of Stripe

**Files:**
- Modify: `src/components/PricingCards.tsx`

- [ ] **Step 1: Update handleBuy to navigate to /zamow**

In `src/components/PricingCards.tsx`, replace the entire `handleBuy` function and add the `useRouter` import:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/context/LangContext'
import { TR } from '@/lib/translations'

export default function PricingCards() {
  const { lang, currency, setCurrency } = useLang()
  const t = TR[lang]
  const router = useRouter()
  const [loading, setLoading] = useState<'basic' | 'pro' | null>(null)

  function handleBuy(plan: 'basic' | 'pro') {
    setLoading(plan)
    router.push(`/zamow?plan=${plan}&currency=${currency}`)
  }
  // ... rest of component unchanged
```

Replace just the top of the file (imports + component open + handleBuy function). The full replacement for lines 1–30 of PricingCards.tsx:

```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/context/LangContext'
import { TR } from '@/lib/translations'

export default function PricingCards() {
  const { lang, currency, setCurrency } = useLang()
  const t = TR[lang]
  const router = useRouter()
  const [loading, setLoading] = useState<'basic' | 'pro' | null>(null)

  function handleBuy(plan: 'basic' | 'pro') {
    setLoading(plan)
    router.push(`/zamow?plan=${plan}&currency=${currency}`)
  }
```

- [ ] **Step 2: Commit**

```bash
git add src/components/PricingCards.tsx
git commit -m "feat: pricing buttons navigate to /zamow instead of Stripe directly"
```

---

## Task 6: /zamow page + OrderForm component

**Files:**
- Create: `src/app/zamow/page.tsx`
- Create: `src/components/OrderForm.tsx`

- [ ] **Step 1: Create src/app/zamow/page.tsx**

```typescript
import { redirect } from 'next/navigation'
import OrderForm from '@/components/OrderForm'

interface Props {
  searchParams: Promise<{ plan?: string; currency?: string }>
}

export default async function ZamowPage({ searchParams }: Props) {
  const params = await searchParams
  const plan = params.plan
  const currency = params.currency

  if (plan !== 'basic' && plan !== 'pro') {
    redirect('/#cennik')
  }
  if (currency !== 'pln' && currency !== 'eur') {
    redirect('/#cennik')
  }

  return <OrderForm plan={plan} currency={currency} />
}
```

- [ ] **Step 2: Create src/components/OrderForm.tsx**

```typescript
'use client'

import { useState } from 'react'
import { PRICE_LABELS } from '@/lib/prices'

interface Props {
  plan: 'basic' | 'pro'
  currency: 'pln' | 'eur'
}

interface FormData {
  first_name: string
  last_name: string
  email: string
  phone: string
  want_invoice: boolean
  invoice_company: string
  invoice_nip: string
  invoice_address: string
  apartment_name: string
  apartment_location: string
  notes: string
}

const INITIAL: FormData = {
  first_name: '', last_name: '', email: '', phone: '',
  want_invoice: false,
  invoice_company: '', invoice_nip: '', invoice_address: '',
  apartment_name: '', apartment_location: '', notes: '',
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>
        {label}{required && <span style={{ color: 'var(--color-pain)', marginLeft: '2px' }}>*</span>}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.65rem 0.875rem',
  border: '1.5px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  fontSize: '0.95rem', fontFamily: 'inherit',
  outline: 'none', boxSizing: 'border-box',
  background: 'white', color: 'var(--color-text)',
}

const textareaStyle: React.CSSProperties = {
  ...inputStyle, resize: 'vertical', minHeight: '80px',
}

export default function OrderForm({ plan, currency }: Props) {
  const [form, setForm] = useState<FormData>(INITIAL)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const planLabel = plan === 'pro' ? 'Pro' : 'Basic'
  const priceLabel = PRICE_LABELS[plan][currency]

  function set(field: keyof FormData, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Client-side validation
    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim() || !form.phone.trim()) {
      setError('Wypełnij wszystkie wymagane pola.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Podaj poprawny adres email.')
      return
    }
    if (!form.apartment_name.trim() || !form.apartment_location.trim()) {
      setError('Wypełnij dane apartamentu.')
      return
    }
    if (form.want_invoice && form.invoice_nip) {
      if (!/^\d{10}$/.test(form.invoice_nip.replace(/[-\s]/g, ''))) {
        setError('NIP musi zawierać 10 cyfr.')
        return
      }
    }

    setLoading(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan, currency,
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          invoice_company: form.want_invoice ? form.invoice_company.trim() || null : null,
          invoice_nip: form.want_invoice ? form.invoice_nip.trim() || null : null,
          invoice_address: form.want_invoice ? form.invoice_address.trim() || null : null,
          apartment_name: form.apartment_name.trim(),
          apartment_location: form.apartment_location.trim(),
          notes: form.notes.trim() || null,
        }),
      })

      const data = await res.json() as { stripe_url?: string; error?: string }

      if (data.stripe_url) {
        window.location.href = data.stripe_url
      } else {
        setError('Wystąpił błąd. Spróbuj ponownie lub napisz na kontakt@nobooking.eu')
      }
    } catch {
      setError('Błąd połączenia. Sprawdź internet i spróbuj ponownie.')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', padding: '3rem 1rem' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        {/* Back link */}
        <a href="/#cennik" style={{ fontSize: '0.875rem', color: 'var(--color-accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginBottom: '2rem' }}>
          ← Zmień plan
        </a>

        {/* Plan badge */}
        <div style={{ background: 'white', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: '1.25rem 1.5rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
              Wybrany plan
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>Nobooking {planLabel}</div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--color-accent)' }}>
            {priceLabel}
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* Contact data */}
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', color: '#111827' }}>
            Dane kontaktowe
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
            <Field label="Imię" required>
              <input style={inputStyle} type="text" value={form.first_name} onChange={e => set('first_name', e.target.value)} autoComplete="given-name" />
            </Field>
            <Field label="Nazwisko" required>
              <input style={inputStyle} type="text" value={form.last_name} onChange={e => set('last_name', e.target.value)} autoComplete="family-name" />
            </Field>
          </div>
          <Field label="Email" required>
            <input style={inputStyle} type="email" value={form.email} onChange={e => set('email', e.target.value)} autoComplete="email" />
          </Field>
          <Field label="Telefon" required>
            <input style={inputStyle} type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} autoComplete="tel" />
          </Field>

          {/* Invoice toggle */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, color: '#374151' }}>
              <input
                type="checkbox"
                checked={form.want_invoice}
                onChange={e => set('want_invoice', e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--color-accent)', cursor: 'pointer' }}
              />
              Chcę fakturę na firmę
            </label>
          </div>

          {form.want_invoice && (
            <div style={{ background: '#F0FDF4', border: '1px solid var(--color-accent-border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', marginBottom: '1.5rem' }}>
              <Field label="Nazwa firmy">
                <input style={inputStyle} type="text" value={form.invoice_company} onChange={e => set('invoice_company', e.target.value)} />
              </Field>
              <Field label="NIP (10 cyfr)">
                <input style={inputStyle} type="text" value={form.invoice_nip} onChange={e => set('invoice_nip', e.target.value)} placeholder="1234567890" />
              </Field>
              <Field label="Adres">
                <textarea style={textareaStyle} value={form.invoice_address} onChange={e => set('invoice_address', e.target.value)} />
              </Field>
            </div>
          )}

          {/* Apartment */}
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', marginTop: '0.5rem', color: '#111827' }}>
            Informacje o apartamencie
          </h2>
          <Field label="Nazwa apartamentu" required>
            <input style={inputStyle} type="text" value={form.apartment_name} onChange={e => set('apartment_name', e.target.value)} placeholder="np. Apartament Słoneczny" />
          </Field>
          <Field label="Lokalizacja (miasto/region)" required>
            <input style={inputStyle} type="text" value={form.apartment_location} onChange={e => set('apartment_location', e.target.value)} placeholder="np. Torrevieja, Costa Blanca" />
          </Field>
          <Field label="Notatki / dodatkowe informacje">
            <textarea style={textareaStyle} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Cokolwiek chcesz nam powiedzieć..." />
          </Field>

          {/* Error */}
          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--radius-md)', padding: '0.875rem 1rem', marginBottom: '1.25rem', fontSize: '0.875rem', color: 'var(--color-pain)' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', fontSize: '1rem', padding: '1rem', opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Przekierowuję do płatności...' : 'Przejdź do płatności →'}
          </button>

          <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--color-text-faint)', marginTop: '1rem' }}>
            Płatność obsługiwana przez Stripe. Twoje dane są bezpieczne.
          </p>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
cd "/Users/michalkobylinski/Library/Mobile Documents/com~apple~CloudDocs/Projekty AI/Mieszkanie - Torrevieja/nobooking-landing"
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Test locally**

```bash
npm run dev
```

Navigate to http://localhost:3000 → click "Kup Basic" → should land on /zamow?plan=basic&currency=pln with the form. Fill in test data → click submit → should redirect to Stripe Checkout.

- [ ] **Step 5: Commit**

```bash
git add src/app/zamow/page.tsx src/components/OrderForm.tsx
git commit -m "feat: add /zamow order form page"
```

---

## Task 7: Stripe webhook — update Supabase after payment

**Files:**
- Modify: `src/app/api/stripe/webhook/route.ts`

- [ ] **Step 1: Replace webhook handler**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createRequire } from 'module'
import { createServiceClient } from '@/lib/supabase'

const _require = createRequire(import.meta.url)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const StripeLib = _require('stripe') as any

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')!

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  const stripe = new StripeLib(
    (process.env.STRIPE_SECRET_KEY ?? '').trim(),
    { apiVersion: '2026-04-22.dahlia' }
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: any
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    console.error('[webhook] signature error:', err.message)
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (event.type === 'checkout.session.completed') {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const session = event.data.object
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const orderId = session.metadata?.order_id as string | undefined
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const sessionId = session.id as string

    if (orderId) {
      const supabase = createServiceClient()
      const { error } = await supabase
        .from('orders')
        .update({ stripe_paid: true, stripe_session_id: sessionId })
        .eq('id', orderId)

      if (error) {
        console.error('[webhook] Supabase update error:', error)
      }
    }
  }

  return NextResponse.json({ received: true })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/stripe/webhook/route.ts
git commit -m "feat: webhook updates stripe_paid + stripe_session_id in Supabase"
```

---

## Task 8: /sukces page update

**Files:**
- Modify: `src/app/sukces/page.tsx`

- [ ] **Step 1: Replace sukces page**

```typescript
'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function SukcesContent() {
  const searchParams = useSearchParams()
  const plan = searchParams.get('plan') ?? 'basic'
  const planLabel = plan === 'pro' ? 'Nobooking Pro' : 'Nobooking Basic'

  return (
    <div style={{ minHeight: '100vh', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ textAlign: 'center', maxWidth: '540px' }}>
        <div style={{ width: '72px', height: '72px', background: 'var(--color-accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '2rem' }}>
          ✓
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.5rem', color: '#111827' }}>
          Płatność przyjęta!
        </h1>
        <p style={{ fontSize: '1rem', color: 'var(--color-accent)', fontWeight: 600, marginBottom: '1.5rem' }}>
          {planLabel}
        </p>
        <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: '1.75rem', textAlign: 'left', marginBottom: '2rem' }}>
          <p style={{ fontWeight: 700, marginBottom: '0.75rem', color: '#111827' }}>Co teraz?</p>
          <ol style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', color: '#374151', fontSize: '0.9rem', lineHeight: 1.6 }}>
            <li>Wkrótce dostaniesz od nas email z formularzem onboardingowym.</li>
            <li>Wypełnij formularz — opisz apartament, podaj zdjęcia i ceny.</li>
            <li>Zbudujemy Twoją stronę w ciągu <strong>7 dni roboczych</strong>.</li>
          </ol>
        </div>
        <a href="/" style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', textDecoration: 'none' }}>
          ← Wróć na stronę główną
        </a>
      </div>
    </div>
  )
}

export default function SukcesPage() {
  return (
    <Suspense>
      <SukcesContent />
    </Suspense>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/sukces/page.tsx
git commit -m "feat: update /sukces page — new design + onboarding info"
```

---

## Task 9: /api/onboarding/[token] routes

**Files:**
- Create: `src/app/api/onboarding/[token]/route.ts`

- [ ] **Step 1: Create the onboarding API route**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { sendOnboardingSubmittedNotification } from '@/lib/email'
import type { Order } from '@/lib/types'

interface Params {
  params: Promise<{ token: string }>
}

export async function GET(_request: NextRequest, { params }: Params) {
  const { token } = await params
  const supabase = createServiceClient()

  const { data: order, error } = await supabase
    .from('orders')
    .select('id, onboarding_submitted, first_name, apartment_name')
    .eq('onboarding_token', token)
    .single()

  if (error || !order) {
    return NextResponse.json({ found: false })
  }

  return NextResponse.json({
    found: true,
    submitted: order.onboarding_submitted,
    first_name: order.first_name,
    apartment_name: order.apartment_name,
  })
}

export async function POST(request: NextRequest, { params }: Params) {
  const { token } = await params
  const supabase = createServiceClient()

  const { data: order, error: findError } = await supabase
    .from('orders')
    .select('*')
    .eq('onboarding_token', token)
    .single()

  if (findError || !order) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  if (order.onboarding_submitted) {
    return NextResponse.json({ error: 'already_submitted' }, { status: 409 })
  }

  const body = await request.json() as {
    ob_description?: string
    ob_price_per_night?: number
    ob_max_guests?: number
    ob_checkin_time?: string
    ob_checkout_time?: string
    ob_amenities?: string
    ob_rules?: string
    ob_seasons?: string
    ob_photos_link?: string
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update({
      ob_description: body.ob_description?.trim() || null,
      ob_price_per_night: body.ob_price_per_night || null,
      ob_max_guests: body.ob_max_guests || null,
      ob_checkin_time: body.ob_checkin_time?.trim() || null,
      ob_checkout_time: body.ob_checkout_time?.trim() || null,
      ob_amenities: body.ob_amenities?.trim() || null,
      ob_rules: body.ob_rules?.trim() || null,
      ob_seasons: body.ob_seasons || null,
      ob_photos_link: body.ob_photos_link?.trim() || null,
      onboarding_submitted: true,
    })
    .eq('id', order.id)

  if (updateError) {
    console.error('[onboarding] update error:', updateError)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  // Notify Michał (non-blocking)
  sendOnboardingSubmittedNotification(order as Order).catch(err =>
    console.error('[onboarding] notification error:', err)
  )

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/onboarding/
git commit -m "feat: add GET+POST /api/onboarding/[token]"
```

---

## Task 10: /onboarding/[token] page + OnboardingForm

**Files:**
- Create: `src/app/onboarding/[token]/page.tsx`
- Create: `src/components/OnboardingForm.tsx`

- [ ] **Step 1: Create src/app/onboarding/[token]/page.tsx**

```typescript
import OnboardingForm from '@/components/OnboardingForm'

interface Props {
  params: Promise<{ token: string }>
}

export default async function OnboardingPage({ params }: Props) {
  const { token } = await params

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://nobooking.eu')
    .trim()
    .replace(/\/$/, '')

  const res = await fetch(`${siteUrl}/api/onboarding/${token}`, { cache: 'no-store' })
  const data = await res.json() as {
    found: boolean
    submitted?: boolean
    first_name?: string
    apartment_name?: string
  }

  if (!data.found) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'var(--font-jakarta, sans-serif)' }}>
        <div style={{ textAlign: 'center', maxWidth: '480px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', marginBottom: '0.75rem' }}>Nie znaleziono formularza</h1>
          <p style={{ color: '#6B7280', fontSize: '0.9rem' }}>Ten link jest nieprawidłowy lub wygasł. Napisz do nas: kontakt@nobooking.eu</p>
        </div>
      </div>
    )
  }

  if (data.submitted) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem', fontFamily: 'var(--font-jakarta, sans-serif)' }}>
        <div style={{ textAlign: 'center', maxWidth: '480px' }}>
          <div style={{ width: '64px', height: '64px', background: 'var(--color-accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '1.75rem', color: 'white' }}>✓</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', marginBottom: '0.75rem' }}>Formularz już wypełniony</h1>
          <p style={{ color: '#6B7280', fontSize: '0.9rem' }}>Dziękujemy! Wkrótce odezwiemy się z informacją o postępie prac.</p>
        </div>
      </div>
    )
  }

  return (
    <OnboardingForm
      token={token}
      firstName={data.first_name ?? ''}
      apartmentName={data.apartment_name ?? ''}
    />
  )
}
```

- [ ] **Step 2: Create src/components/OnboardingForm.tsx**

```typescript
'use client'

import { useState } from 'react'

interface Props {
  token: string
  firstName: string
  apartmentName: string
}

interface Season {
  label: string
  from: string
  to: string
  price: string
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.65rem 0.875rem',
  border: '1.5px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  fontSize: '0.95rem', fontFamily: 'inherit',
  outline: 'none', boxSizing: 'border-box',
  background: 'white', color: 'var(--color-text)',
}

const textareaStyle: React.CSSProperties = { ...inputStyle, resize: 'vertical', minHeight: '90px' }

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>
        {label}{required && <span style={{ color: 'var(--color-pain)', marginLeft: '2px' }}>*</span>}
      </label>
      {children}
    </div>
  )
}

export default function OnboardingForm({ token, firstName, apartmentName }: Props) {
  const [description, setDescription] = useState('')
  const [pricePerNight, setPricePerNight] = useState('')
  const [maxGuests, setMaxGuests] = useState('')
  const [checkinTime, setCheckinTime] = useState('')
  const [checkoutTime, setCheckoutTime] = useState('')
  const [amenities, setAmenities] = useState('')
  const [rules, setRules] = useState('')
  const [seasons, setSeasons] = useState<Season[]>([])
  const [photosLink, setPhotosLink] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  function addSeason() {
    setSeasons(prev => [...prev, { label: '', from: '', to: '', price: '' }])
  }

  function updateSeason(index: number, field: keyof Season, value: string) {
    setSeasons(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s))
  }

  function removeSeason(index: number) {
    setSeasons(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!description.trim() || !pricePerNight || !maxGuests || !checkinTime.trim() || !checkoutTime.trim()) {
      setError('Wypełnij wszystkie wymagane pola.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/onboarding/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ob_description: description.trim(),
          ob_price_per_night: parseInt(pricePerNight) || null,
          ob_max_guests: parseInt(maxGuests) || null,
          ob_checkin_time: checkinTime.trim(),
          ob_checkout_time: checkoutTime.trim(),
          ob_amenities: amenities.trim() || null,
          ob_rules: rules.trim() || null,
          ob_seasons: seasons.length > 0 ? JSON.stringify(seasons) : null,
          ob_photos_link: photosLink.trim() || null,
        }),
      })

      const data = await res.json() as { success?: boolean; error?: string }
      if (data.success) {
        setDone(true)
      } else if (data.error === 'already_submitted') {
        setError('Formularz został już wysłany.')
      } else {
        setError('Wystąpił błąd. Spróbuj ponownie lub napisz na kontakt@nobooking.eu')
      }
    } catch {
      setError('Błąd połączenia. Sprawdź internet i spróbuj ponownie.')
    }
    setLoading(false)
  }

  if (done) {
    return (
      <div style={{ minHeight: '100vh', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '480px' }}>
          <div style={{ width: '72px', height: '72px', background: 'var(--color-accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '2rem', color: 'white' }}>✓</div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#111827', marginBottom: '0.75rem' }}>Dziękujemy, {firstName}!</h1>
          <p style={{ color: '#374151', lineHeight: 1.7 }}>Formularz dla <strong>{apartmentName}</strong> został wysłany. Odezwiemy się wkrótce z informacją o postępie prac.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', padding: '3rem 1rem' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.5rem', color: '#111827' }}>
          Formularz budowy strony
        </h1>
        <p style={{ fontSize: '0.9rem', color: '#6B7280', marginBottom: '2.5rem' }}>
          Cześć {firstName}! Wypełnij poniższy formularz dla <strong>{apartmentName}</strong>. Zajmie to ok. 5 minut.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: '1.25rem' }}>O apartamencie</h2>

          <Field label="Opis apartamentu" required>
            <textarea style={textareaStyle} value={description} onChange={e => setDescription(e.target.value)} placeholder="Opisz apartament — pokoje, widok, wyposażenie..." />
          </Field>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
            <Field label="Cena za noc" required>
              <input style={inputStyle} type="number" min="1" value={pricePerNight} onChange={e => setPricePerNight(e.target.value)} placeholder="np. 350" />
            </Field>
            <Field label="Maks. liczba gości" required>
              <input style={inputStyle} type="number" min="1" max="50" value={maxGuests} onChange={e => setMaxGuests(e.target.value)} placeholder="np. 4" />
            </Field>
            <Field label="Godzina check-in" required>
              <input style={inputStyle} type="text" value={checkinTime} onChange={e => setCheckinTime(e.target.value)} placeholder="np. 15:00" />
            </Field>
            <Field label="Godzina check-out" required>
              <input style={inputStyle} type="text" value={checkoutTime} onChange={e => setCheckoutTime(e.target.value)} placeholder="np. 11:00" />
            </Field>
          </div>

          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: '1.5rem 0 1.25rem' }}>Udogodnienia i zasady</h2>
          <Field label="Udogodnienia">
            <textarea style={textareaStyle} value={amenities} onChange={e => setAmenities(e.target.value)} placeholder="np. WiFi, Parking, Klimatyzacja, Basen, Balkon..." />
          </Field>
          <Field label="Zasady pobytu">
            <textarea style={textareaStyle} value={rules} onChange={e => setRules(e.target.value)} placeholder="np. Zakaz palenia, Zakaz imprez, Zwierzęta po uzgodnieniu..." />
          </Field>

          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: '1.5rem 0 1.25rem' }}>Ceny sezonowe (opcjonalne)</h2>
          {seasons.map((season, i) => (
            <div key={i} style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1rem', marginBottom: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'end' }}>
                <Field label="Nazwa sezonu">
                  <input style={inputStyle} type="text" value={season.label} onChange={e => updateSeason(i, 'label', e.target.value)} placeholder="np. Lato" />
                </Field>
                <Field label="Data od">
                  <input style={inputStyle} type="date" value={season.from} onChange={e => updateSeason(i, 'from', e.target.value)} />
                </Field>
                <Field label="Data do">
                  <input style={inputStyle} type="date" value={season.to} onChange={e => updateSeason(i, 'to', e.target.value)} />
                </Field>
                <Field label="Cena/noc">
                  <input style={inputStyle} type="number" value={season.price} onChange={e => updateSeason(i, 'price', e.target.value)} placeholder="np. 450" />
                </Field>
                <button type="button" onClick={() => removeSeason(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '1.25rem', padding: '0.65rem 0.25rem', alignSelf: 'end', marginBottom: '1.25rem' }}>×</button>
              </div>
            </div>
          ))}
          <button type="button" onClick={addSeason} style={{ background: 'white', border: '1.5px dashed var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0.65rem 1.25rem', fontSize: '0.875rem', fontWeight: 600, color: '#374151', cursor: 'pointer', fontFamily: 'inherit', marginBottom: '1.5rem', display: 'block', width: '100%' }}>
            + Dodaj sezon
          </button>

          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: '1.25rem' }}>Zdjęcia</h2>
          <Field label="Link do zdjęć (Google Drive, WeTransfer, Dropbox)">
            <input style={inputStyle} type="url" value={photosLink} onChange={e => setPhotosLink(e.target.value)} placeholder="https://drive.google.com/..." />
          </Field>
          <p style={{ fontSize: '0.8rem', color: '#9CA3AF', marginTop: '-0.75rem', marginBottom: '1.5rem' }}>
            Prześlij zdjęcia (min. 10) przez Google Drive lub WeTransfer i wklej link powyżej.
          </p>

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--radius-md)', padding: '0.875rem 1rem', marginBottom: '1.25rem', fontSize: '0.875rem', color: 'var(--color-pain)' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', fontSize: '1rem', padding: '1rem', opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Wysyłam...' : 'Wyślij formularz →'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 4: Commit**

```bash
git add src/app/onboarding/ src/components/OnboardingForm.tsx
git commit -m "feat: add /onboarding/[token] page and OnboardingForm component"
```

---

## Task 11: Admin layout + login + redirect

**Files:**
- Create: `src/app/admin/layout.tsx`
- Create: `src/app/admin/page.tsx`
- Create: `src/app/admin/login/page.tsx`

- [ ] **Step 1: Create src/app/admin/layout.tsx**

```typescript
import type { ReactNode } from 'react'

export const metadata = { title: 'Admin — Nobooking' }

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: 'var(--font-jakarta, sans-serif)' }}>
      {children}
    </div>
  )
}
```

- [ ] **Step 2: Create src/app/admin/page.tsx**

```typescript
import { redirect } from 'next/navigation'

export default function AdminPage() {
  redirect('/admin/zamowienia')
}
```

- [ ] **Step 3: Create src/app/admin/login/page.tsx**

```typescript
'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

// Browser-side client for login
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Nieprawidłowy email lub hasło.')
      setLoading(false)
      return
    }

    router.push('/admin/zamowienia')
    router.refresh()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.75rem 1rem',
    border: '1.5px solid #D1D5DB',
    borderRadius: '8px', fontSize: '0.95rem',
    fontFamily: 'inherit', outline: 'none',
    boxSizing: 'border-box', background: 'white',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.25rem' }}>
            <span style={{ color: 'var(--color-accent)' }}>No</span>booking Admin
          </div>
          <p style={{ fontSize: '0.875rem', color: '#6B7280' }}>Zaloguj się, aby zarządzać zamówieniami</p>
        </div>

        <form onSubmit={handleLogin} style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '16px', padding: '2rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>Email</label>
            <input style={inputStyle} type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" autoFocus required />
          </div>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>Hasło</label>
            <input style={inputStyle} type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required />
          </div>

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '0.75rem 1rem', marginBottom: '1rem', fontSize: '0.875rem', color: '#DC2626' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '0.875rem',
              background: '#111827', border: 'none',
              color: 'white', borderRadius: '8px',
              fontSize: '0.95rem', fontWeight: 700,
              fontFamily: 'inherit', cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Logowanie...' : 'Zaloguj się'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add src/app/admin/layout.tsx src/app/admin/page.tsx src/app/admin/login/page.tsx
git commit -m "feat: add admin layout, redirect, and login page"
```

---

## Task 12: Admin orders list API + page

**Files:**
- Create: `src/app/api/admin/orders/route.ts`
- Create: `src/app/admin/zamowienia/page.tsx`

- [ ] **Step 1: Create src/app/api/admin/orders/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, requireAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('orders')
    .select('id, created_at, plan, currency, status, stripe_paid, onboarding_submitted, first_name, last_name, email')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  return NextResponse.json(data)
}
```

- [ ] **Step 2: Create src/app/admin/zamowienia/page.tsx**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import type { OrderStatus } from '@/lib/types'
import { PRICE_LABELS } from '@/lib/prices'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface OrderRow {
  id: string
  created_at: string
  plan: 'basic' | 'pro'
  currency: 'pln' | 'eur'
  status: OrderStatus
  stripe_paid: boolean
  onboarding_submitted: boolean
  first_name: string
  last_name: string
  email: string
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'Nowe',
  contacted: 'W kontakcie',
  onboarding_sent: 'Formularz wysłany',
  building: 'W budowie',
  completed: 'Ukończone',
}

const STATUS_COLORS: Record<OrderStatus, { bg: string; color: string }> = {
  new: { bg: '#EFF6FF', color: '#1D4ED8' },
  contacted: { bg: '#FFF7ED', color: '#C2410C' },
  onboarding_sent: { bg: '#F5F3FF', color: '#6D28D9' },
  building: { bg: '#FFF9C4', color: '#92400E' },
  completed: { bg: '#F0FDF4', color: '#15803D' },
}

const FILTER_OPTIONS: Array<{ value: OrderStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Wszystkie' },
  { value: 'new', label: 'Nowe' },
  { value: 'contacted', label: 'W kontakcie' },
  { value: 'onboarding_sent', label: 'Formularz wysłany' },
  { value: 'building', label: 'W budowie' },
  { value: 'completed', label: 'Ukończone' },
]

export default function AdminZamowieniaPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const res = await fetch('/api/admin/orders')
      if (res.status === 401) {
        router.push('/admin/login')
        return
      }
      const data = await res.json() as OrderRow[]
      setOrders(data)
      setLoading(false)
    }
    load()
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)

  return (
    <div>
      {/* Top nav */}
      <div style={{ background: 'white', borderBottom: '1px solid #E5E7EB', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
          <span style={{ color: 'var(--color-accent)' }}>No</span>booking Admin
        </div>
        <button onClick={handleLogout} style={{ background: 'none', border: '1px solid #D1D5DB', borderRadius: '8px', padding: '0.4rem 1rem', fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'inherit', color: '#374151' }}>
          Wyloguj
        </button>
      </div>

      <div style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827' }}>Zamówienia</h1>
          <span style={{ fontSize: '0.875rem', color: '#6B7280' }}>{orders.length} łącznie</span>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              style={{
                padding: '0.4rem 1rem', borderRadius: '20px',
                border: '1px solid', fontFamily: 'inherit',
                fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                borderColor: filter === opt.value ? '#111827' : '#D1D5DB',
                background: filter === opt.value ? '#111827' : 'white',
                color: filter === opt.value ? 'white' : '#374151',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ color: '#6B7280', textAlign: 'center', padding: '3rem' }}>Ładowanie...</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: '#6B7280', textAlign: 'center', padding: '3rem' }}>Brak zamówień</p>
        ) : (
          <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E5E7EB', background: '#F9FAFB' }}>
                  {['Data', 'Klient', 'Plan', 'Status', 'Stripe', 'Onboarding'].map(h => (
                    <th key={h} style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: '#6B7280', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((order, i) => (
                  <tr
                    key={order.id}
                    onClick={() => router.push(`/admin/zamowienia/${order.id}`)}
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid #F3F4F6' : 'none', cursor: 'pointer', transition: 'background 0.1s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#F9FAFB' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'white' }}
                  >
                    <td style={{ padding: '0.875rem 1rem', fontSize: '0.8rem', color: '#6B7280', whiteSpace: 'nowrap' }}>
                      {new Date(order.created_at).toLocaleDateString('pl-PL')}
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>{order.first_name} {order.last_name}</div>
                      <div style={{ fontSize: '0.78rem', color: '#6B7280' }}>{order.email}</div>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, padding: '0.25rem 0.625rem', borderRadius: '20px', background: order.plan === 'pro' ? '#111827' : '#F3F4F6', color: order.plan === 'pro' ? 'white' : '#374151' }}>
                        {order.plan === 'pro' ? 'Pro' : 'Basic'} · {PRICE_LABELS[order.plan][order.currency]}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 700, padding: '0.25rem 0.625rem', borderRadius: '20px', ...STATUS_COLORS[order.status] }}>
                        {STATUS_LABELS[order.status]}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', fontSize: '1rem' }}>
                      {order.stripe_paid ? '✅' : '❌'}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', fontSize: '0.8rem', color: order.onboarding_submitted ? '#15803D' : '#9CA3AF', fontWeight: 600 }}>
                      {order.onboarding_submitted ? 'Wypełniony' : 'Oczekuje'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/orders/route.ts src/app/admin/zamowienia/page.tsx
git commit -m "feat: add admin orders list API and /admin/zamowienia page"
```

---

## Task 13: Admin order detail API + page

**Files:**
- Create: `src/app/api/admin/orders/[id]/route.ts`
- Create: `src/app/admin/zamowienia/[id]/page.tsx`

- [ ] **Step 1: Create src/app/api/admin/orders/[id]/route.ts**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, requireAdmin } from '@/lib/supabase'
import type { OrderStatus } from '@/lib/types'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: Params) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { id } = await params
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { id } = await params
  const { status } = await request.json() as { status?: OrderStatus }

  const validStatuses: OrderStatus[] = ['new', 'contacted', 'onboarding_sent', 'building', 'completed']
  if (!status || !validStatuses.includes(status)) {
    return NextResponse.json({ error: 'invalid_status' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', id)

  if (error) {
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Create src/app/admin/zamowienia/[id]/page.tsx**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import type { Order, OrderStatus } from '@/lib/types'
import { PRICE_LABELS } from '@/lib/prices'

const STATUS_OPTIONS: Array<{ value: OrderStatus; label: string }> = [
  { value: 'new', label: 'Nowe' },
  { value: 'contacted', label: 'W kontakcie' },
  { value: 'onboarding_sent', label: 'Formularz wysłany' },
  { value: 'building', label: 'W budowie' },
  { value: 'completed', label: 'Ukończone' },
]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '1.5rem', marginBottom: '1rem' }}>
      <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>{title}</h3>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.625rem', alignItems: 'flex-start' }}>
      <span style={{ fontSize: '0.8rem', color: '#9CA3AF', minWidth: '140px', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '0.875rem', color: '#111827', fontWeight: 500 }}>{value}</span>
    </div>
  )
}

export default function OrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusSaving, setStatusSaving] = useState(false)
  const [onboardingSending, setOnboardingSending] = useState(false)
  const [onboardingMsg, setOnboardingMsg] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/admin/orders/${id}`)
      if (res.status === 401) { router.push('/admin/login'); return }
      if (res.status === 404) { router.push('/admin/zamowienia'); return }
      const data = await res.json() as Order
      setOrder(data)
      setLoading(false)
    }
    load()
  }, [id, router])

  async function handleStatusChange(status: OrderStatus) {
    if (!order) return
    setStatusSaving(true)
    await fetch(`/api/admin/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setOrder(prev => prev ? { ...prev, status } : prev)
    setStatusSaving(false)
  }

  async function handleSendOnboarding() {
    setOnboardingSending(true)
    setOnboardingMsg(null)
    const res = await fetch(`/api/admin/orders/${id}/send-onboarding`, { method: 'POST' })
    const data = await res.json() as { success?: boolean; error?: string }
    if (data.success) {
      setOnboardingMsg('Email wysłany!')
      setOrder(prev => prev ? { ...prev, status: 'onboarding_sent' } : prev)
    } else {
      setOnboardingMsg(`Błąd: ${data.error ?? 'nieznany'}`)
    }
    setOnboardingSending(false)
  }

  if (loading) {
    return <div style={{ padding: '4rem', textAlign: 'center', color: '#9CA3AF' }}>Ładowanie...</div>
  }
  if (!order) return null

  const planLabel = order.plan === 'pro' ? 'Pro' : 'Basic'
  const priceLabel = PRICE_LABELS[order.plan][order.currency]

  return (
    <div>
      {/* Top nav */}
      <div style={{ background: 'white', borderBottom: '1px solid #E5E7EB', padding: '1rem 2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <button onClick={() => router.push('/admin/zamowienia')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', color: '#6B7280', fontFamily: 'inherit', padding: 0 }}>
          ← Zamówienia
        </button>
        <span style={{ color: '#D1D5DB' }}>·</span>
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>{order.first_name} {order.last_name}</span>
      </div>

      <div style={{ padding: '2rem', maxWidth: '800px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', marginBottom: '0.25rem' }}>
              {order.first_name} {order.last_name}
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#6B7280' }}>
              Nobooking {planLabel} · {priceLabel} · {new Date(order.created_at).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>Status:</span>
            <select
              value={order.status}
              onChange={e => handleStatusChange(e.target.value as OrderStatus)}
              disabled={statusSaving}
              style={{ padding: '0.4rem 0.75rem', border: '1.5px solid #D1D5DB', borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'inherit', cursor: 'pointer', background: 'white', fontWeight: 600 }}
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Contact */}
        <Section title="Dane kontaktowe">
          <Row label="Imię i nazwisko" value={`${order.first_name} ${order.last_name}`} />
          <Row label="Email" value={order.email} />
          <Row label="Telefon" value={order.phone} />
        </Section>

        {/* Invoice */}
        {(order.invoice_company || order.invoice_nip || order.invoice_address) ? (
          <Section title="Dane do faktury">
            <Row label="Firma" value={order.invoice_company} />
            <Row label="NIP" value={order.invoice_nip} />
            <Row label="Adres" value={order.invoice_address} />
          </Section>
        ) : (
          <Section title="Dane do faktury">
            <p style={{ fontSize: '0.875rem', color: '#9CA3AF' }}>Brak danych do faktury</p>
          </Section>
        )}

        {/* Apartment */}
        <Section title="Informacje o apartamencie">
          <Row label="Nazwa" value={order.apartment_name} />
          <Row label="Lokalizacja" value={order.apartment_location} />
          <Row label="Notatki" value={order.notes} />
        </Section>

        {/* Payment */}
        <Section title="Płatność">
          <Row label="Plan" value={`Nobooking ${planLabel}`} />
          <Row label="Kwota" value={priceLabel} />
          <Row label="Waluta" value={order.currency.toUpperCase()} />
          <Row label="Stripe opłacony" value={order.stripe_paid ? '✅ Tak' : '❌ Nie'} />
          <Row label="Stripe Session ID" value={order.stripe_session_id} />
        </Section>

        {/* Onboarding */}
        <Section title="Formularz onboardingowy">
          {!order.stripe_paid && (
            <p style={{ fontSize: '0.875rem', color: '#9CA3AF' }}>Oczekiwanie na płatność</p>
          )}

          {order.stripe_paid && !order.onboarding_submitted && (
            <div>
              <p style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '1rem' }}>Formularz nie został jeszcze wypełniony.</p>
              <button
                onClick={handleSendOnboarding}
                disabled={onboardingSending}
                style={{ background: '#059669', color: 'white', border: 'none', borderRadius: '8px', padding: '0.7rem 1.5rem', fontSize: '0.875rem', fontWeight: 700, fontFamily: 'inherit', cursor: onboardingSending ? 'not-allowed' : 'pointer', opacity: onboardingSending ? 0.7 : 1 }}
              >
                {onboardingSending ? 'Wysyłanie...' : 'Wyślij formularz onboardingowy →'}
              </button>
              {onboardingMsg && <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: onboardingMsg.startsWith('Błąd') ? '#DC2626' : '#059669', fontWeight: 600 }}>{onboardingMsg}</p>}
            </div>
          )}

          {order.onboarding_submitted && (
            <div>
              <Row label="Opis" value={order.ob_description} />
              <Row label="Cena za noc" value={order.ob_price_per_night?.toString()} />
              <Row label="Maks. gości" value={order.ob_max_guests?.toString()} />
              <Row label="Check-in" value={order.ob_checkin_time} />
              <Row label="Check-out" value={order.ob_checkout_time} />
              <Row label="Udogodnienia" value={order.ob_amenities} />
              <Row label="Zasady" value={order.ob_rules} />
              <Row label="Zdjęcia" value={order.ob_photos_link} />
              {order.ob_seasons && (
                <div style={{ marginBottom: '0.625rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#9CA3AF', display: 'block', marginBottom: '0.25rem' }}>Sezony</span>
                  <pre style={{ fontSize: '0.8rem', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '0.75rem', overflow: 'auto', color: '#374151' }}>
                    {JSON.stringify(JSON.parse(order.ob_seasons), null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/orders/[id]/route.ts src/app/admin/zamowienia/[id]/page.tsx
git commit -m "feat: add admin order detail API and /admin/zamowienia/[id] page"
```

---

## Task 14: Send-onboarding API route

**Files:**
- Create: `src/app/api/admin/orders/[id]/send-onboarding/route.ts`

- [ ] **Step 1: Create the route**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, requireAdmin } from '@/lib/supabase'
import { sendOnboardingEmail } from '@/lib/email'
import type { Order } from '@/lib/types'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: Params) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { id } = await params
  const supabase = createServiceClient()

  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !order) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  if (!order.stripe_paid) {
    return NextResponse.json({ error: 'not_paid' }, { status: 400 })
  }

  try {
    await sendOnboardingEmail(order as Order)
  } catch (err) {
    console.error('[send-onboarding] email error:', err)
    return NextResponse.json({ error: 'email_error' }, { status: 500 })
  }

  // Update status to onboarding_sent
  await supabase
    .from('orders')
    .update({ status: 'onboarding_sent' })
    .eq('id', id)

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Verify full TypeScript**

```bash
cd "/Users/michalkobylinski/Library/Mobile Documents/com~apple~CloudDocs/Projekty AI/Mieszkanie - Torrevieja/nobooking-landing"
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/orders/[id]/send-onboarding/route.ts
git commit -m "feat: add POST /api/admin/orders/[id]/send-onboarding"
```

---

## Task 15: End-to-end smoke test + deploy

- [ ] **Step 1: Start dev server and test full flow**

```bash
npm run dev
```

Test sequence:
1. Open http://localhost:3000 → click "Kup Basic" → lands on `/zamow?plan=basic&currency=pln`
2. Fill form with test data → submit → redirects to Stripe Checkout (or error if Stripe keys not set)
3. Open http://localhost:3000/admin → redirects to `/admin/login`
4. Login with Michał's credentials → redirects to `/admin/zamowienia`
5. If you created a test order in Supabase directly, it appears in list
6. Click order → see full detail page
7. Change status → dropdown updates immediately

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: no errors

- [ ] **Step 3: Run build**

```bash
npm run build
```

Expected: build completes successfully

- [ ] **Step 4: Commit if any fixes needed, then push**

```bash
git push origin HEAD
```

Vercel auto-deploys. Check Vercel deployment logs for any runtime errors.

- [ ] **Step 5: Add Supabase env vars to Vercel**

In Vercel dashboard → Settings → Environment Variables, add:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_EMAIL`

Redeploy if needed.

- [ ] **Step 6: Final commit**

```bash
git add -A
git status  # verify nothing unexpected
git commit -m "feat: complete order form + admin CMS implementation"
```

---

## Spec Coverage Check

| Spec Requirement | Task |
|---|---|
| `/zamow` form with all fields | Task 6 |
| POST /api/orders — save to Supabase | Task 4 |
| Stripe session created server-side with order_id | Task 4 |
| Webhook updates stripe_paid + stripe_session_id | Task 7 |
| /sukces page update | Task 8 |
| onboarding_token in DB schema | Task 1 (SQL) |
| GET /api/onboarding/[token] | Task 9 |
| POST /api/onboarding/[token] | Task 9 |
| /onboarding/[token] page | Task 10 |
| Admin middleware protecting /admin/* | Task 3 |
| /admin/login Supabase Auth | Task 11 |
| /admin/zamowienia list + filters | Task 12 |
| /admin/zamowienia/[id] detail + status change | Task 13 |
| POST /api/admin/orders/[id]/send-onboarding | Task 14 |
| Email: new order notification | Task 2 (email.ts) |
| Email: onboarding form link to client | Task 2 (email.ts) |
| Email: onboarding submitted notification | Task 2 (email.ts) |
| PricingCards navigate to /zamow | Task 5 |
| @supabase/supabase-js + @supabase/ssr installed | Task 1 |
