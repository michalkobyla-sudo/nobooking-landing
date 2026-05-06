import { NextRequest, NextResponse } from 'next/server'
import { createRequire } from 'module'

// Force CJS Stripe bundle — ESM uses fetch() which fails on Vercel serverless
const _require = createRequire(import.meta.url)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const StripeLib = _require('stripe') as any

const PRICES = {
  basic: { pln: 79900, eur: 19900 },
  pro:   { pln: 119900, eur: 29900 },
}

const NAMES = {
  basic: 'Nobooking Basic (2 lata)',
  pro:   'Nobooking Pro (2 lata)',
}

export async function POST(request: NextRequest) {
  const { plan, currency } = await request.json() as {
    plan: 'basic' | 'pro'
    currency: 'pln' | 'eur'
  }

  if (!['basic', 'pro'].includes(plan) || !['pln', 'eur'].includes(currency)) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  }

  // Trim + strip trailing slash to avoid "Not a valid URL" from Stripe
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
          product_data: { name: NAMES[plan] },
        },
        quantity: 1,
      }],
      success_url: `${siteUrl}/sukces?plan=${plan}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/#cennik`,
      metadata: { plan, currency },
    })

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('[checkout] Stripe error:', err)
    return NextResponse.json({ error: err?.message || 'Stripe error' }, { status: 500 })
  }
}
