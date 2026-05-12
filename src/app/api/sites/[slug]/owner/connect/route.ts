import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { verifyOwnerSession } from '@/lib/ownerAuth'
import { createConnectAccount, createOnboardingLink } from '@/lib/stripe-connect'

interface Params {
  params: Promise<{ slug: string }>
}

/**
 * GET /api/sites/[slug]/owner/connect
 *
 * Protected by owner session cookie.
 * - If site has no stripe_account_id: creates a new Express Connect account,
 *   saves it, then generates an onboarding link.
 * - If site has stripe_account_id but not onboarded: generates a fresh onboarding link.
 * - Redirects owner to Stripe Express onboarding.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const { slug } = await params
  const site = await verifyOwnerSession(slug, request.headers.get('cookie'))
  if (!site) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  let accountId = site.stripe_account_id as string | null

  // Create Connect account if not yet assigned
  if (!accountId) {
    try {
      accountId = await createConnectAccount(site.owner_email)
      await supabase
        .from('sites')
        .update({ stripe_account_id: accountId, stripe_onboarded: false })
        .eq('id', site.id)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error('[owner/connect] createConnectAccount error:', msg)
      const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://nobooking.eu').replace(/\/$/, '')
      return NextResponse.redirect(`${siteUrl}/sites/${slug}/admin?stripe_error=1&stripe_msg=${encodeURIComponent(msg)}`)
    }
  }

  // Generate fresh onboarding link
  try {
    const url = await createOnboardingLink(accountId!, slug)
    return NextResponse.redirect(url)
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[owner/connect] createOnboardingLink error:', msg)
    const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://nobooking.eu').replace(/\/$/, '')
    return NextResponse.redirect(`${siteUrl}/sites/${slug}/admin?stripe_error=1&stripe_msg=${encodeURIComponent(msg)}`)
  }
}
