import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

interface Params { params: Promise<{ slug: string }> }

// Expand a check_in..check_out range into individual YYYY-MM-DD strings.
// check_out day is NOT included (guest departs that morning).
function expandRange(checkIn: string, checkOut: string): string[] {
  const dates: string[] = []
  const end = new Date(checkOut)
  for (const d = new Date(checkIn); d < end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10))
  }
  return dates
}

// GET /api/sites/[slug]/availability
// Returns { bookedDates: string[] } — all occupied YYYY-MM-DD strings.
export async function GET(_req: NextRequest, { params }: Params) {
  const { slug } = await params
  const supabase = createServiceClient()

  // Get site id
  const { data: site } = await supabase
    .from('sites')
    .select('id')
    .eq('slug', slug)
    .eq('active', true)
    .single()

  if (!site) {
    return NextResponse.json({ bookedDates: [] })
  }

  // Confirmed + pending bookings
  const { data: bookings } = await supabase
    .from('bookings')
    .select('check_in, check_out')
    .eq('site_id', site.id)
    .in('status', ['confirmed', 'pending'])

  // Manually blocked dates
  const { data: blocked } = await supabase
    .from('blocked_dates')
    .select('date')
    .eq('site_id', site.id)

  const bookedDates = new Set<string>()

  for (const b of bookings ?? []) {
    for (const d of expandRange(b.check_in as string, b.check_out as string)) {
      bookedDates.add(d)
    }
  }

  for (const b of blocked ?? []) {
    bookedDates.add(b.date as string)
  }

  return NextResponse.json(
    { bookedDates: Array.from(bookedDates) },
    { headers: { 'Cache-Control': 'no-store' } }
  )
}
