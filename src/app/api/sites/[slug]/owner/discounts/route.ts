import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { verifyOwnerSession } from '@/lib/ownerAuth'
import { sprawdzNowyKod } from '@/lib/discountCodes'

interface Params {
  params: Promise<{ slug: string }>
}

/** Postgres: naruszenie unikalności — kod o tej nazwie już na tej stronie istnieje. */
const PG_UNIQUE_VIOLATION = '23505'

/**
 * Kody rabatowe właściciela.
 *
 * Plan sprawdzany po stronie serwera, nie tylko w interfejsie — tak samo jak
 * w `/api/sites/[slug]/discount`. Bramka wyłącznie w panelu byłaby ozdobą.
 */
async function kontekst(slug: string, cookie: string | null) {
  const site = await verifyOwnerSession(slug, cookie)
  if (!site) return { blad: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) }
  if (site.plan !== 'pro') return { blad: NextResponse.json({ error: 'pro_required' }, { status: 403 }) }
  return { site }
}

// GET — lista kodów strony.
export async function GET(request: NextRequest, { params }: Params) {
  const { slug } = await params
  const { site, blad } = await kontekst(slug, request.headers.get('cookie'))
  if (blad) return blad

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('discount_codes')
    .select('id, code, discount_pct, max_uses, uses_count, valid_until, active, created_at')
    .eq('site_id', site!.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST — nowy kod. Body: { code, discount_pct, max_uses?, valid_until? }
export async function POST(request: NextRequest, { params }: Params) {
  const { slug } = await params
  const { site, blad } = await kontekst(slug, request.headers.get('cookie'))
  if (blad) return blad

  const body = await request.json().catch(() => ({})) as Record<string, unknown>
  const dzis = new Date().toISOString().slice(0, 10)
  const wynik = sprawdzNowyKod(body, dzis)
  if (!wynik.ok) return NextResponse.json({ error: wynik.blad }, { status: 400 })

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('discount_codes')
    .insert({ site_id: site!.id, ...wynik.kod, uses_count: 0, active: true })
    .select('id, code, discount_pct, max_uses, uses_count, valid_until, active, created_at')
    .single()

  if (error) {
    if (error.code === PG_UNIQUE_VIOLATION) {
      return NextResponse.json({ error: 'kod_juz_istnieje' }, { status: 409 })
    }
    console.error('[discounts] insert error:', error)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

// PATCH — włączenie lub wyłączenie kodu. Body: { id, active }
//
// Kodów nie kasujemy: `bookings.discount_code` trzyma samą nazwę, więc usunięcie
// wiersza zostawiłoby rezerwacje z rabatem, którego nie da się już wytłumaczyć.
export async function PATCH(request: NextRequest, { params }: Params) {
  const { slug } = await params
  const { site, blad } = await kontekst(slug, request.headers.get('cookie'))
  if (blad) return blad

  const body = await request.json().catch(() => ({})) as { id?: string; active?: boolean }
  if (!body.id || typeof body.active !== 'boolean') {
    return NextResponse.json({ error: 'zle_dane' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('discount_codes')
    .update({ active: body.active })
    .eq('id', body.id)
    .eq('site_id', site!.id)   // niezmiennik 3 — cudzy kod nas nie dotyczy
    .select('id, active')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data || data.length === 0) return NextResponse.json({ error: 'not_found' }, { status: 404 })
  return NextResponse.json(data[0])
}
