import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { createBookingCheckout } from '@/lib/stripe-connect'
import { sprawdzDaty, rozwinZakres, wycen, MAX_NOCY } from '@/lib/bookingPricing'
import type { ApartmentConfig } from '@/lib/apartmentTypes'

interface Params { params: Promise<{ slug: string }> }

/** Postgres: naruszenie constraintu wykluczającego (bookings_no_overlap). */
const PG_EXCLUSION_VIOLATION = '23P01'

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
  const dzis = new Date().toISOString().slice(0, 10)
  const bladDat = sprawdzDaty(check_in, check_out, dzis)
  if (bladDat === 'stay_too_long') {
    return NextResponse.json({ error: 'stay_too_long', maxNights: MAX_NOCY }, { status: 400 })
  }
  if (bladDat) {
    return NextResponse.json({ error: bladDat }, { status: 400 })
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
  const requestedDates = new Set(rozwinZakres(check_in, check_out))

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
  const wstepna = wycen(check_in, check_out, config)
  if (wstepna.noce < wstepna.minNocy) {
    return NextResponse.json({ error: 'min_nights', minNights: wstepna.minNocy }, { status: 400 })
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

  const wycena = wycen(check_in, check_out, config, discountPct)
  const nights = wycena.noce
  const totalPrice = wycena.doZaplaty
  const currency = wycena.waluta
  const amountCents = wycena.groszy

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
    // Constraint bookings_no_overlap odrzucił wstawienie: między naszym
    // sprawdzeniem dostępności a insertem ktoś zarezerwował te same daty.
    // To poprawne zachowanie bazy, nie awaria — gość ma zobaczyć 409.
    if (bookingError?.code === PG_EXCLUSION_VIOLATION) {
      return NextResponse.json({ error: 'dates_unavailable' }, { status: 409 })
    }
    console.error('[book] insert error:', bookingError)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  const bookingId = booking.id as string
  const description = `${config.name} · ${check_in} – ${check_out} (${nights} nocy)`

  // ── Stripe Checkout ───────────────────────────────────────────────────────────
  // Payments only work when owner has completed Stripe Connect onboarding.
  // No fallback to platform account — owner must connect their own Stripe first.
  if (!site.stripe_account_id || site.stripe_onboarded !== true) {
    await supabase.from('bookings').delete().eq('id', bookingId)
    return NextResponse.json({ error: 'stripe_not_connected' }, { status: 402 })
  }

  try {
    const checkoutUrl = await createBookingCheckout({
      accountId: site.stripe_account_id as string,
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
