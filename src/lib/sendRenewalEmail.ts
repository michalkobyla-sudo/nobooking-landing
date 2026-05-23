/**
 * sendRenewalEmail — wysyła emaile przypominające o odnowieniu subskrypcji.
 * 5 progów czasowych, każdy z innym tonem.
 */

const FROM_EMAIL = 'noreply@nobooking.eu'
const FROM_NAME = 'Nobooking'
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://nobooking.eu').trim().replace(/\/$/, '')

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

function renderHeader(subtitle: string, urgent = false) {
  const bg = urgent ? '#DC2626' : '#059669'
  return `
    <div style="background: ${bg}; padding: 1.75rem 2rem; text-align: center; border-radius: 12px 12px 0 0;">
      <div style="font-family: -apple-system, sans-serif; font-size: 1.75rem; font-weight: 900; letter-spacing: -0.04em; color: white;">
        <span style="color: rgba(255,255,255,0.6);">No</span>booking
      </div>
      <p style="color: rgba(255,255,255,0.85); margin: 0.5rem 0 0; font-size: 0.9rem; font-family: -apple-system, sans-serif;">${subtitle}</p>
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

function renderRenewButton(renewUrl: string, label = 'Odnów subskrypcję →') {
  return `
    <div style="text-align: center; margin: 2rem 0;">
      <a href="${renewUrl}"
         style="display: inline-block; background: #059669; color: white; text-decoration: none;
                padding: 0.875rem 2rem; border-radius: 100px; font-size: 1rem; font-weight: 700;
                font-family: -apple-system, sans-serif; letter-spacing: -0.01em;">
        ${label}
      </a>
    </div>
  `
}

function formatDate(date: Date) {
  return date.toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatPrice(pricePln: number | null, priceEur: number | null, currency: string | null) {
  if (currency === 'eur' && priceEur) return `${(priceEur / 100).toFixed(0)} €`
  if (pricePln) return `${(pricePln / 100).toFixed(0)} zł`
  return 'obecnej cenie'
}

export interface RenewalEmailParams {
  ownerEmail: string
  apartmentName: string
  slug: string
  expiresAt: Date
  renewalPricePln: number | null
  renewalPriceEur: number | null
  renewalCurrency: string | null
  daysBefore: number  // 90, 30, 14, 7, 1, -14 (grace period end notification)
}

export async function sendRenewalEmail(params: RenewalEmailParams): Promise<void> {
  const {
    ownerEmail, apartmentName, slug, expiresAt,
    renewalPricePln, renewalPriceEur, renewalCurrency, daysBefore,
  } = params

  const renewUrl = `${SITE_URL}/sites/${slug}/admin/subskrypcja`
  const expiryStr = formatDate(expiresAt)
  const priceStr = formatPrice(renewalPricePln, renewalPriceEur, renewalCurrency)
  const apt = `<strong>${apartmentName}</strong>`

  let subject: string
  let html: string

  if (daysBefore === 90) {
    // ── D-90: Informacyjny ────────────────────────────────────────────────────
    subject = `Za 3 miesiące wygasa subskrypcja Nobooking dla ${apartmentName}`
    html = `
      <div style="max-width: 560px; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
        ${renderHeader('Informacja o odnowieniu')}
        <div style="background: white; padding: 2rem; font-family: -apple-system, sans-serif; color: #374151;">
          <p style="font-size: 1rem; line-height: 1.7; margin: 0 0 1rem;">
            Cześć! Chcieliśmy Cię poinformować, że subskrypcja Nobooking dla ${apt}
            wygasa <strong>${expiryStr}</strong> — czyli za około 3 miesiące.
          </p>
          <p style="font-size: 1rem; line-height: 1.7; margin: 0 0 1.5rem;">
            Możesz już teraz odnowić dostęp na kolejne 2 lata w zablokowanej dla Ciebie cenie:
            <strong>${priceStr}</strong>. Ta cena nie wzrośnie — to nasza gwarancja dla stałych klientów.
          </p>
          ${renderRenewButton(renewUrl)}
          <p style="font-size: 0.85rem; color: #9CA3AF; text-align: center; margin: 0;">
            Nie musisz nic robić teraz — przypomnimy jeszcze za miesiąc, 2 tygodnie i tydzień przed wygaśnięciem.
          </p>
        </div>
        ${renderFooter()}
      </div>
    `
  } else if (daysBefore === 30) {
    // ── D-30: Neutralny ───────────────────────────────────────────────────────
    subject = `Zostały 4 tygodnie — odnów Nobooking dla ${apartmentName}`
    html = `
      <div style="max-width: 560px; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
        ${renderHeader('Miesięczne przypomnienie o odnowieniu')}
        <div style="background: white; padding: 2rem; font-family: -apple-system, sans-serif; color: #374151;">
          <p style="font-size: 1rem; line-height: 1.7; margin: 0 0 1rem;">
            Subskrypcja Nobooking dla ${apt} wygasa <strong>${expiryStr}</strong>.
            Zostały <strong>4 tygodnie</strong>.
          </p>
          <div style="background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 10px; padding: 1.25rem 1.5rem; margin-bottom: 1.5rem;">
            <p style="margin: 0; font-size: 0.95rem; color: #065F46; font-weight: 600;">
              🔒 Twoja zablokowana cena: ${priceStr} / 2 lata
            </p>
            <p style="margin: 0.375rem 0 0; font-size: 0.85rem; color: '#6B7280';">
              Odnów teraz i zachowaj tę cenę niezależnie od przyszłych zmian cennika.
            </p>
          </div>
          ${renderRenewButton(renewUrl)}
        </div>
        ${renderFooter()}
      </div>
    `
  } else if (daysBefore === 14) {
    // ── D-14: Pilny ───────────────────────────────────────────────────────────
    subject = `⚡ 2 tygodnie do wygaśnięcia Nobooking — ${apartmentName}`
    html = `
      <div style="max-width: 560px; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
        ${renderHeader('Ważne: 2 tygodnie do wygaśnięcia')}
        <div style="background: white; padding: 2rem; font-family: -apple-system, sans-serif; color: #374151;">
          <p style="font-size: 1.05rem; line-height: 1.7; margin: 0 0 1rem; font-weight: 600; color: #111827;">
            Subskrypcja dla ${apt} wygasa za <strong>14 dni</strong> — ${expiryStr}.
          </p>
          <p style="font-size: 1rem; line-height: 1.7; margin: 0 0 1rem;">
            Po wygaśnięciu Twoja strona rezerwacyjna przestanie być dostępna dla gości.
            Masz jeszcze 2 tygodnie na odnowienie bez przerwy w działaniu.
          </p>
          <p style="font-size: 1rem; line-height: 1.7; margin: 0 0 1.5rem;">
            Cena odnowienia: <strong>${priceStr}</strong> na 2 lata.
          </p>
          ${renderRenewButton(renewUrl, 'Odnów teraz — ${priceStr} →')}
        </div>
        ${renderFooter()}
      </div>
    `
  } else if (daysBefore === 7) {
    // ── D-7: Bardzo pilny ────────────────────────────────────────────────────
    subject = `⚠️ Tydzień do wygaśnięcia — ${apartmentName}`
    html = `
      <div style="max-width: 560px; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
        ${renderHeader('Tylko 7 dni do wygaśnięcia!')}
        <div style="background: white; padding: 2rem; font-family: -apple-system, sans-serif; color: #374151;">
          <div style="background: #FEF3C7; border: 1px solid #FCD34D; border-radius: 10px; padding: 1rem 1.25rem; margin-bottom: 1.5rem; text-align: center;">
            <p style="margin: 0; font-size: 1.1rem; font-weight: 800; color: #92400E;">
              ⚠️ Wygaśnięcie: ${expiryStr}
            </p>
          </div>
          <p style="font-size: 1rem; line-height: 1.7; margin: 0 0 1rem;">
            Subskrypcja Nobooking dla ${apt} wygasa za <strong>7 dni</strong>.
            Po tym terminie strona zostanie wyłączona — goście nie będą mogli składać rezerwacji.
          </p>
          <p style="font-size: 1rem; line-height: 1.7; margin: 0 0 1.5rem;">
            Odnów teraz w Twojej zablokowanej cenie <strong>${priceStr}</strong>.
          </p>
          ${renderRenewButton(renewUrl, 'Odnów teraz — nie trać rezerwacji →')}
        </div>
        ${renderFooter()}
      </div>
    `
  } else if (daysBefore === 1) {
    // ── D-1: Krytyczny ────────────────────────────────────────────────────────
    subject = `🚨 Jutro wygasa dostęp do Nobooking — ${apartmentName}`
    html = `
      <div style="max-width: 560px; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
        ${renderHeader('Ostatnie ostrzeżenie', true)}
        <div style="background: white; padding: 2rem; font-family: -apple-system, sans-serif; color: #374151;">
          <p style="font-size: 1.1rem; line-height: 1.7; margin: 0 0 1rem; font-weight: 700; color: #DC2626; text-align: center;">
            Jutro, ${expiryStr}, wygasa Twoja subskrypcja.
          </p>
          <p style="font-size: 1rem; line-height: 1.7; margin: 0 0 1rem;">
            Strona apartamentu ${apt} zostanie wyłączona jutro o północy.
            Masz jeszcze dziś szansę na odnowienie bez przerwy w działaniu.
          </p>
          <p style="font-size: 1rem; line-height: 1.7; margin: 0 0 1.5rem;">
            Cena: <strong>${priceStr}</strong> — zablokowana specjalnie dla Ciebie.
          </p>
          ${renderRenewButton(renewUrl, 'Odnów teraz — ostatnia szansa →')}
          <p style="font-size: 0.8rem; color: #9CA3AF; text-align: center; margin: 1rem 0 0;">
            Po wygaśnięciu masz jeszcze 14 dni okresu próbnego na odnowienie, zanim strona zostanie całkowicie usunięta.
          </p>
        </div>
        ${renderFooter()}
      </div>
    `
  } else {
    // ── D+14: Grace period kończy się (site wyłączony) ────────────────────────
    subject = `Twoja strona Nobooking została wyłączona — ${apartmentName}`
    html = `
      <div style="max-width: 560px; margin: 0 auto; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
        ${renderHeader('Strona wyłączona', true)}
        <div style="background: white; padding: 2rem; font-family: -apple-system, sans-serif; color: #374151;">
          <p style="font-size: 1rem; line-height: 1.7; margin: 0 0 1rem;">
            Subskrypcja Nobooking dla ${apt} wygasła ${expiryStr} i minął 14-dniowy okres próbny.
            Strona jest teraz wyłączona i niedostępna dla gości.
          </p>
          <p style="font-size: 1rem; line-height: 1.7; margin: 0 0 1.5rem;">
            Możesz ją przywrócić w każdej chwili — wszystkie dane rezerwacji i konfiguracja są zachowane.
            Wystarczy opłacić odnowienie za <strong>${priceStr}</strong>.
          </p>
          ${renderRenewButton(renewUrl, 'Przywróć stronę →')}
          <p style="font-size: 0.8rem; color: #9CA3AF; text-align: center; margin: 1rem 0 0;">
            Jeśli nie planujesz odnowienia, dane zostaną usunięte po 90 dniach od wygaśnięcia.
          </p>
        </div>
        ${renderFooter()}
      </div>
    `
  }

  await sendEmail(ownerEmail, subject, html)
}
