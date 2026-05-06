import { Resend } from 'resend'
import type { Order } from './types'

const resend = new Resend(process.env.RESEND_API_KEY!)
const FROM = process.env.EMAIL_FROM!
const ADMIN_EMAIL = process.env.ADMIN_EMAIL!
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://nobooking.eu').trim().replace(/\/$/, '')

/** Email 1: Notify Michał of new order */
export async function sendNewOrderNotification(order: Order) {
  const planLabel = order.plan === 'pro' ? 'Pro' : 'Basic'
  const priceLabel = order.currency === 'eur'
    ? (order.plan === 'pro' ? '299 €' : '199 €')
    : (order.plan === 'pro' ? '1 199 zł' : '799 zł')

  await resend.emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `Nowe zamówienie Nobooking — ${order.first_name} ${order.last_name} (${planLabel})`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
        <h2 style="background: #059669; color: white; padding: 1.5rem; margin: 0; border-radius: 8px 8px 0 0;">
          Nowe zamówienie Nobooking
        </h2>
        <div style="border: 1px solid #e5e7eb; border-top: none; padding: 1.5rem; border-radius: 0 0 8px 8px;">
          <p><strong>Plan:</strong> ${planLabel} · ${priceLabel}</p>
          <p><strong>Imię i nazwisko:</strong> ${order.first_name} ${order.last_name}</p>
          <p><strong>Email:</strong> <a href="mailto:${order.email}">${order.email}</a></p>
          <p><strong>Telefon:</strong> <a href="tel:${order.phone}">${order.phone}</a></p>
          ${order.invoice_company ? `<p><strong>Firma:</strong> ${order.invoice_company} · NIP: ${order.invoice_nip ?? '–'}</p>` : ''}
          ${order.invoice_address ? `<p><strong>Adres do faktury:</strong> ${order.invoice_address}</p>` : ''}
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 1rem 0;" />
          <p><strong>Apartament:</strong> ${order.apartment_name}</p>
          <p><strong>Lokalizacja:</strong> ${order.apartment_location}</p>
          ${order.notes ? `<p><strong>Notatki:</strong> ${order.notes}</p>` : ''}
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 1rem 0;" />
          <p><strong>Data zamówienia:</strong> ${new Date(order.created_at).toLocaleString('pl-PL')}</p>
          <p><a href="${SITE_URL}/admin/zamowienia/${order.id}" style="background: #059669; color: white; padding: 0.75rem 1.5rem; border-radius: 8px; text-decoration: none; display: inline-block; margin-top: 0.5rem;">Zobacz w panelu →</a></p>
        </div>
      </div>
    `,
  })
}

/** Email 2: Send onboarding form link to client */
export async function sendOnboardingEmail(order: Order) {
  const onboardingUrl = `${SITE_URL}/onboarding/${order.onboarding_token}`

  await resend.emails.send({
    from: FROM,
    to: order.email,
    subject: `Twoja strona Nobooking — wypełnij formularz`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
        <div style="background: #059669; padding: 2rem; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 1.75rem;">Nobooking</h1>
        </div>
        <div style="border: 1px solid #e5e7eb; border-top: none; padding: 2rem; border-radius: 0 0 8px 8px;">
          <p>Cześć ${order.first_name}!</p>
          <p>Dziękujemy za zakup. Aby zbudować Twoją stronę apartamentu, potrzebujemy kilku informacji.</p>
          <p>Kliknij przycisk poniżej i wypełnij krótki formularz — zajmie to ok. 5 minut:</p>
          <p style="text-align: center; margin: 2rem 0;">
            <a href="${onboardingUrl}" style="background: #059669; color: white; padding: 1rem 2rem; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 1rem; display: inline-block;">
              Wypełnij formularz →
            </a>
          </p>
          <p style="font-size: 0.85rem; color: #6b7280;">Jeśli przycisk nie działa, skopiuj ten link: <a href="${onboardingUrl}">${onboardingUrl}</a></p>
          <p>W razie pytań odpowiedz na tego emaila.</p>
          <p>Pozdrawiamy,<br/>Michał · Nobooking</p>
        </div>
      </div>
    `,
  })
}

/** Email 3: Notify Michał that onboarding form was submitted */
export async function sendOnboardingSubmittedNotification(order: Order) {
  await resend.emails.send({
    from: FROM,
    to: ADMIN_EMAIL,
    subject: `Formularz onboardingowy wypełniony — ${order.first_name} ${order.last_name}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
        <h2 style="background: #059669; color: white; padding: 1.5rem; margin: 0; border-radius: 8px 8px 0 0;">
          Formularz onboardingowy wypełniony
        </h2>
        <div style="border: 1px solid #e5e7eb; border-top: none; padding: 1.5rem; border-radius: 0 0 8px 8px;">
          <p><strong>${order.first_name} ${order.last_name}</strong> wypełnił/a formularz onboardingowy dla <strong>${order.apartment_name}</strong>.</p>
          <p><a href="${SITE_URL}/admin/zamowienia/${order.id}" style="background: #059669; color: white; padding: 0.75rem 1.5rem; border-radius: 8px; text-decoration: none; display: inline-block; margin-top: 0.5rem;">Zobacz formularz w panelu →</a></p>
        </div>
      </div>
    `,
  })
}
