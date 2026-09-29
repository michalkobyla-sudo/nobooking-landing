import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireCron } from '@/lib/cronAuth'
import { DNI_RETENCJI } from '@/lib/checkin'

// GET /api/cron/cleanup-pending-bookings
// Runs every 30 minutes via Vercel Cron.
// Cancels pending bookings older than 2 hours — these are sessions where the
// guest started checkout but never completed payment (closed the window, etc.).
// Without cleanup they permanently block those dates.
export async function GET(request: NextRequest) {
  const unauthorized = requireCron(request)
  if (unauthorized) return unauthorized

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

  // Retencja danych check-inu (RODO). Numery dokumentow to dane wrazliwe —
  // po pobycie nie sluza juz niczemu, wiec trzymanie ich jest samym ryzykiem.
  // Kasujemy niezaleznie od tego, czy sa wiszace rezerwacje, dlatego przed
  // wczesnym wyjsciem ponizej.
  const usunieteCheckiny = await skasujStareCheckiny(supabase)

  if (!stale || stale.length === 0) {
    return NextResponse.json({ cleaned: 0, checkiny_usuniete: usunieteCheckiny })
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

  return NextResponse.json({ cleaned: ids.length, ids, checkiny_usuniete: usunieteCheckiny })
}

/**
 * Kasuje formularze check-in rezerwacji, ktore skonczyly sie ponad
 * DNI_RETENCJI temu. Zwraca liczbe usunietych wierszy.
 *
 * Blad nie przerywa crona — sprzatanie wiszacych rezerwacji jest wazniejsze,
 * bo blokuja terminy. Ale musi byc widoczny (niezmiennik 13).
 */
async function skasujStareCheckiny(supabase: ReturnType<typeof createServiceClient>): Promise<number> {
  const granica = new Date(Date.now() - DNI_RETENCJI * 24 * 60 * 60 * 1000)
    .toISOString().slice(0, 10)

  const { data: stareRezerwacje, error: bladOdczytu } = await supabase
    .from('bookings')
    .select('id')
    .lt('check_out', granica)

  if (bladOdczytu) {
    console.error('[cleanup-pending] nie udalo sie wybrac rezerwacji do retencji:', bladOdczytu.message)
    return 0
  }
  if (!stareRezerwacje || stareRezerwacje.length === 0) return 0

  const { data: usuniete, error: bladKasowania } = await supabase
    .from('checkin_forms')
    .delete()
    .in('booking_id', stareRezerwacje.map(b => b.id))
    .select('id')

  if (bladKasowania) {
    console.error('[cleanup-pending] retencja check-inow nie powiodla sie:', bladKasowania.message)
    return 0
  }

  const ile = usuniete?.length ?? 0
  if (ile > 0) console.log(`[cleanup-pending] retencja RODO: usunieto ${ile} formularzy check-in`)
  return ile
}
