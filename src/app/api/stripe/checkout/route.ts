import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' })

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

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://nobooking.eu'

  try {
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

    return NextResponse.json({ url: session.url })
  } catch (err: any) {
    console.error('[checkout] Stripe error:', err)
    return NextResponse.json({ error: err?.message || 'Stripe error' }, { status: 500 })
  }
}
