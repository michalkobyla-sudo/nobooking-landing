import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

interface Params {
  params: Promise<{ slug: string; bookingId: string }>
}

const MIN_DL_OPINII = 20
const MAX_DL_OPINII = 2000

/**
 * Opinia gościa o pobycie.
 *
 * Dostępem jest znajomość identyfikatora rezerwacji, jak w portalu gościa,
 * więc rezerwacja musi należeć do strony z adresu (niezmiennik 3).
 *
 * Opinia trafia do bazy **niepublikowana** — właściciel zatwierdza ją w panelu.
 * Treść jest publiczna i firmowana jego marką, więc nie może się pojawić bez
 * jego zgody.
 */
async function kontekst(slug: string, bookingId: string) {
  const supabase = createServiceClient()

  const { data: site } = await supabase
    .from('sites')
    .select('id, config')
    .eq('slug', slug)
    .eq('active', true)
    .single()
  if (!site) return { odp: NextResponse.json({ error: 'not_found' }, { status: 404 }) }

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, site_id, guest_name, check_out, status')
    .eq('id', bookingId)
    .single()

  if (!booking || booking.site_id !== site.id) {
    return { odp: NextResponse.json({ error: 'not_found' }, { status: 404 }) }
  }

  return { supabase, site, booking }
}

// GET — czy można pisać i czy opinia już jest.
export async function GET(_req: NextRequest, { params }: Params) {
  const { slug, bookingId } = await params
  const { odp, supabase, booking } = await kontekst(slug, bookingId)
  if (odp) return odp

  const dzis = new Date().toISOString().slice(0, 10)
  const { data: istniejaca } = await supabase!
    .from('reviews')
    .select('id, score, text, published')
    .eq('booking_id', bookingId)
    .maybeSingle()

  return NextResponse.json({
    // Opinia po pobycie, nie w jego trakcie — inaczej byłaby o wyobrażeniu,
    // nie o doświadczeniu.
    mozna: booking!.status !== 'cancelled' && (booking!.check_out as string) <= dzis,
    guest_name: booking!.guest_name,
    juz_jest: istniejaca ? { score: istniejaca.score, published: istniejaca.published } : null,
  })
}

// POST — zapis opinii. Body: { score, text }
export async function POST(request: NextRequest, { params }: Params) {
  const { slug, bookingId } = await params
  const { odp, supabase, site, booking } = await kontekst(slug, bookingId)
  if (odp) return odp

  const dzis = new Date().toISOString().slice(0, 10)
  if (booking!.status === 'cancelled' || (booking!.check_out as string) > dzis) {
    return NextResponse.json({ error: 'za_wczesnie' }, { status: 409 })
  }

  const body = await request.json().catch(() => ({})) as { score?: unknown; text?: unknown }

  const score = Number(body.score)
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    return NextResponse.json({ error: 'zla_ocena' }, { status: 400 })
  }

  const text = String(body.text ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim()
  if (text.length < MIN_DL_OPINII) return NextResponse.json({ error: 'za_krotka' }, { status: 400 })

  // Jedna opinia na rezerwację. Gość może poprawić swoją, ale nie dopisać
  // drugiej — stąd upsert po `booking_id`, nie insert.
  const { error } = await supabase!
    .from('reviews')
    .upsert(
      {
        site_id: site!.id,
        booking_id: bookingId,
        guest_name: booking!.guest_name,
        score,
        text: text.slice(0, MAX_DL_OPINII),
        published: false,
      },
      { onConflict: 'booking_id' },
    )

  if (error) {
    console.error('[opinia] zapis nie powiódł się:', error.message)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
