import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, requireAdmin } from '@/lib/supabase'
import { sendStatusUpdateEmail } from '@/lib/email'
import type { Order, OrderStatus } from '@/lib/types'

interface Params {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: Params) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { id } = await params
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  return NextResponse.json(data)
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { id } = await params
  const { status } = await request.json() as { status?: OrderStatus }

  const validStatuses: OrderStatus[] = ['new', 'contacted', 'onboarding_sent', 'building', 'completed']
  if (!status || !validStatuses.includes(status)) {
    return NextResponse.json({ error: 'invalid_status' }, { status: 400 })
  }

  const supabase = createServiceClient()
  const { data: order, error } = await supabase
    .from('orders')
    .update({ status })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  // Send email notification to client for key status changes
  try {
    await sendStatusUpdateEmail(order as Order, status)
  } catch (err) {
    console.error('[status-update] email error:', err)
  }

  return NextResponse.json({ success: true })
}
