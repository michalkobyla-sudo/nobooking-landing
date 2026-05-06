import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, requireAdmin } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from('orders')
    .select('id, created_at, plan, currency, status, stripe_paid, onboarding_submitted, first_name, last_name, email')
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  return NextResponse.json(data)
}
