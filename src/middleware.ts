import { NextRequest, NextResponse } from 'next/server'

/**
 * Subdomain routing for nobooking.eu
 *
 * casasol.nobooking.eu  →  /sites/casasol
 * demo.nobooking.eu     →  /demo  (special case — the demo apartment page)
 * nobooking.eu          →  pass-through (main landing)
 * localhost:3000        →  pass-through (local dev)
 */

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? 'nobooking.eu'

export function middleware(req: NextRequest) {
  const host = req.headers.get('host') ?? ''
  const { pathname } = req.nextUrl

  // Strip port for local dev (localhost:3000 → localhost)
  const hostname = host.replace(/:\d+$/, '')

  // Not a subdomain — main site, pass through
  if (hostname === ROOT_DOMAIN || hostname === 'www.' + ROOT_DOMAIN || hostname === 'localhost') {
    return NextResponse.next()
  }

  // Extract subdomain: "casasol.nobooking.eu" → "casasol"
  const subdomain = hostname.replace(`.${ROOT_DOMAIN}`, '')

  // Ignore non-subdomain hosts (Vercel preview URLs etc.)
  if (!subdomain || subdomain === hostname) {
    return NextResponse.next()
  }

  // Special case: demo.nobooking.eu → /demo
  if (subdomain === 'demo') {
    const url = req.nextUrl.clone()
    url.pathname = `/demo${pathname === '/' ? '' : pathname}`
    return NextResponse.rewrite(url)
  }

  // All other subdomains: slug.nobooking.eu → /sites/slug
  const url = req.nextUrl.clone()
  url.pathname = `/sites/${subdomain}${pathname === '/' ? '' : pathname}`
  return NextResponse.rewrite(url)
}

export const config = {
  matcher: [
    /*
     * Match all paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public files (images, etc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
