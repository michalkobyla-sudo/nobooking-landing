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
  const ownerEmail = (order.ob_contact_email ?? order.email).toLowerCase().trim()

  // ── 1. Create Supabase Auth user ────────────────────────────────────────────
  const tempPassword = generateTempPassword()

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
      const { data: listData } = await supabase.auth.admin.listUsers()
      const existing = listData?.users?.find(u => u.email === ownerEmail)
      if (!existing) throw new Error(`Auth user not found for ${ownerEmail}`)
      ownerUserId = existing.id
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

  // ── 3. Upsert site record ────────────────────────────────────────────────
  const { data: site, error: siteError } = await supabase
    .from('sites')
    .upsert(
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
      },
      { onConflict: 'slug' },
    )
    .select('id')
    .single()

  if (siteError || !site) {
    throw new Error(`Site record creation failed: ${siteError?.message ?? 'unknown'}`)
  }

  return {
    siteId: site.id as string,
    ownerUserId,
    stripeAccountId,
    tempPassword: authError ? '(konto już istnieje — hasło bez zmian)' : tempPassword,
  }
}
