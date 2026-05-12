import { NextRequest, NextResponse } from 'next/server'
import { cookieName } from '@/lib/ownerAuth'

interface Params {
  params: Promise<{ slug: string }>
}

export async function POST(request: NextRequest, { params }: Params) {
  const { slug } = await params
  const res = NextResponse.redirect(new URL(`/sites/${slug}/admin/login`, request.url))
  res.cookies.set(cookieName(slug), '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
  return res
}
