import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireCron } from '@/lib/cronAuth'
import { odnotujPrzebieg } from '@/lib/cronHeartbeat'
import { pobierzKalendarz, dniZajete } from '@/lib/ical'

/** Okno synchronizacji. Przeszłości nie trzymamy, a dalej niż półtora roku
 *  portale i tak nie sprzedają. */
const MIESIECY_NAPRZOD = 18

// GET /api/cron/sync-calendars
// Co 15 minut (vercel.json). Pobiera kalendarze iCal z Booking.com i Airbnb
// podpięte przez właścicieli i zapisuje zajęte dni w external_blocked_dates.
// Dostępność i zakładanie rezerwacji czytają tę tabelę razem z blocked_dates.
export async function GET(request: NextRequest) {
  const unauthorized = requireCron(request)
  if (unauthorized) return unauthorized

  const supabase = createServiceClient()
  await odnotujPrzebieg(supabase, request.nextUrl.pathname)

  const { data: feeds, error } = await supabase
    .from('calendar_feeds')
    .select('id, site_id, url')

  if (error) {
    console.error('[sync-calendars] odczyt calendar_feeds:', error.message)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  const dzis = new Date().toISOString().slice(0, 10)
  const granica = new Date()
  granica.setUTCMonth(granica.getUTCMonth() + MIESIECY_NAPRZOD)
  const doDnia = granica.toISOString().slice(0, 10)

  const wyniki = []
  for (const feed of feeds ?? []) {
    wyniki.push(await synchronizuj(supabase, feed, dzis, doDnia))
  }

  // Wpisy sprzed dzisiaj nie blokują już niczego.
  await supabase.from('external_blocked_dates').delete().lt('date', dzis)

  const bledy = wyniki.filter(w => w.blad)
  return NextResponse.json({ kalendarze: wyniki.length, bledy: bledy.length, wyniki })
}

async function synchronizuj(
  supabase: ReturnType<typeof createServiceClient>,
  feed: { id: string; site_id: string; url: string },
  dzis: string,
  doDnia: string,
): Promise<{ id: string; dni?: number; blad?: string }> {
  const wynik = await pobierzKalendarz(feed.url)

  if (!wynik.ok) {
    // Poprzednie zajęte dni zostają — patrz pobierzKalendarz.
    console.error(`[sync-calendars] ${feed.id}: ${wynik.blad}`)
    await supabase.from('calendar_feeds').update({ last_error: wynik.blad }).eq('id', feed.id)
    return { id: feed.id, blad: wynik.blad }
  }

  const nowe = new Set(dniZajete(wynik.zdarzenia, dzis, doDnia))

  const { data: obecne, error: bladOdczytu } = await supabase
    .from('external_blocked_dates')
    .select('date')
    .eq('feed_id', feed.id)
  if (bladOdczytu) return zapiszBlad(supabase, feed.id, 'db_read')

  // Najpierw dopisujemy nowe dni, dopiero potem kasujemy zwolnione — między
  // jednym a drugim żaden termin z portalu nie bywa chwilowo wolny.
  const doDodania = [...nowe].filter(d => !(obecne ?? []).some(o => o.date === d))
  if (doDodania.length > 0) {
    const { error: bladZapisu } = await supabase
      .from('external_blocked_dates')
      .upsert(doDodania.map(date => ({ site_id: feed.site_id, feed_id: feed.id, date })),
              { onConflict: 'feed_id,date', ignoreDuplicates: true })
    if (bladZapisu) return zapiszBlad(supabase, feed.id, 'db_write')
  }

  const doUsuniecia = (obecne ?? []).map(o => o.date as string).filter(d => !nowe.has(d))
  if (doUsuniecia.length > 0) {
    const { error: bladKasowania } = await supabase
      .from('external_blocked_dates')
      .delete()
      .eq('feed_id', feed.id)
      .in('date', doUsuniecia)
    if (bladKasowania) return zapiszBlad(supabase, feed.id, 'db_delete')
  }

  await supabase
    .from('calendar_feeds')
    .update({ last_synced_at: new Date().toISOString(), last_error: null, last_days_count: nowe.size })
    .eq('id', feed.id)

  return { id: feed.id, dni: nowe.size }
}

async function zapiszBlad(supabase: ReturnType<typeof createServiceClient>, id: string, blad: string) {
  console.error(`[sync-calendars] ${id}: ${blad}`)
  await supabase.from('calendar_feeds').update({ last_error: blad }).eq('id', id)
  return { id, blad }
}
