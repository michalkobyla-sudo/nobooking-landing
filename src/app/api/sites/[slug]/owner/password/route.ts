import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { verifyOwnerSession, verifyPassword, hashPassword } from '@/lib/ownerAuth'

interface Params {
  params: Promise<{ slug: string }>
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { slug } = await params
  const site = await verifyOwnerSession(slug, request.headers.get('cookie'))
  if (!site) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as {
    current_password?: string
    new_password?:     string
  }

  if (!body.current_password || !body.new_password) {
    return NextResponse.json({ error: 'missing_fields' }, { status: 400 })
  }

  if (body.new_password.length < 8) {
    return NextResponse.json({ error: 'password_too_short' }, { status: 400 })
  }

  // Verify current password
  const supabase = createServiceClient()
  const { data: siteWithHash } = await supabase
    .from('sites')
    .select('admin_password_hash')
    .eq('id', site.id)
    .single()

  if (!siteWithHash?.admin_password_hash) {
    return NextResponse.json({ error: 'no_password_set' }, { status: 400 })
  }

  if (!verifyPassword(body.current_password, siteWithHash.admin_password_hash as string)) {
    return NextResponse.json({ error: 'wrong_password' }, { status: 401 })
  }

  const newHash = hashPassword(body.new_password)

  const { error } = await supabase
    .from('sites')
    .update({ admin_password_hash: newHash })
    .eq('id', site.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
