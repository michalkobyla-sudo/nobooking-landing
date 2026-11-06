import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { rozwinZakres } from '@/lib/bookingPricing'
import { zakresyZDni, zbudujIcal } from '@/lib/ical'

interface Params { params: Promise<{ slug: string }> }

/** Ile miesięcy naprzód eksportujemy. Booking i Airbnb i tak nie przyjmują
 *  rezerwacji dalej niż na rok z hakiem. */
const MIESIECY_NAPRZOD = 18

// GET /api/sites/[slug]/calendar.ics
// Plik iCal, który właściciel wkleja w Booking.com i Airbnb („importuj
// kalendarz”). Zawiera rezerwacje z nobooking i dni zablokowane ręcznie —
// bez dni pobranych z portali: odesłanie Bookingowi jego własnych blokad
// przez Airbnb tworzyłoby pętlę, w której zwolniony termin nigdy nie znika.
// Same daty, bez danych gości — te same, które pokazuje publiczny
// /availability.
export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params
  const supabase = createServiceClient()

  const { data: site } = await supabase
    .from('sites')
    .select('id')
    .eq('slug', slug)
    .eq('active', true)
    .single()

  if (!site) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  const dzis = new Date().toISOString().slice(0, 10)
  const granica = new Date()
  granica.setUTCMonth(granica.getUTCMonth() + MIESIECY_NAPRZOD)
  const doDnia = granica.toISOString().slice(0, 10)

  const [{ data: bookings, error: bladRezerwacji }, { data: blocked, error: bladBlokad }] = await Promise.all([
    supabase
      .from('bookings')
      .select('check_in, check_out')
      .eq('site_id', site.id)
      .in('status', ['confirmed', 'pending'])
      .gt('check_out', dzis)
      .lt('check_in', doDnia),
    supabase
      .from('blocked_dates')
      .select('date')
      .eq('site_id', site.id)
      .gte('date', dzis)
      .lt('date', doDnia),
  ])

  // Pusty kalendarz po błędzie bazy portal odczytałby jako „wszystko wolne”
  // i odblokował terminy. Błąd 500 każe mu zostać przy poprzedniej wersji.
  if (bladRezerwacji || bladBlokad) {
    console.error('[calendar.ics] blad odczytu:', bladRezerwacji?.message ?? bladBlokad?.message)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  const dni: string[] = (blocked ?? []).map(b => b.date as string)
  for (const b of bookings ?? []) {
    for (const d of rozwinZakres(b.check_in as string, b.check_out as string)) {
      if (d >= dzis) dni.push(d)
    }
  }

  const tekst = zbudujIcal({
    nazwa: `NoBooking ${slug}`,
    zakresy: zakresyZDni(dni),
    domena: 'nobooking.eu',
    teraz: new Date(),
  })

  return new NextResponse(tekst, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `inline; filename="${slug}.ics"`,
      'Cache-Control': 'no-store',
    },
  })
}
