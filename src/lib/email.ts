import type { Order } from './types'
import { PRICE_LABELS } from './prices'

const FROM_EMAIL = 'noreply@nobooking.eu'
const FROM_NAME = 'Nobooking'
const ADMIN_EMAIL = () => (process.env.ADMIN_EMAIL || 'michal.kobyla@gmail.com').trim()
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://nobooking.eu').trim().replace(/\/$/, '')

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) throw new Error('BREVO_API_KEY is not set')

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: FROM_NAME, email: FROM_EMAIL },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Brevo error ${res.status}: ${err}`)
  }
}

function renderHeader(subtitle?: string) {
  return `
    <div style="background: #059669; padding: 1.75rem 2rem; text-align: center; border-radius: 12px 12px 0 0;">
      <div style="font-family: -apple-system, sans-serif; font-size: 1.75rem; font-weight: 900; letter-spacing: -0.04em; color: white;">
        <span style="color: rgba(255,255,255,0.6);">No</span>booking
      </div>
      ${subtitle ? `<p style="color: rgba(255,255,255,0.8); margin: 0.5rem 0 0; font-size: 0.9rem; font-family: -apple-system, sans-serif;">${subtitle}</p>` : ''}
    </div>
  `
}

function renderFooter() {
  return `
    <div style="background: #f3f4f6; padding: 1.25rem 1rem; text-align: center; font-size: 0.75rem; color: #9ca3af; font-family: -apple-system, sans-serif; border-radius: 0 0 12px 12px;">
      <strong style="color: #6b7280;">Nobooking</strong> · Strony dla apartamentów wakacyjnych<br/>
      <a href="mailto:kontakt@nobooking.eu" style="color: #9ca3af; text-decoration: none;">kontakt@nobooking.eu</a>
      &nbsp;·&nbsp;
      <a href="https://nobooking.eu" style="color: #9ca3af; text-decoration: none;">nobooking.eu</a>
    </div>
  `
}

function wrapEmail(html: string) {
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
      ${html}
    </div>
  `
}

/** Email 1: Notify Michał of new order */
export async function sendNewOrderNotification(order: Order) {
  const planLabel = order.plan === 'pro' ? 'Pro' : 'Basic'
  const priceLabel = PRICE_LABELS[order.plan][order.currency]

  await sendEmail(
    ADMIN_EMAIL(),
    `🆕 Nowe zamówienie — ${escapeHtml(order.first_name)} ${escapeHtml(order.last_name)} (${planLabel})`,
    wrapEmail(`
      ${renderHeader('Nowe zamówienie')}

      <div style="padding: 2rem;">
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 1.25rem 1.5rem; margin-bottom: 1.5rem;">
          <div style="font-size: 1.25rem; font-weight: 800; color: #059669;">${planLabel} · ${priceLabel}</div>
          <div style="font-size: 0.875rem; color: #6b7280; margin-top: 0.25rem;">
            ${new Date(order.created_at).toLocaleString('pl-PL')}
          </div>
        </div>

        <h3 style="font-size: 0.75rem; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 0.75rem;">Klient</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 1.5rem;">
          <tr>
            <td style="padding: 0.4rem 0; color: #6b7280; font-size: 0.875rem; width: 40%;">Imię i nazwisko</td>
            <td style="padding: 0.4rem 0; font-weight: 600; font-size: 0.875rem;">${escapeHtml(order.first_name)} ${escapeHtml(order.last_name)}</td>
          </tr>
          <tr>
            <td style="padding: 0.4rem 0; color: #6b7280; font-size: 0.875rem;">Email</td>
            <td style="padding: 0.4rem 0; font-size: 0.875rem;"><a href="mailto:${escapeHtml(order.email)}" style="color: #059669;">${escapeHtml(order.email)}</a></td>
          </tr>
          <tr>
            <td style="padding: 0.4rem 0; color: #6b7280; font-size: 0.875rem;">Telefon</td>
            <td style="padding: 0.4rem 0; font-size: 0.875rem;"><a href="tel:${escapeHtml(order.phone)}" style="color: #059669;">${escapeHtml(order.phone)}</a></td>
          </tr>
          ${order.invoice_company ? `
          <tr>
            <td style="padding: 0.4rem 0; color: #6b7280; font-size: 0.875rem;">Firma / NIP</td>
            <td style="padding: 0.4rem 0; font-size: 0.875rem;">${escapeHtml(order.invoice_company)}${order.invoice_nip ? ` · NIP: ${escapeHtml(order.invoice_nip)}` : ''}</td>
          </tr>
          ` : ''}
          ${order.invoice_address ? `
          <tr>
            <td style="padding: 0.4rem 0; color: #6b7280; font-size: 0.875rem;">Adres</td>
            <td style="padding: 0.4rem 0; font-size: 0.875rem;">${escapeHtml(order.invoice_address)}</td>
          </tr>
          ` : ''}
        </table>

        <h3 style="font-size: 0.75rem; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; margin: 0 0 0.75rem;">Apartament</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 1.5rem;">
          <tr>
            <td style="padding: 0.4rem 0; color: #6b7280; font-size: 0.875rem; width: 40%;">Nazwa</td>
            <td style="padding: 0.4rem 0; font-weight: 600; font-size: 0.875rem;">${escapeHtml(order.apartment_name)}</td>
          </tr>
          <tr>
            <td style="padding: 0.4rem 0; color: #6b7280; font-size: 0.875rem;">Lokalizacja</td>
            <td style="padding: 0.4rem 0; font-size: 0.875rem;">${escapeHtml(order.apartment_location)}</td>
          </tr>
          ${order.notes ? `
          <tr>
            <td style="padding: 0.4rem 0; color: #6b7280; font-size: 0.875rem; vertical-align: top;">Notatki</td>
            <td style="padding: 0.4rem 0; font-size: 0.875rem;">${escapeHtml(order.notes)}</td>
          </tr>
          ` : ''}
        </table>

        <div style="text-align: center; margin-top: 2rem;">
          <a href="${SITE_URL}/admin/zamowienia/${order.id}" style="display: inline-block; background: #059669; color: white; padding: 0.875rem 2rem; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 0.95rem;">
            Zobacz w panelu →
          </a>
        </div>
      </div>

      ${renderFooter()}
    `)
  )
}

