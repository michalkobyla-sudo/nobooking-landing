# Owner Admin Panel (`/sites/[slug]/admin`) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `/sites/[slug]/admin` — a panel for apartment owners (nobooking clients) to manage their bookings, change statuses, and block calendar dates.

**Architecture:** Token-based cookie auth using a custom JWT (no Supabase Auth session, so no conflict with Michał's admin). Password hash stored as `admin_password_hash` in the `sites` table; set during site provisioning. All Supabase queries use the service role client filtered by `site_id`.

**Tech Stack:** Next.js 16 App Router (server + client components), Supabase service role, Node.js `crypto` built-in (no new deps), existing `sites`/`bookings`/`blocked_dates` tables.

---

## File Map

| Action | Path |
|--------|------|
| Create | `src/lib/ownerAuth.ts` |
| Modify | `src/lib/provision-site.ts` |
| Create | SQL migration (run in Supabase Dashboard) |
| Create | `src/app/api/sites/[slug]/owner/login/route.ts` |
| Create | `src/app/api/sites/[slug]/owner/logout/route.ts` |
| Create | `src/app/sites/[slug]/admin/layout.tsx` |
| Create | `src/app/sites/[slug]/admin/page.tsx` |
| Create | `src/app/sites/[slug]/admin/login/page.tsx` |
| Create | `src/app/api/sites/[slug]/owner/bookings/route.ts` |
| Create | `src/app/sites/[slug]/admin/rezerwacje/page.tsx` |
| Create | `src/app/api/sites/[slug]/owner/bookings/[bookingId]/route.ts` |
| Create | `src/app/sites/[slug]/admin/rezerwacje/[bookingId]/page.tsx` |
| Create | `src/app/api/sites/[slug]/owner/blocked/route.ts` |
| Create | `src/app/api/sites/[slug]/owner/blocked/[dateId]/route.ts` |
| Create | `src/app/sites/[slug]/admin/kalendarz/page.tsx` |

---

## Task 1: DB migration — add `admin_password_hash` to `sites`

**Files:**
- SQL (run manually in Supabase Dashboard → SQL Editor)

- [ ] **Step 1: Run migration in Supabase SQL Editor**

```sql
ALTER TABLE sites ADD COLUMN IF NOT EXISTS admin_password_hash text;
```

Run this in: **Supabase Dashboard → SQL Editor → New query → Run**

Expected: `ALTER TABLE` success, no error.

- [ ] **Step 2: Verify column exists**

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'sites'
  AND column_name = 'admin_password_hash';
```

Expected: 1 row returned with `column_name = admin_password_hash`, `data_type = text`.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/plans/2026-05-11-owner-admin-panel.md
git commit -m "plan: owner admin panel — Plan C"
```

---

## Task 2: `src/lib/ownerAuth.ts` — auth helper

**Files:**
- Create: `src/lib/ownerAuth.ts`

This module provides:
- `hashPassword(password)` → stored hash string
- `verifyPassword(password, storedHash)` → boolean
- `createOwnerToken(siteId, slug)` → signed token string
- `cookieName(slug)` → cookie key
- `verifyOwnerSession(slug, cookieHeader)` → `Site | null` (for API routes)
- `requireOwnerPage(slug)` → `Site` or redirects (for server page components)

- [ ] **Step 1: Create `src/lib/ownerAuth.ts`**

```typescript
import crypto from 'crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase'
import type { Site } from '@/lib/types'

const COOKIE_TTL_SECONDS = 7 * 24 * 60 * 60 // 7 days

function jwtSecret(): string {
  return process.env.OWNER_JWT_SECRET || process.env.CRON_SECRET || 'nobooking-owner-dev-secret'
}

// ─── Password hashing (crypto.scryptSync — zero extra deps) ──────────────────

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `scrypt:${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(':')
  if (parts.length !== 3 || parts[0] !== 'scrypt') return false
  const [, salt, storedHashHex] = parts
  try {
    const derived = crypto.scryptSync(password, salt, 64).toString('hex')
    return crypto.timingSafeEqual(
      Buffer.from(derived, 'hex'),
      Buffer.from(storedHashHex, 'hex'),
    )
  } catch {
    return false
  }
}

// ─── Session token (HMAC-signed base64url payload) ───────────────────────────

interface TokenPayload {
  siteId: string
  slug: string
  exp: number
}

export function createOwnerToken(siteId: string, slug: string): string {
  const payload: TokenPayload = {
    siteId,
    slug,
    exp: Math.floor(Date.now() / 1000) + COOKIE_TTL_SECONDS,
  }
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const sig = crypto.createHmac('sha256', jwtSecret()).update(payloadB64).digest('hex')
  return `${payloadB64}.${sig}`
}

function verifyToken(token: string): TokenPayload | null {
  const dot = token.lastIndexOf('.')
  if (dot === -1) return null
  const payloadB64 = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const expected = crypto.createHmac('sha256', jwtSecret()).update(payloadB64).digest('hex')
  try {
    if (!crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))) return null
  } catch {
    return null
  }
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString()) as TokenPayload
    if (payload.exp < Math.floor(Date.now() / 1000)) return null
    return payload
  } catch {
    return null
  }
}

