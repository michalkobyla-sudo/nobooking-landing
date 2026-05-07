import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, requireAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('bot_settings')
    .select('purchase_url, enabled')
    .eq('id', 'default')
    .single()

  if (error) return NextResponse.json({ error: 'db_error' }, { status: 500 })
  return NextResponse.json(data)
}

export async function PUT(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { purchase_url, enabled } = (await request.json()) as {
    purchase_url?: string
    enabled?: boolean
  }

  const updates: Record<string, unknown> = {}
  if (purchase_url !== undefined) updates.purchase_url = purchase_url
  if (enabled !== undefined) updates.enabled = enabled

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('bot_settings')
    .update(updates)
    .eq('id', 'default')
    .select()
    .single()

  if (error) return NextResponse.json({ error: 'db_error' }, { status: 500 })
  return NextResponse.json(data)
}
