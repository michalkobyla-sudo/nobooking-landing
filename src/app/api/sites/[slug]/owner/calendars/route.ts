import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { verifyOwnerSession } from '@/lib/ownerAuth'
import { sprawdzAdresKalendarza } from '@/lib/ical'

interface Params {
  params: Promise<{ slug: string }>
}

const ZRODLA = ['booking', 'airbnb', 'inne'] as const
/** Więcej portali niż kilka to raczej pomyłka niż potrzeba, a każdy link
 *  to jedno pobranie co kwadrans. */
const MAKS_KALENDARZY = 5

// GET — kalendarze z portali podpięte do tej strony i dni, które są
// na nich zajęte (do pokazania w kalendarzu panelu).
export async function GET(request: NextRequest, { params }: Params) {
  const { slug } = await params
  const site = await verifyOwnerSession(slug, request.headers.get('cookie'))
  if (!site) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const [{ data: feeds, error }, { data: dni, error: bladDni }] = await Promise.all([
    supabase
      .from('calendar_feeds')
      .select('id, source, url, last_synced_at, last_error, last_days_count')
      .eq('site_id', site.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('external_blocked_dates')
      .select('date, feed_id')
      .eq('site_id', site.id),
  ])

  if (error || bladDni) return NextResponse.json({ error: (error ?? bladDni)!.message }, { status: 500 })
  const zrodlo = new Map((feeds ?? []).map(f => [f.id, f.source as string]))
  return NextResponse.json({
    feeds: feeds ?? [],
    zajete: (dni ?? []).map(d => ({ date: d.date as string, source: zrodlo.get(d.feed_id as string) ?? 'inne' })),
  })
}

// POST { source, url } — podpina link eksportu iCal z portalu.
// Pierwsze pobranie robi cron w ciągu kwadransa.
export async function POST(request: NextRequest, { params }: Params) {
  const { slug } = await params
  const site = await verifyOwnerSession(slug, request.headers.get('cookie'))
  if (!site) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as { source?: string; url?: string }
  const url = body.url?.trim() ?? ''
  if (!ZRODLA.includes(body.source as typeof ZRODLA[number])) {
    return NextResponse.json({ error: 'invalid_source' }, { status: 400 })
  }
  const bladAdresu = sprawdzAdresKalendarza(url)
  if (bladAdresu) return NextResponse.json({ error: bladAdresu }, { status: 400 })

  const supabase = createServiceClient()

  const { count } = await supabase
    .from('calendar_feeds')
    .select('id', { count: 'exact', head: true })
    .eq('site_id', site.id)
  if ((count ?? 0) >= MAKS_KALENDARZY) {
    return NextResponse.json({ error: 'too_many_feeds' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('calendar_feeds')
    .insert({ site_id: site.id, source: body.source, url })
    .select('id, source, url, last_synced_at, last_error, last_days_count')
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'already_added' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data, { status: 201 })
}
