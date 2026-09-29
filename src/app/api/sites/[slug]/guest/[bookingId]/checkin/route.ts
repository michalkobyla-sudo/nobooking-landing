import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { sprawdzCheckin, czyMoznaWypelnic } from '@/lib/checkin'

interface Params {
  params: Promise<{ slug: string; bookingId: string }>
}

/**
 * Online check-in gościa (pakiet Pro).
 *
 * Dostępem jest znajomość identyfikatora rezerwacji — tak samo jak w portalu
 * gościa. Stąd trzy sprawdzenia, z których żadnego nie wolno pominąć:
 * rezerwacja musi należeć do strony z adresu (niezmiennik 3), strona musi mieć
 * plan Pro (bramka po stronie serwera, nie tylko w interfejsie), a termin nie
 * może być po wyjeździe.
 */
async function kontekst(slug: string, bookingId: string) {
  const supabase = createServiceClient()

  const { data: site } = await supabase
    .from('sites')
    .select('id, plan, config')
    .eq('slug', slug)
    .eq('active', true)
    .single()

  if (!site) return { odp: NextResponse.json({ error: 'not_found' }, { status: 404 }) }
  if (site.plan !== 'pro') return { odp: NextResponse.json({ error: 'pro_required' }, { status: 403 }) }

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, site_id, guests_count, check_in, check_out, status, guest_name')
    .eq('id', bookingId)
    .single()

  // Ten sam identyfikator nie może otwierać rezerwacji pod cudzym slugiem.
  if (!booking || booking.site_id !== site.id) {
    return { odp: NextResponse.json({ error: 'not_found' }, { status: 404 }) }
  }

  return { supabase, site, booking }
}

// GET — stan formularza: czy można wypełnić i co już zapisano.
export async function GET(_req: NextRequest, { params }: Params) {
  const { slug, bookingId } = await params
  const { odp, supabase, booking } = await kontekst(slug, bookingId)
  if (odp) return odp

  const dzis = new Date().toISOString().slice(0, 10)
  const { data: formularz } = await supabase!
    .from('checkin_forms')
    .select('guests_data, arrival_time, notes, created_at')
    .eq('booking_id', bookingId)
    .maybeSingle()

  return NextResponse.json({
    mozna: czyMoznaWypelnic(booking! as { check_out: string; status: string }, dzis),
    guest_name: booking!.guest_name,
    guests_count: booking!.guests_count,
    check_in: booking!.check_in,
    check_out: booking!.check_out,
    zapisano: formularz
      ? {
          osoby: formularz.guests_data,
          godzinaPrzyjazdu: formularz.arrival_time,
          uwagi: formularz.notes,
          kiedy: formularz.created_at,
        }
      : null,
  })
}

// POST — zapis formularza. Gość może poprawiać do wyjazdu, stąd upsert.
export async function POST(request: NextRequest, { params }: Params) {
  const { slug, bookingId } = await params
  const { odp, supabase, booking } = await kontekst(slug, bookingId)
  if (odp) return odp

  const dzis = new Date().toISOString().slice(0, 10)
  if (!czyMoznaWypelnic(booking! as { check_out: string; status: string }, dzis)) {
    return NextResponse.json({ error: 'po_terminie' }, { status: 409 })
  }

  const body = await request.json().catch(() => null)
  const wynik = sprawdzCheckin(body, Number(booking!.guests_count) || 1)
  if (!wynik.ok) return NextResponse.json({ error: wynik.blad }, { status: 400 })

  const { error } = await supabase!
    .from('checkin_forms')
    .upsert(
      {
        booking_id: bookingId,
        guests_data: wynik.dane.osoby,
        arrival_time: wynik.dane.godzinaPrzyjazdu,
        notes: wynik.dane.uwagi,
      },
      { onConflict: 'booking_id' },
    )

  if (error) {
    console.error('[checkin] zapis nie powiódł się:', error.message)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
