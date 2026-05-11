import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { isConnectAccountReady } from '@/lib/stripe-connect'

// GET /api/connect/callback?slug=casa-sol
// Stripe redirects here after owner completes Connect Express onboarding.
// Updates stripe_onboarded = true if account is ready, then redirects to admin.
export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get('slug')
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://nobooking.eu').trim().replace(/\/$/, '')

  if (!slug) {
    return NextResponse.redirect(siteUrl)
  }

  const supabase = createServiceClient()
  const { data: site } = await supabase
    .from('sites')
    .select('stripe_account_id')
    .eq('slug', slug)
    .single()

  if (site?.stripe_account_id) {
    try {
      const ready = await isConnectAccountReady(site.stripe_account_id as string)
      if (ready) {
        await supabase
          .from('sites')
          .update({ stripe_onboarded: true })
          .eq('slug', slug)
      }
    } catch (err) {
      console.error('[connect/callback] error checking account readiness:', err)
    }
  }

  // Always redirect to admin — owner sees confirmation there
  return NextResponse.redirect(`${siteUrl}/sites/${slug}/admin?stripe_connected=1`)
}