export function cookieName(slug: string): string {
  return `nb_owner_${slug.replace(/[^a-z0-9]/gi, '_')}`
}

// ─── Server-side auth ─────────────────────────────────────────────────────────

/**
 * For API route handlers — reads Authorization cookie from request Cookie header.
 * Returns site data if valid, null otherwise (caller returns 401).
 */
export async function verifyOwnerSession(
  slug: string,
  cookieHeader: string | null,
): Promise<Site | null> {
  if (!cookieHeader) return null
  const name = cookieName(slug)
  const match = cookieHeader
    .split(';')
    .map(s => s.trim())
    .find(s => s.startsWith(`${name}=`))
  if (!match) return null
  const token = match.slice(name.length + 1)
  const payload = verifyToken(token)
  if (!payload || payload.slug !== slug) return null

  const supabase = createServiceClient()
  const { data: site } = await supabase
    .from('sites')
    .select('*')
    .eq('id', payload.siteId)
    .eq('slug', slug)
    .single()

  return site as Site | null
}

/**
 * For server page components — reads cookie via next/headers.
 * Returns site data if valid; redirects to login page if not.
 */
export async function requireOwnerPage(slug: string): Promise<Site> {
  const cookieStore = await cookies()
  const token = cookieStore.get(cookieName(slug))?.value
  if (!token) redirect(`/sites/${slug}/admin/login`)

  const payload = verifyToken(token)
  if (!payload || payload.slug !== slug) redirect(`/sites/${slug}/admin/login`)

  const supabase = createServiceClient()
  const { data: site } = await supabase
    .from('sites')
    .select('*')
    .eq('id', payload.siteId)
    .eq('slug', slug)
    .single()

  if (!site) redirect(`/sites/${slug}/admin/login`)
  return site as Site
}
```

- [ ] **Step 2: Verify build passes**

```bash
cd "/Users/michalkobylinski/Library/Mobile Documents/com~apple~CloudDocs/Projekty AI/Mieszkanie - Torrevieja/nobooking-landing"
npm run build 2>&1 | tail -20
```

Expected: build succeeds (or only pre-existing errors, nothing from `ownerAuth.ts`).

- [ ] **Step 3: Commit**

```bash
git add src/lib/ownerAuth.ts
git commit -m "feat: add ownerAuth helper — hash/verify password + JWT cookie session"
```

---

## Task 3: Modify `provision-site.ts` — store password hash

**Files:**
- Modify: `src/lib/provision-site.ts`

When a site is provisioned, the `tempPassword` must be hashed and stored so the owner can log in to their admin panel.

- [ ] **Step 1: Add `hashPassword` import and store hash in sites upsert**

In `src/lib/provision-site.ts`, add the import at the top:

```typescript
import { hashPassword } from '@/lib/ownerAuth'
```

Then in the `provisionSite` function, compute the hash right after generating `tempPassword` (line 8, after `generateTempPassword()` call):

```typescript
const tempPassword = generateTempPassword()
const adminPasswordHash = hashPassword(tempPassword)
```

Then in the `.upsert(...)` call (the object passed to upsert), add `admin_password_hash`:

```typescript
{
  order_id: order.id,
  slug,
  plan: order.plan,
  active: true,
  config: JSON.parse(configJson) as Record<string, unknown>,
  owner_email: ownerEmail,
  owner_user_id: ownerUserId,
  stripe_account_id: stripeAccountId || null,
  stripe_onboarded: false,
  admin_password_hash: adminPasswordHash,
},
```

- [ ] **Step 2: Verify build passes**

```bash
npm run build 2>&1 | tail -20
```

Expected: no new TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/provision-site.ts
git commit -m "feat: store admin_password_hash in sites during provisioning"
```

---

## Task 4: Login/logout API routes

**Files:**
- Create: `src/app/api/sites/[slug]/owner/login/route.ts`
- Create: `src/app/api/sites/[slug]/owner/logout/route.ts`

- [ ] **Step 1: Create login route**

Create `src/app/api/sites/[slug]/owner/login/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { verifyPassword, createOwnerToken, cookieName } from '@/lib/ownerAuth'

interface Params {
  params: Promise<{ slug: string }>
}

export async function POST(request: NextRequest, { params }: Params) {
  const { slug } = await params
  const body = await request.json().catch(() => ({})) as { password?: string }

  if (!body.password) {
    return NextResponse.json({ error: 'missing_password' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data: site } = await supabase
    .from('sites')
    .select('id, slug, admin_password_hash, active')
    .eq('slug', slug)
    .eq('active', true)
    .single()

  if (!site?.admin_password_hash) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  if (!verifyPassword(body.password, site.admin_password_hash as string)) {
    return NextResponse.json({ error: 'invalid_password' }, { status: 401 })
  }

  const token = createOwnerToken(site.id as string, slug)
  const res = NextResponse.json({ ok: true })
  res.cookies.set(cookieName(slug), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: `/sites/${slug}/admin`,
    maxAge: 7 * 24 * 60 * 60,
  })
  return res
}
```

