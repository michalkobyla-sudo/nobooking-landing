import { NextRequest, NextResponse } from 'next/server'
import { createRequire } from 'module'
import { PRICES, PLAN_NAMES } from '@/lib/prices'

const _require = createRequire(import.meta.url)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const StripeLib = _require('stripe') as any

export async function POST(request: NextRequest) {
  const { plan, currency, order_id } = await request.json() as {
    plan: 'basic' | 'pro'
    currency: 'pln' | 'eur'
    order_id?: string
  }

  if (!['basic', 'pro'].includes(plan) || !['pln', 'eur'].includes(currency)) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 })
  }

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
          product_data: { name: PLAN_NAMES[plan] },
        },
        quantity: 1,
      }],
      success_url: `${siteUrl}/sukces?plan=${plan}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/#cennik`,
      metadata: { plan, currency, ...(order_id ? { order_id } : {}) },
    })

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    return NextResponse.json({ url: session.url })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Stripe error'
    console.error('[checkout] Stripe error:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