/** Email 2: Send onboarding form link to client */
export async function sendOnboardingEmail(order: Order) {
  const onboardingUrl = `${SITE_URL}/onboarding/${order.onboarding_token}`

  await sendEmail(
    order.email,
    `Twoja strona apartamentu — wypełnij formularz`,
    wrapEmail(`
      ${renderHeader('Jeden krok do Twojej strony')}

      <div style="padding: 2rem;">
        <p style="font-size: 1rem; margin: 0 0 1rem;">Cześć <strong>${escapeHtml(order.first_name)}</strong>! 👋</p>
        <p style="color: #374151; margin: 0 0 1rem;">
          Dziękujemy za zakup. Twoja płatność została potwierdzona.
        </p>
        <p style="color: #374151; margin: 0 0 1.5rem;">
          Aby zbudować stronę Twojego apartamentu, potrzebujemy kilku informacji — opis, zdjęcia, cennik, zasady rezerwacji.
          Wypełnienie formularza zajmie ok. <strong>5 minut</strong>.
        </p>

        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 1.25rem 1.5rem; margin-bottom: 1.5rem;">
          <div style="font-size: 0.875rem; color: #374151; margin-bottom: 0.75rem;">
            🏠 <strong>${escapeHtml(order.apartment_name)}</strong> · Plan ${order.plan === 'pro' ? 'Pro' : 'Basic'}
          </div>
          <div style="font-size: 0.8rem; color: #6b7280;">
            Po wypełnieniu formularza skontaktujemy się z Tobą, by omówić szczegóły i ustalić datę uruchomienia strony.
          </div>
        </div>

        <div style="text-align: center; margin: 2rem 0;">
          <a href="${onboardingUrl}" style="display: inline-block; background: #059669; color: white; padding: 1rem 2.5rem; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 1rem;">
            Wypełnij formularz →
          </a>
        </div>

        <p style="font-size: 0.8rem; color: #9ca3af; text-align: center;">
          Jeśli przycisk nie działa, skopiuj ten link:<br/>
          <a href="${onboardingUrl}" style="color: #059669; word-break: break-all;">${onboardingUrl}</a>
        </p>

        <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 2rem 0;" />
        <p style="color: #374151; margin: 0;">W razie pytań odpowiedz na tego emaila.<br/>
        <strong>Michał · Nobooking</strong></p>
      </div>

      ${renderFooter()}
    `)
  )
}

/** Email 3b: Notify client of status change */
export async function sendStatusUpdateEmail(order: Order, status: string) {
  const messages: Record<string, { subject: string; emoji: string; title: string; body: string }> = {
    contacted: {
      subject: `Nobooking — jesteśmy w kontakcie!`,
      emoji: '👋',
      title: 'Jesteśmy w kontakcie',
      body: 'Otrzymaliśmy Twoje zamówienie i wkrótce się z Tobą skontaktujemy, aby omówić szczegóły realizacji.',
    },
    building: {
      subject: `Nobooking — budujemy Twoją stronę!`,
      emoji: '🔨',
      title: 'Budujemy Twoją stronę',
      body: 'Świetna wiadomość — zaczęliśmy pracę nad Twoją stroną apartamentu. Damy znać gdy będzie gotowa do podglądu.',
    },
    completed: {
      subject: `Nobooking — Twoja strona jest gotowa! 🎉`,
      emoji: '🎉',
      title: 'Twoja strona jest gotowa!',
      body: 'Twoja strona apartamentu jest gotowa. Skontaktujemy się z Tobą, aby przekazać dostępy i omówić uruchomienie.',
    },
  }

  const msg = messages[status]
  if (!msg) return // nie wysyłamy dla innych statusów

  await sendEmail(
    order.email,
    msg.subject,
    wrapEmail(`
      ${renderHeader(msg.title)}

      <div style="padding: 2rem;">
        <p style="font-size: 2rem; margin: 0 0 1rem; text-align: center;">${msg.emoji}</p>
        <p style="font-size: 1rem; margin: 0 0 1rem;">Cześć <strong>${escapeHtml(order.first_name)}</strong>!</p>
        <p style="color: #374151; margin: 0 0 1.5rem; line-height: 1.7;">${msg.body}</p>

        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 1.25rem 1.5rem; margin-bottom: 1.5rem;">
          <div style="font-size: 0.875rem; color: #374151;">
            🏠 <strong>${escapeHtml(order.apartment_name)}</strong> · Plan ${order.plan === 'pro' ? 'Pro' : 'Basic'}
          </div>
        </div>

        <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 2rem 0;" />
        <p style="color: #374151; margin: 0;">W razie pytań odpowiedz na tego emaila.<br/>
        <strong>Michał · Nobooking</strong></p>
      </div>

      ${renderFooter()}
    `)
  )
}