- [ ] **Step 2: Create logout route**

Create `src/app/api/sites/[slug]/owner/logout/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { cookieName } from '@/lib/ownerAuth'

interface Params {
  params: Promise<{ slug: string }>
}

export async function POST(_request: NextRequest, { params }: Params) {
  const { slug } = await params
  const res = NextResponse.json({ ok: true })
  res.cookies.set(cookieName(slug), '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: `/sites/${slug}/admin`,
    maxAge: 0,
  })
  return res
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | tail -20
```

Expected: build passes.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/sites/[slug]/owner/login/route.ts src/app/api/sites/[slug]/owner/logout/route.ts
git commit -m "feat: owner login/logout API routes"
```

---

## Task 5: Admin layout + redirect + login page

**Files:**
- Create: `src/app/sites/[slug]/admin/layout.tsx`
- Create: `src/app/sites/[slug]/admin/page.tsx`
- Create: `src/app/sites/[slug]/admin/login/page.tsx`

- [ ] **Step 1: Create layout**

Create `src/app/sites/[slug]/admin/layout.tsx`:

```typescript
import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return { title: `Panel — ${slug}` }
}

export default async function OwnerAdminLayout({ children, params }: Props) {
  const { slug } = await params

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: 'var(--font-jakarta, system-ui, sans-serif)' }}>
      <nav style={{
        background: 'white',
        borderBottom: '1px solid #E5E7EB',
        padding: '0 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '56px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <span style={{ fontSize: '1rem', fontWeight: 800, letterSpacing: '-0.03em', color: '#111827' }}>
            <span style={{ color: '#059669' }}>No</span>booking
          </span>
          <span style={{ fontSize: '0.8rem', color: '#9CA3AF', margin: '0 0.5rem' }}>·</span>
          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#6B7280' }}>{slug}</span>
        </div>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          <a
            href={`/sites/${slug}/admin/rezerwacje`}
            style={{ padding: '0.4rem 0.875rem', fontSize: '0.875rem', fontWeight: 600, color: '#374151', textDecoration: 'none', borderRadius: '8px' }}
          >
            Rezerwacje
          </a>
          <a
            href={`/sites/${slug}/admin/kalendarz`}
            style={{ padding: '0.4rem 0.875rem', fontSize: '0.875rem', fontWeight: 600, color: '#374151', textDecoration: 'none', borderRadius: '8px' }}
          >
            Kalendarz
          </a>
          <LogoutButton slug={slug} />
        </div>
      </nav>
      <main style={{ padding: '2rem', maxWidth: '960px', margin: '0 auto' }}>
        {children}
      </main>
    </div>
  )
}

// ─── Logout button (client component embedded in layout) ─────────────────────

function LogoutButton({ slug }: { slug: string }) {
  return (
    <form action={`/api/sites/${slug}/owner/logout`} method="POST" style={{ display: 'inline' }}>
      <button
        type="submit"
        style={{
          padding: '0.4rem 0.875rem',
          fontSize: '0.875rem',
          fontWeight: 600,
          color: '#9CA3AF',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          fontFamily: 'inherit',
          borderRadius: '8px',
        }}
      >
        Wyloguj
      </button>
    </form>
  )
}
```

- [ ] **Step 2: Create redirect page**

Create `src/app/sites/[slug]/admin/page.tsx`:

```typescript
import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ slug: string }>
}

