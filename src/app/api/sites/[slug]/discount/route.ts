import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

interface Params { params: Promise<{ slug: string }> }

// POST /api/sites/[slug]/discount
// Body: { code: string }
// Returns: { valid: boolean, discount_pct: number }
export async function POST(req: NextRequest, { params }: Params) {
  const { slug } = await params
  const { code } = await req.json() as { code?: string }

  if (!code?.trim()) {
    return NextResponse.json({ valid: false, discount_pct: 0 })
  }

  const supabase = createServiceClient()

  const { data: site } = await supabase
    .from('sites')
    .select('id, plan')
    .eq('slug', slug)
    .single()

  if (!site || site.plan !== 'pro') {
    return NextResponse.json({ valid: false, discount_pct: 0 })
  }

  const now = new Date().toISOString().slice(0, 10)

  const { data: dc } = await supabase
    .from('discount_codes')
    .select('id, discount_pct, max_uses, uses_count, valid_until, active')
    .eq('site_id', site.id)
    .eq('code', code.trim().toUpperCase())
    .eq('active', true)
    .single()

  if (!dc) return NextResponse.json({ valid: false, discount_pct: 0 })
  if (dc.valid_until && (dc.valid_until as string) < now) return NextResponse.json({ valid: false, discount_pct: 0 })
  if (dc.max_uses !== null && (dc.uses_count as number) >= (dc.max_uses as number)) return NextResponse.json({ valid: false, discount_pct: 0 })

  return NextResponse.json({ valid: true, discount_pct: dc.discount_pct as number })
}
