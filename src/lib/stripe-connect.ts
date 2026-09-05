import { createRequire } from 'module'

const _require = createRequire(import.meta.url)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const StripeLib = _require('stripe') as any

function getStripe() {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  return new StripeLib(
    (process.env.STRIPE_SECRET_KEY ?? '').trim(),
    { apiVersion: '2026-04-22.dahlia' }
  )
}

/**
 * Create a Stripe Connect Express account for an apartment owner.
 * Returns the account id (acct_xxx).
 */
export async function createConnectAccount(email: string): Promise<string> {
  const stripe = getStripe()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  const account = await stripe.accounts.create({
    type: 'express',
    email,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_type: 'individual',
    settings: {
      payouts: { schedule: { interval: 'weekly', weekly_anchor: 'monday' } },
    },
  })
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  return account.id as string
}

/**
 * Generate an onboarding URL for a Connect Express account.
 * Owner visits this URL to set up their Stripe account.
 */
export async function createOnboardingLink(
  accountId: string,
  slug: string,
): Promise<string> {
  const stripe = getStripe()
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://nobooking.eu').trim().replace(/\/$/, '')

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${siteUrl}/api/connect/onboard?slug=${slug}&refresh=1`,
    return_url:  `${siteUrl}/api/connect/callback?slug=${slug}`,
    type: 'account_onboarding',
  })
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  return link.url as string
}

/**
 * Check if a Connect account has completed onboarding.
 */
export async function isConnectAccountReady(accountId: string): Promise<boolean> {
  const stripe = getStripe()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  const account = await stripe.accounts.retrieve(accountId)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  return account.details_submitted === true && account.charges_enabled === true
}

/**
 * Sesja Stripe Checkout za rezerwację apartamentu — DIRECT CHARGE.
 *
 * Płatność powstaje bezpośrednio na koncie właściciela (`stripeAccount`), więc:
 *   - właściciel jest merchant of record,
 *   - prowizję Stripe płaci właściciel, nie platforma,
 *   - chargebacki i zwroty obciążają właściciela,
 *   - gość widzi na wyciągu firmę właściciela, nie Nobooking.
 *
 * Wcześniej był tu destination charge (`payment_intent_data.transfer_data`)
 * bez `application_fee_amount`. Przy takim ustawieniu merchant of record była
 * platforma: Nobooking płacił prowizję Stripe od każdej rezerwacji swoich
 * klientów, przekazywał im 100% kwoty i odpowiadał za ich chargebacki.
 *
 * Nie podajemy `payment_method_types` — przy direct charge Stripe pokazuje
 * metody włączone na koncie właściciela. Sztywna lista ['card','blik','p24']
 * powodowała błąd tworzenia sesji dla kont, które nie mają blik/p24 (czyli
 * praktycznie każdego właściciela spoza Polski).
 */
export async function createBookingCheckout(params: {
  accountId: string
  amountCents: number
  currency: string
  bookingId: string
  siteSlug: string
  guestEmail: string
  description: string
}): Promise<string> {
  const stripe = getStripe()
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://nobooking.eu').trim().replace(/\/$/, '')

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  const session = await stripe.checkout.sessions.create(
    {
      mode: 'payment',
      customer_email: params.guestEmail,
      line_items: [{
        price_data: {
          currency: params.currency,
          unit_amount: params.amountCents,
          product_data: { name: params.description },
        },
        quantity: 1,
      }],
      success_url: `${siteUrl}/sites/${params.siteSlug}/guest/${params.bookingId}?paid=1`,
      cancel_url:  `${siteUrl}/sites/${params.siteSlug}?cancelled=1`,
      metadata: { booking_id: params.bookingId, site_slug: params.siteSlug },
    },
    { stripeAccount: params.accountId },
  )

  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
  return session.url as string
}
