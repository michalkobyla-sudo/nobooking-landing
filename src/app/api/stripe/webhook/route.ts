import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { Resend } from 'resend'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-04-22.dahlia' })
const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    console.error('[webhook] signature error:', err.message)
    return NextResponse.json({ error: 'invalid_signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const plan = session.metadata?.plan ?? 'basic'
    const customerEmail = session.customer_details?.email ?? ''
    const planLabel = plan === 'pro' ? 'Nobooking Pro' : 'Nobooking Basic'

    try {
      await resend.emails.send({
        from: process.env.EMAIL_FROM!,
        to: customerEmail,
        subject: `Dziękujemy! Twój plan ${planLabel} — następny krok`,
        html: `
          <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
            <div style="background: #2B7A78; padding: 2rem; text-align: center;">
              <h1 style="color: white; font-size: 1.8rem; margin: 0;">
                <span style="font-weight: 700">No</span><span style="font-weight: 400">booking</span>
              </h1>
            </div>
            <div style="padding: 2rem;">
              <p>Cześć!</p>
              <p>Dziękujemy za zakup planu <strong>${planLabel}</strong>. Twoja strona będzie gotowa w ciągu <strong>7 dni roboczych</strong>.</p>
              <p>Aby rozpocząć, potrzebujemy od Ciebie kilku informacji o apartamencie. Odpowiedz na tego emaila podając:</p>
              <ul style="line-height: 2;">
                <li>Nazwę apartamentu</li>
                <li>Lokalizację (miasto, adres lub opis)</li>
                <li>Opis apartamentu (pokoje, udogodnienia, zasady)</li>
                <li>Zdjęcia (minimum 10, najlepiej 20+)</li>
                <li>Cennik (cena za noc, sezony, minimalna liczba nocy)</li>
                <li>Preferowana domena (np. moj-apartament.pl)</li>
              </ul>
              <p>Jeśli masz pytania — po prostu odpowiedz na tego emaila.</p>
              <p>Do zobaczenia! 👋</p>
              <p><em>Zespół Nobooking</em></p>
            </div>
          </div>
        `,
      })
    } catch (err) {
      console.error('[webhook] email error:', err)
    }
  }

  return NextResponse.json({ received: true })
}
