import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

// GET /api/cron/cleanup-pending-bookings
// Runs every 30 minutes via Vercel Cron.
// Cancels pending bookings older than 2 hours — these are sessions where the
// guest started checkout but never completed payment (closed the window, etc.).
// Without cleanup they permanently block those dates.
export async function GET(request: NextRequest) {
  // Verify this is called by Vercel Cron, not a random visitor
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Find pending bookings older than 2 hours
  const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

  const { data: stale, error: fetchError } = await supabase
    .from('bookings')
    .select('id, site_id, check_in, check_out, guest_email')
    .eq('status', 'pending')
    .lt('created_at', cutoff)

  if (fetchError) {
    console.error('[cleanup-pending] fetch error:', fetchError)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  if (!stale || stale.length === 0) {
    return NextResponse.json({ cleaned: 0 })
  }

  const ids = stale.map(b => b.id)

  const { error: updateError } = await supabase
    .from('bookings')
    .update({ status: 'cancelled' })
    .in('id', ids)

  if (updateError) {
    console.error('[cleanup-pending] update error:', updateError)
    return NextResponse.json({ error: 'update_error' }, { status: 500 })
  }

  console.log(`[cleanup-pending] cancelled ${ids.length} stale pending bookings:`, ids)

  return NextResponse.json({ cleaned: ids.length, ids })
}
