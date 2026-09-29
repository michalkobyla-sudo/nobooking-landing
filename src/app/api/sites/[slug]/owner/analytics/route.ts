import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { verifyOwnerSession } from '@/lib/ownerAuth'
import { policzAnalitykę, type RezerwacjaDoAnalizy } from '@/lib/analytics'

interface Params {
  params: Promise<{ slug: string }>
}

/**
 * Analityka właściciela — funkcja pakietu Pro.
 *
 * Osobna od `owner/stats`, która zasila kafelki pulpitu i należy do pakietu
 * Basic. Gdyby bramka planu trafiła tam, właściciele Basic straciliby pulpit.
 */
export async function GET(request: NextRequest, { params }: Params) {
  const { slug } = await params
  const site = await verifyOwnerSession(slug, request.headers.get('cookie'))
  if (!site) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  if (site.plan !== 'pro') return NextResponse.json({ error: 'pro_required' }, { status: 403 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('bookings')
    .select('check_in, check_out, total_price, currency, status, created_at')
    .eq('site_id', site.id)

  if (error) {
    console.error('[analytics] odczyt rezerwacji nie powiódł się:', error.message)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  const dzis = new Date().toISOString().slice(0, 10)
  return NextResponse.json(policzAnalitykę((data ?? []) as RezerwacjaDoAnalizy[], dzis, 12))
}
