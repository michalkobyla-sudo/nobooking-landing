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
  const { data: bookings, error } = await supabase
    .from('bookings')
    .select('id, guest_name, guest_email, guest_phone, check_in, check_out, nights, guests_count, total_price, currency, status, stripe_paid, created_at, notes')
    .eq('site_id', site.id)
    .order('check_in', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(bookings ?? [])
}
