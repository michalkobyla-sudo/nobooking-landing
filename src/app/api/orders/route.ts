import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { sendNewOrderNotification } from '@/lib/email'
import type { Order } from '@/lib/types'

function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function validateNip(nip: string): boolean {
  return /^\d{10}$/.test(nip.replace(/[-\s]/g, ''))
}

export async function POST(request: NextRequest) {
  const body = await request.json() as {
    plan?: string
    currency?: string
    first_name?: string
    last_name?: string
    email?: string
    phone?: string
    invoice_company?: string
    invoice_nip?: string
    invoice_address?: string
    apartment_name?: string
    apartment_location?: string
    notes?: string
  }

  // Validate required fields
  const required = ['plan', 'currency', 'first_name', 'last_name', 'email', 'phone', 'apartment_name', 'apartment_location'] as const
  for (const field of required) {
    if (!body[field]?.toString().trim()) {
      return NextResponse.json({ error: `missing_${field}` }, { status: 400 })
    }
  }

  if (!['basic', 'pro'].includes(body.plan!)) {
    return NextResponse.json({ error: 'invalid_plan' }, { status: 400 })
  }
  if (!['pln', 'eur'].includes(body.currency!)) {
    return NextResponse.json({ error: 'invalid_currency' }, { status: 400 })
  }
  if (!validateEmail(body.email!)) {
    return NextResponse.json({ error: 'invalid_email' }, { status: 400 })
  }
  if (body.invoice_nip && !validateNip(body.invoice_nip)) {
    return NextResponse.json({ error: 'invalid_nip' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Insert order
  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      plan: body.plan,
      currency: body.currency,
      first_name: body.first_name!.trim(),
      last_name: body.last_name!.trim(),
      email: body.email!.trim().toLowerCase(),
      phone: body.phone!.trim(),
      invoice_company: body.invoice_company?.trim() || null,
      invoice_nip: body.invoice_nip?.trim() || null,
      invoice_address: body.invoice_address?.trim() || null,
      apartment_name: body.apartment_name!.trim(),
      apartment_location: body.apartment_location!.trim(),
      notes: body.notes?.trim() || null,
    })
    .select()
    .single()

  if (error || !order) {
    console.error('[orders] Supabase insert error:', error)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  // Create Stripe session
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://nobooking.eu')
    .trim()
    .replace(/\/$/, '')

  const checkoutRes = await fetch(`${siteUrl}/api/stripe/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ plan: order.plan, currency: order.currency, order_id: order.id }),
  })

  const checkoutData = await checkoutRes.json() as { url?: string; error?: string }

  if (!checkoutData.url) {
    console.error('[orders] Stripe checkout error:', checkoutData.error)
    return NextResponse.json({ error: 'stripe_error' }, { status: 500 })
  }

  // Send notification email to Michał (non-blocking)
  sendNewOrderNotification(order as Order).catch(err =>
    console.error('[orders] notification email error:', err)
  )

  return NextResponse.json({ order_id: order.id, stripe_url: checkoutData.url })
}
