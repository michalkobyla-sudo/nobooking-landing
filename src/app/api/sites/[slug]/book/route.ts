import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { createBookingCheckout, createDirectCheckout } from '@/lib/stripe-connect'
import type { ApartmentConfig } from '@/lib/apartmentTypes'

interface Params { params: Promise<{ slug: string }> }

// Determine season tier based on check_in month
function getTier(checkIn: string, config: ApartmentConfig): 'low' | 'mid' | 'high' {
  const month = new Date(checkIn).getMonth() + 1 // 1-12
  if ([7, 8, 9].includes(month)) return 'high'
  if ([5, 6, 10].includes(month)) return 'mid'
  return 'low'
}

function countNights(checkIn: string, checkOut: string): number {
  return Math.round(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (1000 * 60 * 60 * 24)
  )
}

function expandRange(checkIn: string, checkOut: string): string[] {
  const dates: string[] = []
  const end = new Date(checkOut)
  for (const d = new Date(checkIn); d < end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10))
  }
  return dates
}

// POST /api/sites/[slug]/book
// Body: { check_in, check_out, guests_count, guest_name, guest_email, guest_phone, notes?, discount_code? }
// Returns: { checkoutUrl: string }
export async function POST(req: NextRequest, { params }: Params) {
  const { slug } = await params
  const body = await req.json() as {
    check_in: string
    check_out: string
    guests_count: number
    guest_name: string
    guest_email: string
    guest_phone: string
    notes?: string
    discount_code?: string
  }

  const { check_in, check_out, guests_count, guest_name, guest_email, guest_phone, notes, discount_code } = body

  // ── Validate inputs ─────────────────────────────────────────────────────────
  const today = new Date().toISOString().slice(0, 10)
  if (!check_in || !check_out || check_in >= check_out || check_in < today) {
    return NextResponse.json({ error: 'invalid_dates' }, { status: 400 })
  }
  if (!guest_name?.trim() || !guest_email?.trim()) {
    return NextResponse.json({ error: 'missing_guest_info' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // ── Get site ─────────────────────────────────────────────────────────────────
  const { data: site } = await supabase
    .from('sites')
    .select('id, config, plan, stripe_account_id, stripe_onboarded')
    .eq('slug', slug)
    .eq('active', true)
    .single()

  if (!site) return NextResponse.json({ error: 'site_not_found' }, { status: 404 })

  const config = site.config as unknown as ApartmentConfig

  // ── Validate guests count ────────────────────────────────────────────────────
  if (guests_count < 1 || guests_count > config.specs.guests) {
    return NextResponse.json({ error: 'invalid_guests_count' }, { status: 400 })
  }

  // ── Check availability ────────────────────────────────────────────────────────
  const requestedDates = new Set(expandRange(check_in, check_out))

  const { data: conflicts } = await supabase
    .from('bookings')
    .select('check_in, check_out')
    .eq('site_id', site.id)
    .in('status', ['confirmed', 'pending'])
    .lt('check_in', check_out)
    .gt('check_out', check_in)

  if (conflicts && conflicts.length > 0) {
    return NextResponse.json({ error: 'dates_unavailable' }, { status: 409 })
  }

  const { data: blockedConflicts } = await supabase
    .from('blocked_dates')
    .select('date')
    .eq('site_id', site.id)
    .in('date', Array.from(requestedDates))

  if (blockedConflicts && blockedConflicts.length > 0) {
    return NextResponse.json({ error: 'dates_unavailable' }, { status: 409 })
  }

  // ── Calculate price ───────────────────────────────────────────────────────────
  const nights = countNights(check_in, check_out)
  const tier = getTier(check_in, config)
  const pricePerNight = config.pricing.tiers[tier].pricePerNight
  const minNights = config.pricing.tiers[tier].minNights

  if (nights < minNights) {
    return NextResponse.json({ error: 'min_nights', minNights }, { status: 400 })
  }

  let discountPct = 0
  if (discount_code?.trim() && site.plan === 'pro') {
    const now = new Date().toISOString().slice(0, 10)
    const { data: dc } = await supabase
      .from('discount_codes')
      .select('id, discount_pct, max_uses, uses_count, valid_until, active')
      .eq('site_id', site.id)
      .eq('code', discount_code.trim().toUpperCase())
      .eq('active', true)
      .single()

    if (
      dc &&
      (!dc.valid_until || (dc.valid_until as string) >= now) &&
      (dc.max_uses === null || (dc.uses_count as number) < (dc.max_uses as number))
    ) {
      discountPct = dc.discount_pct as number
    }
  }

  const baseAmount = nights * pricePerNight + config.pricing.cleaningFee
  const discountAmount = Math.round(baseAmount * discountPct / 100)
  const totalPrice = baseAmount - discountAmount
  const currency = config.pricing.currency.toLowerCase() // 'eur' or 'pln'
  const amountCents = Math.round(totalPrice * 100)

  // ── Create booking record ─────────────────────────────────────────────────────
  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .insert({
      site_id: site.id,
      guest_name: guest_name.trim(),
      guest_email: guest_email.trim().toLowerCase(),
      guest_phone: guest_phone?.trim() ?? '',
      check_in,
      check_out,
      nights,
      guests_count,
      total_price: totalPrice,
      currency: currency.toUpperCase(),
      status: 'pending',
      discount_code: discountPct > 0 ? discount_code!.trim().toUpperCase() : null,
      discount_pct: discountPct,
      notes: notes?.trim() ?? null,
    })
    .select('id')
    .single()

  if (bookingError || !booking) {
    console.error('[book] insert error:', bookingError)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  const bookingId = booking.id as string
  const description = `${config.name} · ${check_in} – ${check_out} (${nights} nocy)`

  // ── Stripe Checkout ───────────────────────────────────────────────────────────
  try {
    const hasConnect = !!site.stripe_account_id && site.stripe_onboarded === true

    const checkoutUrl = hasConnect
      ? await createBookingCheckout({
          accountId: site.stripe_account_id as string,
          amountCents,
          currency,
          bookingId,
          siteSlug: slug,
          guestEmail: guest_email.trim().toLowerCase(),
          description,
        })
      : await createDirectCheckout({
          amountCents,
          currency,
          bookingId,
          siteSlug: slug,
          guestEmail: guest_email.trim().toLowerCase(),
          description,
        })

    return NextResponse.json({ checkoutUrl })

  } catch (err) {
    console.error('[book] stripe error:', err)
    // Clean up pending booking on Stripe error
    await supabase.from('bookings').delete().eq('id', bookingId)
    return NextResponse.json({ error: 'payment_error' }, { status: 500 })
  }
}
