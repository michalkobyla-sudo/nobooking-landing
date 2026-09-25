import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'nobooking.eu'

// ─── Rate limiting ────────────────────────────────────────────────────────────
// In-memory, per edge node. "Best-effort" — good enough for current scale.
// Upgrade to Upstash Redis at 500+ clients.

interface RateLimitEntry { count: number; resetAt: number }
const rateLimitStore = new Map<string, RateLimitEntry>()

function isRateLimited(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  if (!entry || now > entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs })
    return false // not limited
  }
  if (entry.count >= maxRequests) return true // limited
  entry.count++
  return false // not limited
}

function clientIp(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  )
}

// Rules: [pattern, maxRequests, windowMs, retryAfterSeconds]
//
// Priorytet: endpointy, na których pojedyncze żądanie kosztuje pieniądze
// (wywołanie Anthropic, sesja Stripe, wysyłka maila) albo pozwala zgadywać
// sekrety (kody rabatowe, tokeny).
const RATE_RULES: Array<[RegExp, number, number, number]> = [
  [/^\/api\/sites\/[^/]+\/owner\/login$/, 10, 5 * 60_000, 300],   // 10 req / 5 min
  [/^\/api\/sites\/[^/]+\/owner\/password$/, 5, 10 * 60_000, 600], // 5 req / 10 min
  [/^\/api\/sites\/[^/]+\/book$/, 15, 10 * 60_000, 600],           // 15 req / 10 min
  [/^\/api\/orders$/, 5, 15 * 60_000, 900],                        // 5 req / 15 min

  // Każdy POST uruchamia generowanie strony przez Claude — bez limitu wyciek
  // tokenu poprawek oznaczał nieograniczony rachunek za API.
  [/^\/api\/revisions\/[^/]+$/, 5, 15 * 60_000, 900],

  // Tworzy sesję Stripe, publicznie i bez uwierzytelnienia.
  [/^\/api\/stripe\/checkout$/, 10, 10 * 60_000, 600],

  // Zgadywanie kodów rabatowych.
  [/^\/api\/sites\/[^/]+\/discount$/, 20, 10 * 60_000, 600],

  // Enumeracja tokenów onboardingu.
  [/^\/api\/onboarding\/[^/]+$/, 20, 10 * 60_000, 600],
]

// Uwaga: /api/facebook/webhook celowo NIE jest tu limitowany. Meta wysyła
// zdarzenia z wielu adresów IP, więc limit per-IP i tak by nie zadziałał,
// a mógłby odciąć prawdziwy ruch. Limit dla bota jest nałożony per
// użytkownik Messengera w samym handlerze.

function applyRateLimit(request: NextRequest): NextResponse | null {
  const path = request.nextUrl.pathname
  const ip = clientIp(request)

  for (const [pattern, max, windowMs, retryAfter] of RATE_RULES) {
    if (pattern.test(path)) {
      if (isRateLimited(`${path}:${ip}`, max, windowMs)) {
        console.warn(`[rate-limit] blocked ${ip} → ${path}`)
        return NextResponse.json(
          { error: 'too_many_requests' },
          { status: 429, headers: { 'Retry-After': String(retryAfter) } }
        )
      }
      break
    }
  }
  return null
}

// ─── Main proxy ───────────────────────────────────────────────────────────────

export async function proxy(request: NextRequest) {
  const host = request.headers.get('host') ?? ''
  const { pathname } = request.nextUrl
  const hostname = host.replace(/:\d+$/, '')

  const isMainDomainEarly =
    hostname === ROOT_DOMAIN ||
    hostname === 'www.' + ROOT_DOMAIN ||
    hostname === 'localhost'

  // ── Fast path: public GET pages on main domain — skip middleware entirely
  // so Next.js ISR cache headers are preserved (middleware forces no-store).
  // Rate limiting and admin auth are not needed for these public routes.
  if (
    isMainDomainEarly &&
    request.method === 'GET' &&
    !pathname.startsWith('/api/') &&
    !pathname.startsWith('/admin')
  ) {
    return NextResponse.next()
  }

  // ── 0. Rate limiting ───────────────────────────────────────────────────────
  const rateLimitResponse = applyRateLimit(request)
  if (rateLimitResponse) return rateLimitResponse

  // ── 1. Subdomain routing ───────────────────────────────────────────────────
  // slug.nobooking.eu → /sites/slug
  // demo.nobooking.eu → /demo
  const isMainDomain = isMainDomainEarly

  if (!isMainDomain) {
    const subdomain = hostname.replace(`.${ROOT_DOMAIN}`, '')

    // Ścieżki /api/* obsługujemy bez przepisywania. Wcześniej prefiks
    // dokładany był do wszystkiego, więc wywołanie z apartamentu na
    // subdomenie — casa-sol.nobooking.eu/api/sites/casa-sol/book — trafiało
    // pod /sites/casa-sol/api/sites/casa-sol/book. Taka trasa nie istnieje,
    // więc formularz rezerwacji i kalendarz dostępności na subdomenach
    // odpowiadały 404. Slug jest już w ścieżce, więc prefiks jest zbędny.
    if (subdomain && subdomain !== hostname && !pathname.startsWith('/api/')) {
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
