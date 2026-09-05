import crypto from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase'
import { createConnectAccount } from '@/lib/stripe-connect'
import { hashPassword } from '@/lib/ownerAuth'
import { toSlug } from '@/lib/generate-site'
import { PRICES } from '@/lib/prices'
import type { Order } from '@/lib/types'

const TEMP_PASSWORD_LENGTH = 12
const PASSWORD_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#'

/** Ile wariantów slugu spróbować, zanim uznamy to za błąd. */
const MAX_SLUG_ATTEMPTS = 50

/** Kod błędu Postgresa dla naruszenia unikalności. */
const PG_UNIQUE_VIOLATION = '23505'

/**
 * Hasło tymczasowe właściciela.
 *
 * crypto.randomInt, nie Math.random — to hasło trafia jednocześnie do konta
 * Supabase Auth i do panelu właściciela. Math.random w V8 to xorshift128+,
 * którego stan da się odtworzyć z kilku kolejnych wyników; przy provisioningu
 * seryjnym oznaczało to, że znajomość jednego hasła pomaga przewidzieć kolejne.
 * randomInt robi też rejection sampling, więc nie ma przesunięcia modulo.
 */
function generateTempPassword(): string {
  return Array.from({ length: TEMP_PASSWORD_LENGTH }, () =>
    PASSWORD_CHARS[crypto.randomInt(PASSWORD_CHARS.length)]
  ).join('')
}

export interface ProvisionResult {
  siteId: string
  slug: string
  ownerUserId: string
  stripeAccountId: string
  tempPassword: string
}

/**
 * Znajduje id użytkownika Auth po adresie email.
 *
 * listUsers() zwraca domyślnie tylko pierwszą stronę (50 kont), więc przy
 * większej liczbie klientów poprzednia wersja przestawała znajdować istniejące
 * konta i provisioning zatrzymywał się na stałe.
 */
async function findAuthUserIdByEmail(
  supabase: SupabaseClient,
  email: string,
): Promise<string | null> {
  const perPage = 200
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error(`listUsers failed: ${error.message}`)

    const match = data?.users?.find(u => u.email?.toLowerCase() === email)
    if (match) return match.id

    if (!data?.users || data.users.length < perPage) return null // ostatnia strona
  }
  return null
}

/**
 * Wstawia wiersz `sites`, dobierając wolny slug.
 *
 * Wcześniej był tu upsert z onConflict: 'slug', który przy dwóch klientach o tej
 * samej nazwie apartamentu **nadpisywał stronę pierwszego** — razem z jego
 * hasłem, kontem Stripe i configiem. Teraz kolizja to zwykły insert, który się
 * nie powiódł, więc próbujemy kolejnego wariantu (casa-sol, casa-sol-2, ...).
 *
 * Wstępne sprawdzenie zajętości to tylko skrót; rozstrzyga dopiero unikalny
 * indeks w bazie, bo między selectem a insertem zawsze jest okno wyścigu.
 */
async function insertSiteWithFreeSlug(
  supabase: SupabaseClient,
  baseSlug: string,
  row: Record<string, unknown>,
): Promise<{ siteId: string; slug: string }> {
  for (let attempt = 1; attempt <= MAX_SLUG_ATTEMPTS; attempt++) {
    const slug = attempt === 1 ? baseSlug : `${baseSlug}-${attempt}`

    const { data: taken } = await supabase
      .from('sites')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (taken) continue

    const { data, error } = await supabase
      .from('sites')
      .insert({ ...row, slug })
      .select('id')
      .single()

    if (!error && data) {
      return { siteId: data.id as string, slug }
    }

    if (error?.code === PG_UNIQUE_VIOLATION) {
      continue // ktoś zajął slug między naszym selectem a insertem
    }

    throw new Error(`Site record creation failed: ${error?.message ?? 'unknown'}`)
  }

  throw new Error(
    `Nie znaleziono wolnego slugu dla "${baseSlug}" po ${MAX_SLUG_ATTEMPTS} próbach`,
  )
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
  configJson: string,
): Promise<ProvisionResult> {
  const supabase = createServiceClient()
  const ownerEmail = (order.ob_contact_email ?? order.email).toLowerCase().trim()

  // ── 0. Czy to zamówienie ma już stronę? ─────────────────────────────────────
  // Provisioning bywa wznawiany (błąd sieci, timeout funkcji). Bez tej kontroli
  // wznowienie tworzyłoby drugą stronę dla tego samego klienta.
  const { data: existingSite } = await supabase
    .from('sites')
    .select('id, slug, owner_user_id, stripe_account_id')
    .eq('order_id', order.id)
    .maybeSingle()

  if (existingSite) {
    console.log(`[provision-site] order ${order.id} ma już stronę "${existingSite.slug as string}" — pomijam`)
    return {
      siteId: existingSite.id as string,
      slug: existingSite.slug as string,
      ownerUserId: (existingSite.owner_user_id as string | null) ?? '',
      stripeAccountId: (existingSite.stripe_account_id as string | null) ?? '',
      tempPassword: '(strona już istniała — hasło bez zmian)',
    }
  }

  // ── 1. Create Supabase Auth user ────────────────────────────────────────────
  const tempPassword = generateTempPassword()
  const adminPasswordHash = hashPassword(tempPassword)

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: ownerEmail,
    password: tempPassword,
    email_confirm: true,
  })

  let ownerUserId: string

  if (authError) {
    if (authError.message.toLowerCase().includes('already been registered') ||
        authError.message.toLowerCase().includes('already exists')) {
      // User exists — find their id
      const existingId = await findAuthUserIdByEmail(supabase, ownerEmail)
      if (!existingId) throw new Error(`Auth user not found for ${ownerEmail}`)
      ownerUserId = existingId
    } else {
      throw new Error(`Auth user creation failed: ${authError.message}`)
    }
  } else {
    ownerUserId = authData.user!.id
  }

  // ── 2. Create Stripe Connect Express account ─────────────────────────────
  let stripeAccountId = ''
  try {
    stripeAccountId = await createConnectAccount(ownerEmail)
  } catch (err) {
    // Non-fatal — owner can connect Stripe later via the admin panel
    console.error('[provision-site] Stripe Connect error (non-fatal):', err)
  }

  // ── 3. Insert site record ────────────────────────────────────────────────
  // Lock renewal price at current prices — client keeps this price forever
  const plan = order.plan as 'basic' | 'pro'
  const currency = (order.currency ?? 'pln') as 'pln' | 'eur'
  const renewalPricePln = PRICES[plan].pln
  const renewalPriceEur = PRICES[plan].eur
  const expiresAt = new Date(Date.now() + 2 * 365.25 * 24 * 60 * 60 * 1000).toISOString()

  const baseSlug = toSlug(order.apartment_name)

  const { siteId, slug } = await insertSiteWithFreeSlug(supabase, baseSlug, {
    order_id: order.id,
    plan: order.plan,
    active: true,
    config: JSON.parse(configJson) as Record<string, unknown>,
    owner_email: ownerEmail,
    owner_user_id: ownerUserId,
    stripe_account_id: stripeAccountId || null,
    stripe_onboarded: false,
    admin_password_hash: adminPasswordHash,
    expires_at: expiresAt,
    renewal_price_pln: renewalPricePln,
    renewal_price_eur: renewalPriceEur,
    renewal_currency: currency,
  })

  return {
    siteId,
    slug,
    ownerUserId,
    stripeAccountId,
    tempPassword: authError ? '(konto już istnieje — hasło bez zmian)' : tempPassword,
  }
}
