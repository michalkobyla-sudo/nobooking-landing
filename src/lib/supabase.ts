import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { czyAdmin } from '@/lib/czyAdmin'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

/** Server-side client with service role key — bypasses RLS, for API routes */
export function createServiceClient() {
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false },
  })
}

/** Server-side client with anon key + cookie session — for admin auth checks */
export async function createAdminSessionClient() {
  const cookieStore = await cookies()
  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieStore.set(name, value, options)
        )
      },
    },
  })
}

/**
 * Sesja administratora w trasach API. `null`, gdy wolno; inaczej 401/403.
 * Samo zalogowanie nie wystarcza — patrz `lib/czyAdmin.ts`.
 */
export async function requireAdmin(_request: NextRequest): Promise<NextResponse | null> {
  const supabase = await createAdminSessionClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (!czyAdmin(user)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }
  return null
}