/** Email 4: Notify client that their site preview is ready */
export async function sendSiteReadyEmail(order: Order, slug: string) {
  const siteUrl = `${SITE_URL}/sites/${slug}`

  await sendEmail(
    order.email,
    `Nobooking — Twoja strona jest gotowa do podglądu! 🎉`,
    wrapEmail(`
      ${renderHeader('Twoja strona jest gotowa!')}

      <div style="padding: 2rem;">
        <p style="font-size: 2rem; margin: 0 0 1rem; text-align: center;">🎉</p>
        <p style="font-size: 1rem; margin: 0 0 1rem;">Cześć <strong>${escapeHtml(order.first_name)}</strong>!</p>
        <p style="color: #374151; margin: 0 0 1rem; line-height: 1.7;">
          Przygotowaliśmy pierwszą wersję strony Twojego apartamentu na podstawie przesłanego formularza.
          Możesz już ją obejrzeć — to wstępny podgląd, który dopracujemy razem.
        </p>

        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 1.25rem 1.5rem; margin-bottom: 1.5rem;">
          <div style="font-size: 0.875rem; color: #374151; margin-bottom: 0.75rem;">
            🏠 <strong>${escapeHtml(order.apartment_name)}</strong> · Plan ${order.plan === 'pro' ? 'Pro' : 'Basic'}
          </div>
          <div style="font-size: 0.8rem; color: #6b7280;">
            Strona działa pod adresem:<br/>
            <a href="${siteUrl}" style="color: #059669; font-weight: 600; word-break: break-all;">${siteUrl}</a>
          </div>
        </div>

        <div style="text-align: center; margin: 2rem 0;">
          <a href="${siteUrl}" style="display: inline-block; background: #059669; color: white; padding: 1rem 2.5rem; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 1rem;">
            Zobacz swoją stronę →
          </a>
        </div>

        <p style="color: #374151; font-size: 0.875rem; line-height: 1.7;">
          Co dalej? Przejrzyj stronę i napisz mi co chcesz zmienić — opisy, kolory, układ.
          Następnie podmienię zdjęcia na Twoje (wyślij mi je na kontakt@nobooking.eu lub przez WeTransfer).
        </p>

        <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 2rem 0;" />
        <p style="color: #374151; margin: 0;">W razie pytań odpowiedz na tego emaila.<br/>
        <strong>Michał · Nobooking</strong></p>
      </div>

      ${renderFooter()}
    `)
  )
}

/** Email 3: Notify Michał that onboarding form was submitted */
export async function sendOnboardingSubmittedNotification(order: Order) {
  await sendEmail(
    ADMIN_EMAIL(),
    `✅ Formularz wypełniony — ${escapeHtml(order.first_name)} ${escapeHtml(order.last_name)}`,
    wrapEmail(`
      ${renderHeader('Formularz onboardingowy wypełniony')}

      <div style="padding: 2rem;">
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 10px; padding: 1.25rem 1.5rem; margin-bottom: 1.5rem;">
          <div style="font-size: 1rem; font-weight: 700; color: #059669; margin-bottom: 0.25rem;">
            ${escapeHtml(order.first_name)} ${escapeHtml(order.last_name)}
          </div>
          <div style="font-size: 0.875rem; color: #6b7280;">
            ${escapeHtml(order.apartment_name)} · ${order.apartment_location ? escapeHtml(order.apartment_location) : ''}
          </div>
        </div>

        <p style="color: #374151;">
          Klient wypełnił formularz onboardingowy. Wszystkie dane do realizacji są dostępne w panelu.
        </p>

        <div style="text-align: center; margin-top: 2rem;">
          <a href="${SITE_URL}/admin/zamowienia/${order.id}" style="display: inline-block; background: #059669; color: white; padding: 0.875rem 2rem; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 0.95rem;">
            Zobacz formularz w panelu →
          </a>
        </div>
      </div>

      ${renderFooter()}
    `)
  )
}
