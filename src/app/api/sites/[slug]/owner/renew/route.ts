import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { verifyOwnerSession } from '@/lib/ownerAuth'

interface Params {
  params: Promise<{ slug: string }>
}

const PLAN_LABELS: Record<string, string> = {
  basic: 'Nobooking Basic',
  pro: 'Nobooking Pro',
}

/**
 * POST /api/sites/[slug]/owner/renew
 * Creates a Stripe Checkout session for 2-year subscription renewal.
 * Price is locked at the time of original purchase (renewal_price_* columns).
 */
export async function POST(request: NextRequest, { params }: Params) {
  const { slug } = await params
  const site = await verifyOwnerSession(slug, request.headers.get('cookie'))
  if (!site) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // Validate site has renewal price stored
  const pricePln = site.renewal_price_pln as number | null
  const priceEur = site.renewal_price_eur as number | null
  const currency = (site.renewal_currency as string | null) ?? 'pln'

  const unitAmount = currency === 'eur' ? priceEur : pricePln
  if (!unitAmount) {
    return NextResponse.json({ error: 'renewal_price_not_set' }, { status: 400 })
  }

  const stripeKey = (process.env.STRIPE_SECRET_KEY ?? '').trim()
  if (!stripeKey) {
    return NextResponse.json({ error: 'stripe_not_configured' }, { status: 500 })
  }

  const stripe = new Stripe(stripeKey)
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://nobooking.eu').trim().replace(/\/$/, '')
  const planLabel = PLAN_LABELS[site.plan as string] ?? 'Nobooking'

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card', 'p24', 'blik'],
      line_items: [
        {
          price_data: {
            currency,
            unit_amount: unitAmount,
            product_data: {
              name: `${planLabel} — odnowienie (2 lata)`,
              description: `Odnowienie subskrypcji dla strony ${slug}`,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        type: 'renewal',
        site_id: site.id as string,
        slug,
      },
      success_url: `${siteUrl}/sites/${slug}/admin/subskrypcja?renewed=1`,
      cancel_url: `${siteUrl}/sites/${slug}/admin/subskrypcja`,
    })

    return NextResponse.json({ checkoutUrl: session.url })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'stripe_error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
