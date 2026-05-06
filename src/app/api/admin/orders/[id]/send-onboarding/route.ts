import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, requireAdmin } from '@/lib/supabase'
import { sendOnboardingEmail } from '@/lib/email'
import type { Order } from '@/lib/types'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: Params) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { id } = await params
  const supabase = createServiceClient()

  const { data: order, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !order) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  if (!order.stripe_paid) {
    return NextResponse.json({ error: 'not_paid' }, { status: 400 })
  }

  try {
    await sendOnboardingEmail(order as Order)
  } catch (err) {
    console.error('[send-onboarding] email error:', err)
    return NextResponse.json({ error: 'email_error' }, { status: 500 })
  }

  // Update status to onboarding_sent
  await supabase
    .from('orders')
    .update({ status: 'onboarding_sent' })
    .eq('id', id)

  return NextResponse.json({ success: true })
}
