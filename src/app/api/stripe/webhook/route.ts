import { NextRequest, NextResponse } from 'next/server'
import { createRequire } from 'module'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createServiceClient } from '@/lib/supabase'
import { sendBookingConfirmation, sendOwnerBookingNotification, sendOnboardingEmail, type BookingEmailData } from '@/lib/email'
import type { Order } from '@/lib/types'

const _require = createRequire(import.meta.url)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const StripeLib = _require('stripe') as any

/** Kod błędu Postgresa dla naruszenia unikalności. */
const PG_UNIQUE_VIOLATION = '23505'

/**
 * Rejestruje zdarzenie jako przetwarzane. Zwraca false, jeśli już było.
 *
 * Stripe gwarantuje at-least-once delivery — powtórki to normalny element
 * protokołu, nie awaria. Wcześniej każda gałąź miała własne zabezpieczenie
 * (odczyt, potem zapis — z oknem wyścigu), a gałąź odnowienia subskrypcji nie
 * miała żadnego: każde ponowne dostarczenie dokładało kolejne 2 lata ważności.
 *
 * Klucz główny na event_id przenosi rozstrzygnięcie do bazy, więc działa też
 * przy dwóch dostarczeniach obsługiwanych równolegle.
 */
async function claimEvent(
  supabase: SupabaseClient,
  eventId: string,
  eventType: string,
): Promise<boolean> {
  const { error } = await supabase
    .from('stripe_webhook_events')
    .insert({ event_id: eventId, event_type: eventType })

  if (!error) return true
  if (error.code === PG_UNIQUE_VIOLATION) return false

  // Nieznany błąd bazy — lepiej pozwolić Stripe ponowić, niż przetworzyć
  // zdarzenie bez zapisanego śladu.
  throw new Error(`claimEvent failed: ${error.message}`)
}

