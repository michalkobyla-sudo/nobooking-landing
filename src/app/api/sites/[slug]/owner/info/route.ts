import { NextRequest, NextResponse } from 'next/server'
import { verifyOwnerSession } from '@/lib/ownerAuth'

interface Params {
  params: Promise<{ slug: string }>
}

/**
 * GET /api/sites/[slug]/owner/info
 * Returns subscription and plan info for the owner admin panel.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const { slug } = await params
  const site = await verifyOwnerSession(slug, request.headers.get('cookie'))
  if (!site) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  return NextResponse.json({
    plan: site.plan,
    active: site.active,
    expires_at: site.expires_at ?? null,
    renewal_price_pln: site.renewal_price_pln ?? null,
    renewal_price_eur: site.renewal_price_eur ?? null,
    renewal_currency: site.renewal_currency ?? null,
    stripe_onboarded: site.stripe_onboarded,
  })
}
