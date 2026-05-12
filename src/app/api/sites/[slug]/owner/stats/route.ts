import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { verifyOwnerSession } from '@/lib/ownerAuth'

interface Params {
  params: Promise<{ slug: string }>
}

export async function GET(request: NextRequest, { params }: Params) {
  const { slug } = await params
  const site = await verifyOwnerSession(slug, request.headers.get('cookie'))
  if (!site) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10)
  const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10)
  const today      = now.toISOString().slice(0, 10)

  const [bookingsRes, revenueRes, ratingsRes, upcomingRes] = await Promise.all([
    supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('site_id', site.id)
      .neq('status', 'cancelled')
      .gte('check_in', monthStart)
      .lte('check_in', monthEnd),

    supabase
      .from('bookings')
      .select('total_price, currency')
      .eq('site_id', site.id)
      .in('status', ['confirmed', 'completed'])
      .gte('check_in', monthStart)
      .lte('check_in', monthEnd),

    supabase
      .from('reviews')
      .select('score')
      .eq('site_id', site.id),

    supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('site_id', site.id)
      .in('status', ['pending', 'confirmed'])
      .gte('check_in', today),
  ])

  const revenueRows = revenueRes.data ?? []
  const revenueCurrency = revenueRows[0]?.currency ?? 'EUR'
  const revenueTotal = revenueRows.reduce((sum, r) => sum + (r.total_price ?? 0), 0)

  const scores = (ratingsRes.data ?? []).map(r => r.score as number)
  const avgRating = scores.length > 0
    ? Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 10) / 10
    : null

  return NextResponse.json({
    bookings_this_month: bookingsRes.count ?? 0,
    revenue_this_month:  revenueTotal,
    revenue_currency:    revenueCurrency,
    avg_rating:          avgRating,
    upcoming_count:      upcomingRes.count ?? 0,
  })
}