/** Zwalnia zaklepanie, żeby ponowienie ze strony Stripe mogło zadziałać. */
async function releaseEvent(supabase: SupabaseClient, eventId: string): Promise<void> {
  await supabase.from('stripe_webhook_events').delete().eq('event_id', eventId)
}

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
  const eventId = event.id as string
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const eventType = event.type as string

  // Przy direct charges płatność za rezerwację powstaje na koncie właściciela,
  // więc jej zdarzenie przychodzi z ustawionym event.account (acct_xxx).
  // Zdarzenia własne platformy (zamówienie strony, odnowienie subskrypcji)
  // nie mają tego pola. Wymaga to zarejestrowania w Stripe endpointu typu
  // "Connect" — bez tego zdarzenia rezerwacji w ogóle nie dotrą.
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  const connectedAccountId = (event.account as string | undefined) ?? null

  if (eventType !== 'checkout.session.completed') {
    return NextResponse.json({ received: true })
  }

  const supabase = createServiceClient()

  let fresh: boolean
  try {
    fresh = await claimEvent(supabase, eventId, eventType)
  } catch (err) {
    console.error('[webhook] claim error:', err)
    return NextResponse.json({ error: 'claim_failed' }, { status: 500 })
  }

  if (!fresh) {
    console.log('[webhook] zdarzenie już przetworzone, pomijam', eventId)
    return NextResponse.json({ received: true, duplicate: true })
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const session = event.data.object

    // Środki muszą być faktycznie pobrane. Zdarzenie checkout.session.completed
    // potrafi przyjść z payment_status innym niż 'paid' dla metod z opóźnionym
    // potwierdzeniem — wcześniej rezerwacja była wtedy potwierdzana mimo braku
    // wpłaty.
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const paymentStatus = session.payment_status as string | undefined
    if (paymentStatus && paymentStatus !== 'paid') {
      console.warn(`[webhook] pomijam ${eventId} — payment_status=${paymentStatus}`)
      return NextResponse.json({ received: true, skipped: 'unpaid' })
    }

    // ── Zamówienie strony (order) ─────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const orderId = session.metadata?.order_id as string | undefined
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const sessionId = session.id as string

    // Zamówienie strony i odnowienie subskrypcji to przychód platformy —
    // ich sesje tworzymy na koncie platformy, więc zdarzenie MUSI przyjść
    // bez event.account. Właściciel ma pełną kontrolę nad swoim kontem
    // połączonym i mógłby inaczej wystawić sobie sesję z metadanymi
    // {type: 'renewal'} na dowolną kwotę i przedłużyć subskrypcję za darmo.
    const platformOnly = orderId
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      || (session.metadata?.type as string | undefined) === 'renewal'

    if (platformOnly && connectedAccountId) {
      console.error(
        `[webhook] odrzucam ${eventId}: zdarzenie platformowe przyszło ` +
        `z konta połączonego ${connectedAccountId}`
      )
      return NextResponse.json({ received: true, rejected: 'connected_account_not_allowed' })
    }

    if (orderId) {
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

          // Only send if email hasn't been sent yet (status is still new/contacted).
          // Kolejność ma znaczenie: order.status czytane przed sprawdzeniem order
          // rzucało TypeError, który cicho łapał catch niżej — klient płacił
          // i nie dostawał maila onboardingowego.
          if (order) {
            const alreadySent = ['onboarding_sent', 'building', 'completed']
              .includes(order.status as string)

            if (!alreadySent) {
              await sendOnboardingEmail(order as Order)
              await supabase
                .from('orders')
                .update({ status: 'onboarding_sent' })
                .eq('id', orderId)
              console.log('[webhook] onboarding email sent for order', orderId)
            }
          } else {
            console.error('[webhook] nie znaleziono zamówienia', orderId)
          }
        } catch (emailErr) {
          // Non-fatal — log and continue. Admin can still send manually.
          console.error('[webhook] onboarding email error:', emailErr)
        }
      }
    }

    // ── Renewal payment ───────────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const renewalType = session.metadata?.type as string | undefined
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const renewalSiteId = session.metadata?.site_id as string | undefined

    if (renewalType === 'renewal' && renewalSiteId) {
      const { data: site } = await supabase
        .from('sites')
        .select('id, expires_at, slug')
        .eq('id', renewalSiteId)
        .single()

      if (site) {
        // Extend from current expires_at (not now) so early renewals aren't penalised
        const currentExpiry = site.expires_at
          ? new Date(site.expires_at as string)
          : new Date()
        const newExpiry = new Date(currentExpiry.getTime() + 2 * 365.25 * 24 * 60 * 60 * 1000)

        await supabase
          .from('sites')
          .update({
            expires_at: newExpiry.toISOString(),
            active: true, // Re-activate if was deactivated after grace period
          })
          .eq('id', renewalSiteId)

        // Clear sent reminders so the cycle starts fresh for the new period
        await supabase
          .from('renewal_reminders')
          .delete()
          .eq('site_id', renewalSiteId)

        console.log(`[webhook] renewal processed for site ${site.slug as string}, new expiry: ${newExpiry.toISOString()}`)
      }

      return NextResponse.json({ received: true })
    }

    // ── Booking payment ────────────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const bookingId = session.metadata?.booking_id as string | undefined
    if (bookingId) {
      const { data: booking } = await supabase
        .from('bookings')
        .select('id, guest_email, guest_name, site_id, check_in, check_out, total_price, currency, discount_code, stripe_session_id')
        .eq('id', bookingId)
        .single()

      if (!booking) {
        console.error('[webhook] nie znaleziono rezerwacji', bookingId)
        return NextResponse.json({ received: true })
      }

      // Zdarzenie musi pochodzić z konta Stripe tej właśnie strony. Bez tego
      // sprawdzenia właściciel jednego apartamentu mógłby — wysyłając zdarzenie
      // ze swojego konta z cudzym booking_id w metadanych — potwierdzić
      // rezerwację u kogoś innego.
      const { data: bookingSite } = await supabase
        .from('sites')
        .select('stripe_account_id, slug')
        .eq('id', booking.site_id)
        .single()

      if (bookingSite?.stripe_account_id !== connectedAccountId) {
        console.error(
          `[webhook] odrzucam ${eventId}: konto ${connectedAccountId ?? 'platforma'} ` +
          `nie jest kontem strony ${bookingSite?.slug as string ?? booking.site_id}`
        )
        return NextResponse.json({ received: true, rejected: 'account_mismatch' })
      }

      // Kwota pobrana musi zgadzać się z ceną rezerwacji. Rozbieżność oznacza
      // albo zmianę cennika w trakcie płatności, albo manipulację — w obu
      // przypadkach nie potwierdzamy automatycznie.
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      const amountTotal = session.amount_total as number | undefined
      const expectedCents = Math.round(Number(booking.total_price) * 100)

      if (typeof amountTotal === 'number' && amountTotal !== expectedCents) {
        console.error(
          `[webhook] niezgodność kwoty dla rezerwacji ${bookingId}: ` +
          `Stripe ${amountTotal}, oczekiwano ${expectedCents} — wymaga sprawdzenia`
        )
        return NextResponse.json({ received: true, flagged: 'amount_mismatch' })
      }

      await supabase
        .from('bookings')
        .update({
          stripe_paid: true,
          stripe_session_id: sessionId,
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

    return NextResponse.json({ received: true })

  } catch (err) {
    // Zwalniamy zaklepanie, żeby ponowienie ze strony Stripe mogło dokończyć
    // pracę — inaczej zdarzenie zostałoby uznane za obsłużone mimo błędu.
    await releaseEvent(supabase, eventId).catch(releaseErr =>
      console.error('[webhook] release error:', releaseErr)
    )
    console.error('[webhook] processing error:', err)
    return NextResponse.json({ error: 'processing_failed' }, { status: 500 })
  }
}
