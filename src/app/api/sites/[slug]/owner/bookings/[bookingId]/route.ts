import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { verifyOwnerSession } from '@/lib/ownerAuth'
import { sendBookingCancelled, type BookingEmailData } from '@/lib/email'

interface Params {
  params: Promise<{ slug: string; bookingId: string }>
}

export async function GET(request: NextRequest, { params }: Params) {
  const { slug, bookingId } = await params
  const site = await verifyOwnerSession(slug, request.headers.get('cookie'))
  if (!site) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const { data: booking, error } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .eq('site_id', site.id)
    .single()

  if (error || !booking) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  // Check-in online (pakiet Pro). Doklejamy do rezerwacji, zamiast robić osobne
  // zapytanie z panelu — właściciel i tak ogląda jedno i drugie naraz.
  const { data: checkin } = await supabase
    .from('checkin_forms')
    .select('guests_data, arrival_time, notes, created_at')
    .eq('booking_id', bookingId)
    .maybeSingle()

  return NextResponse.json({ ...booking, checkin: checkin ?? null })
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { slug, bookingId } = await params
  const site = await verifyOwnerSession(slug, request.headers.get('cookie'))
  if (!site) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as { status?: string; notes?: string }

  const allowedStatuses = ['pending', 'confirmed', 'cancelled', 'completed']
  if (body.status && !allowedStatuses.includes(body.status)) {
    return NextResponse.json({ error: 'invalid_status' }, { status: 400 })
  }

  const updates: Record<string, unknown> = {}
  if (body.status !== undefined) updates.status = body.status
  if (body.notes !== undefined) updates.notes = body.notes

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'nothing_to_update' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Stan sprzed zmiany rozstrzyga, czy mail o anulowaniu ma w ogóle wyjść:
  // bez tego ponowny zapis tego samego statusu wysyłałby go drugi raz.
  const { data: przed } = await supabase
    .from('bookings')
    .select('status')
    .eq('id', bookingId)
    .eq('site_id', site.id)
    .single()

  const { data: booking, error } = await supabase
    .from('bookings')
    .update(updates)
    .eq('id', bookingId)
    .eq('site_id', site.id)
    .select()
    .single()

  if (error || !booking) {
    return NextResponse.json({ error: error?.message ?? 'update_failed' }, { status: 500 })
  }

  if (body.status === 'cancelled' && przed?.status !== 'cancelled') {
    try {
      await sendBookingCancelled(booking as unknown as BookingEmailData, body.notes ?? null)
    } catch (err) {
      // Nie wywracamy anulowania przez nieudany mail, ale awaria musi być
      // widoczna (niezmiennik 13).
      console.error(`[owner/bookings] mail o anulowaniu ${bookingId} nie wyszedł:`, err)
    }
  }

  return NextResponse.json(booking)
}
