import { NextRequest, NextResponse } from 'next/server'
import { cookieName } from '@/lib/ownerAuth'

interface Params {
  params: Promise<{ slug: string }>
}

export async function POST(_request: NextRequest, { params }: Params) {
  const { slug } = await params
  const res = NextResponse.json({ ok: true })
  res.cookies.set(cookieName(slug), '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: `/sites/${slug}/admin`,
    maxAge: 0,
  })
  return res
}
