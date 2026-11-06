import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { verifyOwnerSession } from '@/lib/ownerAuth'

interface Params {
  params: Promise<{ slug: string; feedId: string }>
}

// DELETE — odpina kalendarz. Jego zajęte dni znikają razem z nim
// (on delete cascade w external_blocked_dates).
export async function DELETE(request: NextRequest, { params }: Params) {
  const { slug, feedId } = await params
  const site = await verifyOwnerSession(slug, request.headers.get('cookie'))
  if (!site) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('calendar_feeds')
    .delete()
    .eq('id', feedId)
    .eq('site_id', site.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
