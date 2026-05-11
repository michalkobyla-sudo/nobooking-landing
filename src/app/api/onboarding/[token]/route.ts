import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { sendOnboardingSubmittedNotification } from '@/lib/email'
import type { Order } from '@/lib/types'

interface Params {
  params: Promise<{ token: string }>
}

export async function GET(_request: NextRequest, { params }: Params) {
  const { token } = await params
  const supabase = createServiceClient()

  const { data: order, error } = await supabase
    .from('orders')
    .select('id, onboarding_submitted, first_name, apartment_name, plan')
    .eq('onboarding_token', token)
    .single()

  if (error || !order) {
    return NextResponse.json({ found: false })
  }

  return NextResponse.json({
    found: true,
    submitted: order.onboarding_submitted,
    first_name: order.first_name,
    apartment_name: order.apartment_name,
    plan: order.plan,
  })
}

export async function POST(request: NextRequest, { params }: Params) {
  const { token } = await params
  const supabase = createServiceClient()

  const { data: order, error: findError } = await supabase
    .from('orders')
    .select('*')
    .eq('onboarding_token', token)
    .single()

  if (findError || !order) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  if (order.onboarding_submitted) {
    return NextResponse.json({ error: 'already_submitted' }, { status: 409 })
  }

  const body = await request.json() as {
    ob_description?: string
    ob_tagline?: string
    ob_address?: string
    ob_bedrooms?: number
    ob_bathrooms?: number
    ob_sqm?: number
    ob_photos_link?: string
    ob_video_link?: string
    ob_price_per_night?: number
    ob_currency?: 'pln' | 'eur'
    ob_max_guests?: number
    ob_seasons?: string
    ob_checkin_time?: string
    ob_checkout_time?: string
    ob_amenities?: string
    ob_rules?: string
    ob_contact_email?: string
    ob_contact_phone?: string
    ob_domain?: string
    ob_instagram?: string
    ob_facebook?: string
    ob_color?: string
    ob_sms_phone?: string
    ob_checkin_fields?: string
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update({
      ob_description: body.ob_description?.trim() || null,
      ob_tagline: body.ob_tagline?.trim() || null,
      ob_address: body.ob_address?.trim() || null,
      ob_bedrooms: body.ob_bedrooms || null,
      ob_bathrooms: body.ob_bathrooms || null,
      ob_sqm: body.ob_sqm || null,
      ob_photos_link: body.ob_photos_link?.trim() || null,
      ob_video_link: body.ob_video_link?.trim() || null,
      ob_price_per_night: body.ob_price_per_night || null,
      ob_currency: body.ob_currency || null,
      ob_max_guests: body.ob_max_guests || null,
      ob_seasons: body.ob_seasons || null,
      ob_checkin_time: body.ob_checkin_time?.trim() || null,
      ob_checkout_time: body.ob_checkout_time?.trim() || null,
      ob_amenities: body.ob_amenities?.trim() || null,
      ob_rules: body.ob_rules?.trim() || null,
      ob_contact_email: body.ob_contact_email?.trim() || null,
      ob_contact_phone: body.ob_contact_phone?.trim() || null,
      ob_domain: body.ob_domain?.trim() || null,
      ob_instagram: body.ob_instagram?.trim() || null,
      ob_facebook: body.ob_facebook?.trim() || null,
      ob_color: body.ob_color?.trim() || null,
      ob_sms_phone: body.ob_sms_phone?.trim() || null,
      ob_checkin_fields: body.ob_checkin_fields?.trim() || null,
      onboarding_submitted: true,
    })
    .eq('id', order.id)

  if (updateError) {
    console.error('[onboarding] update error:', updateError)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  // Notify Michał (fast, non-blocking)
  sendOnboardingSubmittedNotification(order as Order).catch(err =>
    console.error('[onboarding] notification error:', err)
  )

  // Site generation + provisioning is handled by /api/cron/provision-sites (runs every minute)

  return NextResponse.json({ success: true })
}
