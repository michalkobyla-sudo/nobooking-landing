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
    .select('id, onboarding_submitted, first_name, apartment_name')
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
    ob_price_per_night?: number
    ob_max_guests?: number
    ob_checkin_time?: string
    ob_checkout_time?: string
    ob_amenities?: string
    ob_rules?: string
    ob_seasons?: string
    ob_photos_link?: string
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update({
      ob_description: body.ob_description?.trim() || null,
      ob_price_per_night: body.ob_price_per_night || null,
      ob_max_guests: body.ob_max_guests || null,
      ob_checkin_time: body.ob_checkin_time?.trim() || null,
      ob_checkout_time: body.ob_checkout_time?.trim() || null,
      ob_amenities: body.ob_amenities?.trim() || null,
      ob_rules: body.ob_rules?.trim() || null,
      ob_seasons: body.ob_seasons || null,
      ob_photos_link: body.ob_photos_link?.trim() || null,
      onboarding_submitted: true,
    })
    .eq('id', order.id)

  if (updateError) {
    console.error('[onboarding] update error:', updateError)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  // Notify Michał (non-blocking)
  sendOnboardingSubmittedNotification(order as Order).catch(err =>
    console.error('[onboarding] notification error:', err)
  )

  return NextResponse.json({ success: true })
}
