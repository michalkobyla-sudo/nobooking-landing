import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import {
  verifyOwnerSession, verifyPassword, hashPassword,
  createOwnerToken, cookieName, siteTokenVersion,
} from '@/lib/ownerAuth'

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

  // Podbicie token_version unieważnia wszystkie wcześniej wydane cookie tej
  // strony. Bez tego zmiana hasła po włamaniu nie wyrzucała włamywacza — jego
  // sesja żyła jeszcze do 7 dni.
  const newVersion = siteTokenVersion(site) + 1

  const { error } = await supabase
    .from('sites')
    .update({ admin_password_hash: newHash, token_version: newVersion })
    .eq('id', site.id)

  if (error) {
    // Kolumna token_version dochodzi migracją 2026-09-05-p1-fixes.sql.
    // Dopóki jej nie ma, zmieniamy samo hasło — bez unieważniania sesji,
    // ale też bez blokowania właściciela.
    const brakKolumny = error.message.toLowerCase().includes('token_version')
    if (!brakKolumny) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.warn('[password] brak kolumny token_version — sesje nie zostaną unieważnione')
    const { error: fallbackError } = await supabase
      .from('sites')
      .update({ admin_password_hash: newHash })
      .eq('id', site.id)

    if (fallbackError) {
      return NextResponse.json({ error: fallbackError.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true, sessions_revoked: false })
  }

  // Bieżąca sesja dostaje świeży token — właściciel nie zostaje wylogowany
  // przez własną zmianę hasła, ale każda inna sesja przestaje działać.
  const res = NextResponse.json({ ok: true, sessions_revoked: true })
  res.cookies.set(cookieName(slug), createOwnerToken(site.id as string, slug, newVersion), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60,
  })
  return res
}
