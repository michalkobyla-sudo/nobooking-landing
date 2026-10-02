import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { sendNewOrderNotification } from '@/lib/email'
import { zBody, opisZrodla } from '@/lib/attribution'
import type { Order } from '@/lib/types'
import { utworzSesjeZamowienia } from '@/lib/checkoutZamowienia'

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
    zrodlo?: unknown
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

  const zrodlo = zBody(body.zrodlo)

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
      // Atrybucja. `zBody` przycina i czyści — to dane z formularza, czyli
      // pochodzące ostatecznie z adresu URL, więc niezaufane.
      ...zrodlo,
    })
    .select()
    .single()

  if (error || !order) {
    console.error('[orders] Supabase insert error:', error)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  // Sesja platnosci — wywolanie bezposrednie, bez wychodzenia na siec.
  //
  // Wczesniej szlo tu zadanie HTTP na `${NEXT_PUBLIC_SITE_URL}/api/stripe/checkout`,
  // czyli pod adres bezwzgledny z konfiguracji. Lokalnie wskazywal on produkcje,
  // wiec serwer deweloperski zapisywal zamowienie u siebie, a sesje platnosci
  // tworzyl na produkcji, kluczem live.
  const wynikSesji = await utworzSesjeZamowienia({
    plan: order.plan as 'basic' | 'pro',
    currency: order.currency as 'pln' | 'eur',
    orderId: order.id as string,
    adresPowrotu: request.nextUrl.origin,
  })

  if (!wynikSesji.ok) {
    console.error('[orders] Stripe checkout error:', wynikSesji.blad)
    return NextResponse.json({ error: 'stripe_error' }, { status: 500 })
  }

  // Send notification email to Michał (non-blocking)
  sendNewOrderNotification(order as Order).catch(err =>
    console.error('[orders] notification email error:', err)
  )

  return NextResponse.json({ order_id: order.id, stripe_url: wynikSesji.url })
}
