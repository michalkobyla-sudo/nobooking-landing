import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, requireAdmin } from '@/lib/supabase'
import { sendOnboardingEmail } from '@/lib/email'
import { wczesnyStartZSesji } from '@/lib/checkoutZamowienia'
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

  try {
    // Chwili płatności nie znamy — sesja Stripe żyje do 24 h od zamówienia.
    // Dzień zapasu: termin odstąpienia podany klientowi może być dłuższy od
    // ustawowego, nigdy krótszy.
    const zawarcie = new Date(Date.parse(String(order.created_at)) + 86_400_000)
    await sendOnboardingEmail(order as Order, zawarcie, await wczesnyStartZSesji(order.stripe_session_id as string | null))
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
