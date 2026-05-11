import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'nobooking.eu'

export async function proxy(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const { pathname } = request.nextUrl
  const hostname = host.replace(/:\d+$/, '')

  // ── 1. Subdomain routing ───────────────────────────────────────────────────
  // slug.nobooking.eu → /sites/slug
  // demo.nobooking.eu → /demo
  const isMainDomain =
    hostname === ROOT_DOMAIN ||
    hostname === 'www.' + ROOT_DOMAIN ||
    hostname === 'localhost'

  if (!isMainDomain) {
    const subdomain = hostname.replace(`.${ROOT_DOMAIN}`, '')

    if (subdomain && subdomain !== hostname) {
      const url = request.nextUrl.clone()

      if (subdomain === 'demo') {
        url.pathname = `/demo${pathname === '/' ? '' : pathname}`
      } else {
        url.pathname = `/sites/${subdomain}${pathname === '/' ? '' : pathname}`
      }

      return NextResponse.rewrite(url)
    }
  }

  // ── 2. Admin auth protection ───────────────────────────────────────────────
  const isAdminRoute = pathname.startsWith('/admin') || pathname.startsWith('/api/admin')
  const isLoginPage = pathname === '/admin/login'

  if (!isAdminRoute || isLoginPage) {
    return NextResponse.next()
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }

  try {
    const response = NextResponse.next()

    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            response.cookies.set(name, value, options)
          })
        },
      },
    })

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
      }
      return NextResponse.redirect(new URL('/admin/login', request.url))
    }

    return response
  } catch (err) {
    console.error('[proxy] auth check failed:', err)
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/admin/login', request.url))
  }
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
