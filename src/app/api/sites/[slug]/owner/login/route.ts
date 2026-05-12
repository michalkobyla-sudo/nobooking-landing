import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { verifyPassword, createOwnerToken, cookieName } from '@/lib/ownerAuth'

interface Params {
  params: Promise<{ slug: string }>
}

export async function POST(request: NextRequest, { params }: Params) {
  const { slug } = await params
  const body = await request.json().catch(() => ({})) as { password?: string }

  if (!body.password) {
    return NextResponse.json({ error: 'missing_password' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data: site } = await supabase
    .from('sites')
    .select('id, slug, admin_password_hash, active')
    .eq('slug', slug)
    .eq('active', true)
    .single()

  if (!site?.admin_password_hash) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  if (!verifyPassword(body.password, site.admin_password_hash as string)) {
    return NextResponse.json({ error: 'invalid_password' }, { status: 401 })
  }

  const token = createOwnerToken(site.id as string, slug)
  const res = NextResponse.json({ ok: true })
  res.cookies.set(cookieName(slug), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  })
  return res
}
