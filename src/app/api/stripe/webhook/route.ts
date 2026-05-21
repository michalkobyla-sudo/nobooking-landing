import { NextRequest, NextResponse } from 'next/server'
import { createRequire } from 'module'
import { createServiceClient } from '@/lib/supabase'
import { sendBookingConfirmation, sendOwnerBookingNotification, sendOnboardingEmail, type BookingEmailData } from '@/lib/email'
import type { Order } from '@/lib/types'

const _require = createRequire(import.meta.url)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const StripeLib = _require('stripe') as any

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')!

  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  const stripe = new StripeLib(
    (process.env.STRIPE_SECRET_KEY ?? '').trim(),
    { apiVersion: '2026-04-22.dahlia' }
  )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let event: any
  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'invalid signature'
    console.error('[webhook] signature error:', message)
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 })
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  if (event.type === 'checkout.session.completed') {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const session = event.data.object
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const orderId = session.metadata?.order_id as string | undefined
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const sessionId = session.id as string

    if (orderId) {
      const supabase = createServiceClient()

      // Idempotency guard — Stripe may deliver the same event more than once.
      // If stripe_session_id is already set on this order, we already processed it.
      const { data: existing } = await supabase
        .from('orders')
        .select('stripe_session_id, status')
        .eq('id', orderId)
        .single()

      if (existing?.stripe_session_id === sessionId) {
        console.log('[webhook] duplicate order event, skipping', sessionId)
        return NextResponse.json({ received: true })
      }

      // Mark order as paid
      const { error } = await supabase
        .from('orders')
        .update({ stripe_paid: true, stripe_session_id: sessionId })
        .eq('id', orderId)

      if (error) {
        console.error('[webhook] Supabase update error:', error)
      } else {
        // Automatically send onboarding email so the client
        // can fill in their apartment details without any manual admin step.
        try {
          const { data: order } = await supabase
            .from('orders')
            .select('*')
            .eq('id', orderId)
            .single()

          // Only send if email hasn't been sent yet (status is still new/contacted)
          const alreadySent = ['onboarding_sent', 'building', 'completed'].includes(order.status)
          if (order && !alreadySent) {
            await sendOnboardingEmail(order as Order)
            await supabase
              .from('orders')
              .update({ status: 'onboarding_sent' })
              .eq('id', orderId)
            console.log('[webhook] onboarding email sent for order', orderId)
          }
        } catch (emailErr) {
          // Non-fatal — log and continue. Admin can still send manually.
          console.error('[webhook] onboarding email error:', emailErr)
        }
      }
    }

    // ── Booking payment ────────────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const bookingId = session.metadata?.booking_id as string | undefined
    if (bookingId) {
      const supabase = createServiceClient()

      const { data: booking } = await supabase
        .from('bookings')
        .select('id, guest_email, guest_name, site_id, check_in, check_out, total_price, currency, discount_code, stripe_session_id')
        .eq('id', bookingId)
        .single()

      // Idempotency guard — skip if already processed
      if (booking?.stripe_session_id === sessionId) {
        console.log('[webhook] duplicate booking event, skipping', sessionId)
        return NextResponse.json({ received: true })
      }

      if (booking) {
        await supabase
          .from('bookings')
          .update({
            stripe_paid: true,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            stripe_session_id: session.id as string,
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            stripe_payment_id: session.payment_intent as string | null,
            status: 'confirmed',
          })
          .eq('id', bookingId)

        // Increment discount code usage if applicable
        if (booking.discount_code) {
          try {
            await supabase.rpc('increment_discount_usage', {
              p_site_id: booking.site_id,
              p_code: booking.discount_code,
            })
          } catch { /* ignore if RPC not set up */ }
        }

        // Send confirmation emails (non-fatal)
        try {
          const emailData = booking as BookingEmailData
          await sendBookingConfirmation(emailData)
          await sendOwnerBookingNotification(emailData)
        } catch (emailErr) {
          console.error('[webhook] booking email error:', emailErr)
        }
      }
    }
  }

  return NextResponse.json({ received: true })
}
