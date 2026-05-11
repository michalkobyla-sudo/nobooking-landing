import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { createOnboardingLink } from '@/lib/stripe-connect'

// GET /api/connect/onboard?slug=casa-sol
// Called from admin panel "Connect Stripe" button or from welcome email link.
// Redirects owner to Stripe Connect Express onboarding.
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
    return NextResponse.json({ error: 'site_not_found_or_no_stripe_account' }, { status: 404 })
  }

  try {
    const url = await createOnboardingLink(site.stripe_account_id as string, slug)
    return NextResponse.redirect(url)
  } catch (err) {
    console.error('[connect/onboard] stripe error:', err)
    return NextResponse.json({ error: 'stripe_error' }, { status: 500 })
  }
}