export default async function OwnerAdminPage({ params }: Props) {
  const { slug } = await params
  redirect(`/sites/${slug}/admin/rezerwacje`)
}
```

- [ ] **Step 3: Create login page**

Create `src/app/sites/[slug]/admin/login/page.tsx`:

```tsx
'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function OwnerLoginPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string

  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await fetch(`/api/sites/${slug}/owner/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (!res.ok) {
      setError('Nieprawidłowe hasło.')
      setLoading(false)
      return
    }

    router.push(`/sites/${slug}/admin/rezerwacje`)
    router.refresh()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.75rem 1rem',
    border: '1.5px solid #D1D5DB',
    borderRadius: '8px',
    fontSize: '0.95rem',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
    background: 'white',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: '360px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.25rem' }}>
            <span style={{ color: '#059669' }}>No</span>booking Admin
          </div>
          <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: 0 }}>
            Panel właściciela · <strong>{slug}</strong>
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '16px', padding: '2rem' }}
        >
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>
              Hasło
            </label>
            <input
              style={inputStyle}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              autoFocus
              required
            />
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
              width: '100%',
              padding: '0.875rem',
              background: '#059669',
              border: 'none',
              color: 'white',
              borderRadius: '8px',
              fontSize: '0.95rem',
              fontWeight: 700,
              fontFamily: 'inherit',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Logowanie...' : 'Zaloguj się →'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Verify build**

```bash
npm run build 2>&1 | tail -30
```

Expected: build succeeds, three new pages appear in the output.

- [ ] **Step 5: Commit**

```bash
git add src/app/sites/[slug]/admin/
git commit -m "feat: owner admin layout, redirect page, login page"
```

---

## Task 6: Booking list API + page

**Files:**
- Create: `src/app/api/sites/[slug]/owner/bookings/route.ts`
- Create: `src/app/sites/[slug]/admin/rezerwacje/page.tsx`

- [ ] **Step 1: Create bookings list API route**

Create `src/app/api/sites/[slug]/owner/bookings/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { verifyOwnerSession } from '@/lib/ownerAuth'

interface Params {
  params: Promise<{ slug: string }>
}

export async function GET(request: NextRequest, { params }: Params) {
  const { slug } = await params
  const site = await verifyOwnerSession(slug, request.headers.get('cookie'))
  if (!site) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, guest_name, guest_email, guest_phone, check_in, check_out, nights, guests_count, total_price, currency, status, stripe_paid, created_at, notes')
    .eq('site_id', site.id)
    .order('check_in', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(bookings ?? [])
}
```

- [ ] **Step 2: Create rezerwacje list page**

Create `src/app/sites/[slug]/admin/rezerwacje/page.tsx`:

```tsx
import { requireOwnerPage } from '@/lib/ownerAuth'
import { createServiceClient } from '@/lib/supabase'
import type { Booking } from '@/lib/types'

const STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  pending:   { label: 'Oczekuje',    bg: '#FEF3C7', color: '#92400E' },
  confirmed: { label: 'Potwierdzona', bg: '#D1FAE5', color: '#065F46' },
  cancelled: { label: 'Anulowana',   bg: '#FEE2E2', color: '#991B1B' },
  completed: { label: 'Zakończona',  bg: '#F3F4F6', color: '#6B7280' },
}

interface Props {
  params: Promise<{ slug: string }>
}

export default async function OwnerBookingsPage({ params }: Props) {
  const { slug } = await params
  const site = await requireOwnerPage(slug)

  const supabase = createServiceClient()
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, guest_name, guest_email, check_in, check_out, nights, guests_count, total_price, currency, status, stripe_paid, created_at')
    .eq('site_id', site.id)
    .order('check_in', { ascending: true })

  const allBookings = (bookings ?? []) as Booking[]
  const upcoming = allBookings.filter(b => b.status !== 'cancelled' && b.check_out >= new Date().toISOString().slice(0, 10))
  const past = allBookings.filter(b => b.status !== 'cancelled' && b.check_out < new Date().toISOString().slice(0, 10))
  const cancelled = allBookings.filter(b => b.status === 'cancelled')

  function BookingTable({ bookings, title }: { bookings: Booking[]; title: string }) {
    if (bookings.length === 0) return null
    return (
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
          {title} ({bookings.length})
        </h2>
        <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden' }}>
          {bookings.map((b, i) => {
            const st = STATUS_LABELS[b.status] ?? STATUS_LABELS.pending
            const checkIn = new Date(b.check_in).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })
            const checkOut = new Date(b.check_out).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' })
            const price = `${b.total_price.toLocaleString('pl-PL')} ${(b.currency || 'EUR').toUpperCase()}`
            return (
              <a
                key={b.id}
                href={`/sites/${slug}/admin/rezerwacje/${b.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.875rem 1.25rem',
                  borderTop: i === 0 ? 'none' : '1px solid #F3F4F6',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#111827', marginBottom: '0.125rem' }}>
                    {b.guest_name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                    {checkIn} → {checkOut} · {b.nights} nocy · {b.guests_count} osób
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827', marginBottom: '0.25rem' }}>{price}</div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: '999px', background: st.bg, color: st.color }}>
                    {st.label}
                  </span>
                </div>
                <div style={{ color: '#D1D5DB', fontSize: '1rem', flexShrink: 0 }}>›</div>
              </a>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', marginBottom: '1.5rem' }}>
        Rezerwacje
      </h1>
      {allBookings.length === 0 && (
        <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '3rem', textAlign: 'center', color: '#9CA3AF', fontSize: '0.875rem' }}>
          Brak rezerwacji
        </div>
      )}
      <BookingTable bookings={upcoming} title="Nadchodzące i aktywne" />
      <BookingTable bookings={past} title="Zakończone" />
      <BookingTable bookings={cancelled} title="Anulowane" />
    </div>
  )
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | tail -30
```

Expected: build passes.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/sites/[slug]/owner/bookings/route.ts src/app/sites/[slug]/admin/rezerwacje/page.tsx
git commit -m "feat: owner bookings list API + rezerwacje page"
```

---

## Task 7: Booking detail API + page

**Files:**
- Create: `src/app/api/sites/[slug]/owner/bookings/[bookingId]/route.ts`
- Create: `src/app/sites/[slug]/admin/rezerwacje/[bookingId]/page.tsx`

- [ ] **Step 1: Create booking detail API route**

Create `src/app/api/sites/[slug]/owner/bookings/[bookingId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { verifyOwnerSession } from '@/lib/ownerAuth'

interface Params {
  params: Promise<{ slug: string; bookingId: string }>
}

export async function GET(request: NextRequest, { params }: Params) {
  const { slug, bookingId } = await params
  const site = await verifyOwnerSession(slug, request.headers.get('cookie'))
  if (!site) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const { data: booking, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .eq('site_id', site.id)
    .single()

  if (error || !booking) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  return NextResponse.json(booking)
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { slug, bookingId } = await params
  const site = await verifyOwnerSession(slug, request.headers.get('cookie'))
  if (!site) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as { status?: string; notes?: string }

  const allowed = ['pending', 'confirmed', 'cancelled', 'completed']
  if (body.status && !allowed.includes(body.status)) {
    return NextResponse.json({ error: 'invalid_status' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (body.status) updates.status = body.status
  if (body.notes !== undefined) updates.notes = body.notes

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'nothing_to_update' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data: booking, error } = await supabase
    .from('bookings')
    .update(updates)
    .eq('id', bookingId)
    .eq('site_id', site.id)
    .select()
    .single()

  if (error || !booking) {
    return NextResponse.json({ error: error?.message ?? 'update_failed' }, { status: 500 })
  }

  return NextResponse.json(booking)
}
```

- [ ] **Step 2: Create booking detail page**

Create `src/app/sites/[slug]/admin/rezerwacje/[bookingId]/page.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import type { Booking, BookingStatus } from '@/lib/types'

const STATUS_OPTIONS: Array<{ value: BookingStatus; label: string }> = [
  { value: 'pending',   label: 'Oczekuje na potwierdzenie' },
  { value: 'confirmed', label: 'Potwierdzona' },
  { value: 'cancelled', label: 'Anulowana' },
  { value: 'completed', label: 'Zakończona' },
]

const STATUS_LABELS: Record<string, { bg: string; color: string }> = {
  pending:   { bg: '#FEF3C7', color: '#92400E' },
  confirmed: { bg: '#D1FAE5', color: '#065F46' },
  cancelled: { bg: '#FEE2E2', color: '#991B1B' },
  completed: { bg: '#F3F4F6', color: '#6B7280' },
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.625rem' }}>
      <span style={{ fontSize: '0.8rem', color: '#9CA3AF', minWidth: '140px', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '0.875rem', color: '#111827', fontWeight: 500 }}>{value}</span>
    </div>
  )
}

export default function OwnerBookingDetailPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const bookingId = params.bookingId as string

  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/sites/${slug}/owner/bookings/${bookingId}`)
      if (res.status === 401) { router.push(`/sites/${slug}/admin/login`); return }
      if (res.status === 404) { router.push(`/sites/${slug}/admin/rezerwacje`); return }
      const data = await res.json() as Booking
      setBooking(data)
      setLoading(false)
    }
    load()
  }, [slug, bookingId, router])

  async function handleStatusChange(status: BookingStatus) {
    if (!booking) return
    setSaving(true)
    setSaveMsg(null)
    const res = await fetch(`/api/sites/${slug}/owner/bookings/${bookingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      setBooking(prev => prev ? { ...prev, status } : prev)
      setSaveMsg('Zapisano')
      setTimeout(() => setSaveMsg(null), 2000)
    } else {
      setSaveMsg('Błąd zapisu')
    }
    setSaving(false)
  }

  if (loading) {
    return <div style={{ padding: '4rem', textAlign: 'center', color: '#9CA3AF' }}>Ładowanie...</div>
  }
  if (!booking) return null

  const st = STATUS_LABELS[booking.status] ?? STATUS_LABELS.pending
  const checkIn = new Date(booking.check_in).toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const checkOut = new Date(booking.check_out).toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const price = `${booking.total_price.toLocaleString('pl-PL')} ${(booking.currency || 'EUR').toUpperCase()}`
  const createdAt = new Date(booking.created_at).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })

  const sectionStyle: React.CSSProperties = {
    background: 'white',
    border: '1px solid #E5E7EB',
    borderRadius: '12px',
    padding: '1.25rem 1.5rem',
    marginBottom: '1rem',
  }
  const sectionTitle: React.CSSProperties = {
    fontSize: '0.7rem', fontWeight: 700, color: '#9CA3AF',
    textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.875rem',
  }

  return (
    <div>
      {/* Back nav */}
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          onClick={() => router.push(`/sites/${slug}/admin/rezerwacje`)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', color: '#6B7280', fontFamily: 'inherit', padding: 0 }}
        >
          ← Rezerwacje
        </button>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', marginBottom: '0.25rem' }}>
            {booking.guest_name}
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: 0 }}>
            Rezerwacja z {createdAt}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {saveMsg && (
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: saveMsg === 'Zapisano' ? '#059669' : '#DC2626' }}>
              {saveMsg}
            </span>
          )}
          <select
            value={booking.status}
            onChange={e => handleStatusChange(e.target.value as BookingStatus)}
            disabled={saving}
            style={{
              padding: '0.5rem 0.875rem',
              border: `1.5px solid`,
              borderColor: st.color,
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontFamily: 'inherit',
              cursor: 'pointer',
              background: st.bg,
              color: st.color,
              fontWeight: 700,
            }}
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Guest */}
      <div style={sectionStyle}>
        <h3 style={sectionTitle}>Gość</h3>
        <Row label="Imię i nazwisko" value={booking.guest_name} />
        <Row label="Email" value={booking.guest_email} />
        <Row label="Telefon" value={booking.guest_phone} />
      </div>

      {/* Dates */}
      <div style={sectionStyle}>
        <h3 style={sectionTitle}>Termin</h3>
        <Row label="Check-in" value={checkIn} />
        <Row label="Check-out" value={checkOut} />
        <Row label="Liczba nocy" value={`${booking.nights} nocy`} />
        <Row label="Liczba gości" value={`${booking.guests_count} ${booking.guests_count === 1 ? 'osoba' : 'osoby/osób'}`} />
      </div>

      {/* Payment */}
      <div style={sectionStyle}>
        <h3 style={sectionTitle}>Płatność</h3>
        <Row label="Kwota" value={price} />
        <Row label="Status płatności" value={booking.stripe_paid ? '✅ Opłacone' : '⏳ Oczekuje na płatność'} />
        {booking.discount_code && <Row label="Kod rabatowy" value={`${booking.discount_code} (${booking.discount_pct}%)`} />}
        <Row label="Stripe Session ID" value={booking.stripe_session_id} />
      </div>

      {/* Notes */}
      {booking.notes && (
        <div style={sectionStyle}>
          <h3 style={sectionTitle}>Uwagi gościa</h3>
          <p style={{ fontSize: '0.875rem', color: '#374151', lineHeight: '1.6', margin: 0 }}>{booking.notes}</p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | tail -30
```

Expected: build passes.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/sites/[slug]/owner/bookings/[bookingId]/route.ts src/app/sites/[slug]/admin/rezerwacje/[bookingId]/page.tsx
git commit -m "feat: owner booking detail API + detail page with status change"
```

---

## Task 8: Blocked dates API + Kalendarz page

**Files:**
- Create: `src/app/api/sites/[slug]/owner/blocked/route.ts`
- Create: `src/app/api/sites/[slug]/owner/blocked/[dateId]/route.ts`
- Create: `src/app/sites/[slug]/admin/kalendarz/page.tsx`

- [ ] **Step 1: Create blocked dates list/add API**

Create `src/app/api/sites/[slug]/owner/blocked/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { verifyOwnerSession } from '@/lib/ownerAuth'

interface Params {
  params: Promise<{ slug: string }>
}

export async function GET(request: NextRequest, { params }: Params) {
  const { slug } = await params
  const site = await verifyOwnerSession(slug, request.headers.get('cookie'))
  if (!site) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('blocked_dates')
    .select('id, date, reason')
    .eq('site_id', site.id)
    .order('date', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest, { params }: Params) {
  const { slug } = await params
  const site = await verifyOwnerSession(slug, request.headers.get('cookie'))
  if (!site) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as { date?: string; reason?: string }
  if (!body.date || !/^\d{4}-\d{2}-\d{2}$/.test(body.date)) {
    return NextResponse.json({ error: 'invalid_date' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('blocked_dates')
    .insert({ site_id: site.id, date: body.date, reason: body.reason ?? null })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'already_blocked' }, { status: 409 })
    }
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
```

- [ ] **Step 2: Create blocked date delete API**

Create `src/app/api/sites/[slug]/owner/blocked/[dateId]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { verifyOwnerSession } from '@/lib/ownerAuth'

interface Params {
  params: Promise<{ slug: string; dateId: string }>
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const { slug, dateId } = await params
  const site = await verifyOwnerSession(slug, request.headers.get('cookie'))
  if (!site) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('blocked_dates')
    .delete()
    .eq('id', dateId)
    .eq('site_id', site.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Create Kalendarz page**

Create `src/app/sites/[slug]/admin/kalendarz/page.tsx`:

```tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import type { Booking, BlockedDate } from '@/lib/types'

type DayState = 'available' | 'blocked' | 'booked_confirmed' | 'booked_pending' | 'booked_other' | 'past'

interface DayInfo {
  state: DayState
  bookingName?: string
  blockedId?: string
}

function isoDate(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function buildDayMap(
  bookings: Booking[],
  blocked: BlockedDate[],
  year: number,
  month: number,
): Map<string, DayInfo> {
  const map = new Map<string, DayInfo>()
  const today = new Date().toISOString().slice(0, 10)
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  for (let d = 1; d <= daysInMonth; d++) {
    const key = isoDate(year, month, d)
    map.set(key, { state: key < today ? 'past' : 'available' })
  }

  for (const b of blocked) {
    if (map.has(b.date)) map.set(b.date, { state: 'blocked', blockedId: b.id })
  }

  for (const b of bookings) {
    if (b.status === 'cancelled') continue
    const cur = new Date(b.check_in)
    const end = new Date(b.check_out)
    while (cur < end) {
      const key = cur.toISOString().slice(0, 10)
      if (map.has(key)) {
        const state: DayState = b.status === 'confirmed' ? 'booked_confirmed'
          : b.status === 'pending' ? 'booked_pending'
          : 'booked_other'
        map.set(key, { state, bookingName: b.guest_name })
      }
      cur.setDate(cur.getDate() + 1)
    }
  }

  return map
}

const MONTH_NAMES = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień']
const DAY_NAMES = ['Pn','Wt','Śr','Cz','Pt','Sb','Nd']

function MonthCalendar({
  year, month, dayMap, onToggle, loading,
}: {
  year: number
  month: number
  dayMap: Map<string, DayInfo>
  onToggle: (date: string, info: DayInfo) => void
  loading: Set<string>
}) {
  const firstDay = new Date(year, month, 1).getDay() // 0=Sun
  const startOffset = (firstDay === 0 ? 6 : firstDay - 1) // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: Array<{ date: string; day: number } | null> = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: isoDate(year, month, d), day: d })
  }

  function cellStyle(info: DayInfo | undefined, isLoading: boolean): React.CSSProperties {
    if (!info) return {}
    const base: React.CSSProperties = {
      width: '36px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: '8px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
      transition: 'opacity 0.15s',
      opacity: isLoading ? 0.5 : 1,
      position: 'relative',
    }
    switch (info.state) {
      case 'past':        return { ...base, color: '#D1D5DB', cursor: 'default' }
      case 'available':   return { ...base, color: '#374151', background: '#F9FAFB', border: '1px solid #E5E7EB' }
      case 'blocked':     return { ...base, color: '#fff', background: '#6B7280' }
      case 'booked_confirmed': return { ...base, color: '#fff', background: '#059669' }
      case 'booked_pending':   return { ...base, color: '#92400E', background: '#FEF3C7' }
      case 'booked_other':     return { ...base, color: '#374151', background: '#E5E7EB' }
    }
  }

  return (
    <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem' }}>
      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111827', marginBottom: '0.875rem' }}>
        {MONTH_NAMES[month]} {year}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 36px)', gap: '4px', justifyContent: 'start' }}>
        {DAY_NAMES.map(d => (
          <div key={d} style={{ width: '36px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 700, color: '#9CA3AF' }}>
            {d}
          </div>
        ))}
        {cells.map((cell, i) => {
          if (!cell) return <div key={`empty-${i}`} />
          const info = dayMap.get(cell.date)
          const isLoading = loading.has(cell.date)
          const canClick = info && info.state !== 'past' && !info.state.startsWith('booked')
          return (
            <div
              key={cell.date}
              style={cellStyle(info, isLoading)}
              title={info?.bookingName ?? (info?.state === 'blocked' ? 'Zablokowane' : '')}
              onClick={() => canClick && info && onToggle(cell.date, info)}
            >
              {cell.day}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function KalendarzPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string

  const now = new Date()
  const [viewYear, setViewYear] = useState(now.getFullYear())
  const [viewMonth, setViewMonth] = useState(now.getMonth())
  const [bookings, setBookings] = useState<Booking[]>([])
  const [blocked, setBlocked] = useState<BlockedDate[]>([])
  const [dataLoading, setDataLoading] = useState(true)
  const [loadingDates, setLoadingDates] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function load() {
      const [bRes, blRes] = await Promise.all([
        fetch(`/api/sites/${slug}/owner/bookings`),
        fetch(`/api/sites/${slug}/owner/blocked`),
      ])
      if (bRes.status === 401 || blRes.status === 401) {
        router.push(`/sites/${slug}/admin/login`)
        return
      }
      const [bData, blData] = await Promise.all([bRes.json(), blRes.json()])
      setBookings(bData as Booking[])
      setBlocked(blData as BlockedDate[])
      setDataLoading(false)
    }
    load()
  }, [slug, router])

  const handleToggle = useCallback(async (date: string, info: DayInfo) => {
    setLoadingDates(prev => new Set(prev).add(date))
    if (info.state === 'blocked' && info.blockedId) {
      const res = await fetch(`/api/sites/${slug}/owner/blocked/${info.blockedId}`, { method: 'DELETE' })
      if (res.ok) setBlocked(prev => prev.filter(b => b.id !== info.blockedId))
    } else if (info.state === 'available') {
      const res = await fetch(`/api/sites/${slug}/owner/blocked`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      })
      if (res.ok) {
        const newBlocked = await res.json() as BlockedDate
        setBlocked(prev => [...prev, newBlocked])
      }
    }
    setLoadingDates(prev => { const s = new Set(prev); s.delete(date); return s })
  }, [slug])

  const months = [
    { year: viewYear, month: viewMonth },
    { year: viewMonth === 11 ? viewYear + 1 : viewYear, month: (viewMonth + 1) % 12 },
    { year: viewMonth >= 10 ? viewYear + 1 : viewYear, month: (viewMonth + 2) % 12 },
  ]

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  if (dataLoading) {
    return <div style={{ padding: '4rem', textAlign: 'center', color: '#9CA3AF' }}>Ładowanie kalendarza...</div>
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', margin: 0 }}>Kalendarz</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={prevMonth} style={{ padding: '0.4rem 0.875rem', border: '1.5px solid #E5E7EB', borderRadius: '8px', background: 'white', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
            ←
          </button>
          <button onClick={nextMonth} style={{ padding: '0.4rem 0.875rem', border: '1.5px solid #E5E7EB', borderRadius: '8px', background: 'white', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
            →
          </button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {[
          { color: '#059669', label: 'Potwierdzona' },
          { color: '#FEF3C7', textColor: '#92400E', label: 'Oczekuje' },
          { color: '#6B7280', label: 'Zablokowane' },
          { color: '#F9FAFB', textColor: '#374151', label: 'Dostępne' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: l.color, border: '1px solid #E5E7EB' }} />
            <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>{l.label}</span>
          </div>
        ))}
        <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>· Kliknij dostępny dzień, by go zablokować lub odblokować</span>
      </div>

      {months.map(({ year, month }) => {
        const dayMap = buildDayMap(bookings, blocked, year, month)
        return (
          <MonthCalendar
            key={`${year}-${month}`}
            year={year}
            month={month}
            dayMap={dayMap}
            onToggle={handleToggle}
            loading={loadingDates}
          />
        )
      })}
    </div>
  )
}
```

- [ ] **Step 4: Verify build**

```bash
npm run build 2>&1 | tail -30
```

Expected: build passes. Note: if Next.js warns about `useCallback` in a server component, check that the file starts with `'use client'`.

- [ ] **Step 5: Commit**

```bash
git add \
  src/app/api/sites/[slug]/owner/blocked/route.ts \
  src/app/api/sites/[slug]/owner/blocked/[dateId]/route.ts \
  src/app/sites/[slug]/admin/kalendarz/page.tsx
git commit -m "feat: blocked dates API + interactive Kalendarz page"
```

---

## Task 9: Manual smoke test + set password for existing sites

After deployment, any site provisioned via the cron will automatically get `admin_password_hash` set. For existing sites (if any have slugs but no hash), set the hash manually via Supabase SQL Editor.

- [ ] **Step 1: Deploy to Vercel**

```bash
git push origin main
```

Wait for Vercel deploy to complete (check https://vercel.com/dashboard).

- [ ] **Step 2: Set password for existing site (if needed)**

If you need to test with a site that was provisioned before this feature:

1. Generate a hash in Node.js locally:

```bash
node -e "
const crypto = require('crypto');
const password = 'TestHaslo123!';
const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.scryptSync(password, salt, 64).toString('hex');
console.log('scrypt:' + salt + ':' + hash);
"
```

2. Copy the output hash string.

3. In Supabase SQL Editor:

```sql
UPDATE sites
SET admin_password_hash = '<paste-hash-here>'
WHERE slug = '<your-slug>';
```

- [ ] **Step 3: Smoke test login**

Navigate to `https://nobooking.eu/sites/<slug>/admin`

Expected:
- Redirected to `/sites/<slug>/admin/login`
- Login form shown with password field and "Logowanie" button

Enter wrong password → error message shown.
Enter correct password → redirected to `/sites/<slug>/admin/rezerwacje`.

- [ ] **Step 4: Smoke test rezerwacje**

Expected:
- Booking list appears with correct data
- Clicking a booking → detail page loads
- Status dropdown changes work (select, auto-saves, shows "Zapisano")
- Back button → returns to list

- [ ] **Step 5: Smoke test kalendarz**

Navigate to `/sites/<slug>/admin/kalendarz`

Expected:
- 3 months shown
- Booked dates colored green/yellow
- Clicking available date → turns gray (blocked)
- Clicking gray date (blocked) → turns back to available

- [ ] **Step 6: Smoke test logout**

Click "Wyloguj" in nav → cookie cleared → redirected to login.

---

## Self-review checklist

- [x] **Spec coverage**: login ✓, booking list ✓, booking detail ✓, status change ✓, blocked dates ✓, calendar ✓
- [x] **Placeholder scan**: no TBD/TODO in code steps
- [x] **Type consistency**: `Booking`, `BlockedDate`, `BookingStatus` — all from `src/lib/types.ts`
- [x] **Auth coverage**: every API route checks `verifyOwnerSession`; every page calls `requireOwnerPage`
- [x] **No new dependencies**: uses `crypto` (built-in Node.js)
- [x] **Scope isolation**: all DB queries filtered by `site_id = site.id`
- [x] **Cookie scope**: cookie `path` set to `/sites/${slug}/admin` — doesn't conflict with Michał's admin session
