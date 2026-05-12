import crypto from 'crypto'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase'
import type { Site } from '@/lib/types'

const COOKIE_TTL_SECONDS = 7 * 24 * 60 * 60 // 7 dni

function jwtSecret(): string {
  const secret = process.env.OWNER_JWT_SECRET
    || (process.env.CRON_SECRET?.trim() || undefined)   // ignore empty string
    || (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)       // always present on Vercel
    || 'nobooking-owner-dev-secret'
  return secret
}

// ─── Hashowanie hasła (crypto.scryptSync — zero nowych zależności) ────────────

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

// ─── Token sesji (payload base64url + podpis HMAC-SHA256) ────────────────────

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

// ─── Weryfikacja sesji po stronie serwera ─────────────────────────────────────

/**
 * Dla API route handlers — czyta cookie z nagłówka Cookie requestu.
 * Zwraca dane site lub null (caller zwraca 401).
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
 * Dla server page components — czyta cookie przez next/headers.
 * Zwraca dane site lub przekierowuje na stronę logowania.
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
