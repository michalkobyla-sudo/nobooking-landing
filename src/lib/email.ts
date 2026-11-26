import type { Order } from './types'
import { opisZrodla } from '@/lib/attribution'
import { PRICE_LABELS } from './prices'
import { htmlPotwierdzenia } from './potwierdzenieUmowy'
import { regulaminMarkdown } from './regulaminTresc'
import { adresSerwisu, domenaGlowna } from '@/lib/adresSerwisu'
import { akapit, ciemnaKarta, cytat, dane, grupa, link, podpisMichal, przycisk, szkielet } from './mailUi'

const FROM_EMAIL = 'noreply@nobooking.eu'
const FROM_NAME = 'Nobooking'
const ADMIN_EMAIL = () => (process.env.ADMIN_EMAIL || 'michal.kobyla@gmail.com').trim()
const SITE_URL = adresSerwisu()
const ROOT_DOMAIN = domenaGlowna()

/**
 * Adres strony klienta do maili: `slug.nobooking.eu`, odkąd subdomeny działają
 * (2026-11-19). `naSubdomenie: false` — gdy provisioning nie zdołał jej dodać —
 * daje adres, który działa zawsze: `nobooking.eu/sites/<slug>`.
 */
export function adresStronyKlienta(slug: string, naSubdomenie = true): string {
  return naSubdomenie ? `https://${slug}.${ROOT_DOMAIN}` : `${SITE_URL}/sites/${slug}`
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

/**
 * Odpowiedzi na maile do klientów trafiają na kontakt@ — nadawca to noreply@,
 * a w treści piszemy „odpowiedz na tego maila”. Maile do gości mają adres
 * gospodarza, gdy go znamy (inaczej odpowiedź gościa trafiłaby do nas).
 */
const ODPOWIEDZI_NA = 'kontakt@nobooking.eu'

async function sendEmail(to: string, subject: string, html: string, replyTo: string | null = ODPOWIEDZI_NA) {
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
      ...(replyTo ? { replyTo: { email: replyTo } } : {}),
      subject,
      htmlContent: html,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Brevo error ${res.status}: ${err}`)
  }
}

const planNazwa = (plan: 'basic' | 'pro') => (plan === 'pro' ? 'Pro' : 'Basic')

/** Email 1: Notify Michał of new order */
export async function sendNewOrderNotification(order: Order) {
  const planLabel = planNazwa(order.plan)
  const priceLabel = PRICE_LABELS[order.plan][order.currency]

  const klient: [string, string][] = [
    ['Imię i nazwisko', `${escapeHtml(order.first_name)} ${escapeHtml(order.last_name)}`],
    ['Email', link(`mailto:${escapeHtml(order.email)}`, escapeHtml(order.email))],
    ['Telefon', link(`tel:${escapeHtml(order.phone)}`, escapeHtml(order.phone))],
  ]
  if (order.invoice_company) {
    klient.push(['Firma / NIP', `${escapeHtml(order.invoice_company)}${order.invoice_nip ? ` · NIP: ${escapeHtml(order.invoice_nip)}` : ''}`])
  }
  if (order.invoice_address) klient.push(['Adres', escapeHtml(order.invoice_address)])

  const apartament: [string, string][] = [
    ['Nazwa', escapeHtml(order.apartment_name)],
    ['Lokalizacja', escapeHtml(order.apartment_location)],
  ]
  if (order.notes) apartament.push(['Notatki', escapeHtml(order.notes)])

  await sendEmail(
    ADMIN_EMAIL(),
    `Nowe zamówienie — ${order.first_name} ${order.last_name} (${planLabel})`,
    szkielet({
      tytul: `Nowe zamówienie · ${planLabel}`,
      ikonaTytulu: 'zamowienie',
      podglad: `${planLabel} · ${priceLabel} · ${escapeHtml(order.apartment_name)}`,
      tresc: `
        ${akapit(`<strong>${priceLabel}</strong> · ${new Date(order.created_at).toLocaleString('pl-PL')}`)}
        ${dane(klient, 'Klient')}
        ${akapit(escapeHtml(opisZrodla(order)), { maly: true, wyciszony: true })}
        ${dane(apartament, 'Apartament')}
        ${przycisk(`${SITE_URL}/admin/zamowienia/${order.id}`, 'Zobacz w panelu')}
      `,
    }),
    null,
  )
}

/** Email 2: Send onboarding form link to client */
/**
 * Mail po płatności: link do formularza onboardingowego i potwierdzenie umowy
 * z pouczeniem o odstąpieniu i pełnym regulaminem (art. 21 upk).
 *
 * `zawarcie` — chwila zawarcia umowy, od której liczy się 14 dni na
 * odstąpienie. Webhook podaje chwilę płatności; ponowna wysyłka z panelu nie
 * zna jej dokładnie i podaje datę zamówienia z zapasem na korzyść klienta.
 */
export async function sendOnboardingEmail(order: Order, zawarcie: Date, wczesnyStart: boolean | null) {
  const onboardingUrl = `${SITE_URL}/onboarding/${order.onboarding_token}`

  await sendEmail(
    order.email,
    `Potwierdzenie zamówienia — wypełnij formularz swojej strony`,
    szkielet({
      tytul: 'Jeden krok do Twojej strony',
      ikonaTytulu: 'formularz',
      podglad: 'Płatność potwierdzona. Wypełnij formularz, a zbudujemy Twoją stronę.',
      tresc: `
        ${akapit(`Cześć <strong>${escapeHtml(order.first_name)}</strong>! Dziękujemy za zakup — płatność jest potwierdzona.`)}
        ${akapit('Do zbudowania strony potrzebujemy opisu, zdjęć, cennika i zasad pobytu. Formularz zajmie kilka minut.')}
        ${grupa([
          { ikona: 'dom', tytul: escapeHtml(order.apartment_name), opis: `Plan ${planNazwa(order.plan)} · 2 lata` },
          { ikona: 'zegar', tytul: 'Strona gotowa zwykle w 24 godziny', opis: 'Liczymy od wysłania formularza. Gdy będzie gotowa, dostaniesz maila z adresem i panelem.' },
        ])}
        ${przycisk(onboardingUrl, 'Wypełnij formularz')}
        ${akapit(`Jeśli przycisk nie działa, skopiuj ten link:<br>${link(onboardingUrl)}`, { maly: true, wyciszony: true })}
        ${podpisMichal()}
        <div style="margin-top:28px;">
        ${htmlPotwierdzenia({
          plan: order.plan,
          currency: order.currency,
          numer: order.id,
          zawarcie,
          regulaminMd: regulaminMarkdown(),
          wczesnyStart,
        })}
        </div>
      `,
    }),
  )
}

/** Email 3b: Notify client of status change */
export async function sendStatusUpdateEmail(order: Order, status: string) {
  const messages: Record<string, { subject: string; ikona: 'koperta' | 'zegar' | 'dom'; title: string; body: string }> = {
    contacted: {
      subject: `Nobooking — jesteśmy w kontakcie`,
      ikona: 'koperta',
      title: 'Jesteśmy w kontakcie',
      body: 'Otrzymaliśmy Twoje zamówienie i wkrótce się z Tobą skontaktujemy, aby omówić szczegóły realizacji.',
    },
    building: {
      subject: `Nobooking — budujemy Twoją stronę`,
      ikona: 'zegar',
      title: 'Budujemy Twoją stronę',
      body: 'Zaczęliśmy pracę nad stroną Twojego apartamentu. Damy znać, gdy będzie gotowa.',
    },
    completed: {
      subject: `Nobooking — Twoja strona jest gotowa`,
      ikona: 'dom',
      title: 'Twoja strona jest gotowa',
      body: 'Strona Twojego apartamentu jest gotowa. Dostępy do panelu i dalsze kroki przyszły w osobnym mailu.',
    },
  }

  const msg = messages[status]
  if (!msg) return // nie wysyłamy dla innych statusów

  await sendEmail(
    order.email,
    msg.subject,
    szkielet({
      tytul: msg.title,
      ikonaTytulu: msg.ikona,
      tresc: `
        ${akapit(`Cześć <strong>${escapeHtml(order.first_name)}</strong>!`)}
        ${akapit(msg.body)}
        ${grupa([{ ikona: 'dom', tytul: escapeHtml(order.apartment_name), opis: `Plan ${planNazwa(order.plan)}` }])}
        ${podpisMichal()}
      `,
    }),
  )
}

/** Email 4: Notify client that their site preview is ready (with revision link) */
export async function sendSiteReadyEmail(
  order: Order,
  slug: string,
  revisionsDone = 0,
  revisionsLeft = 4,
) {
  const siteUrl = adresStronyKlienta(slug)
  const revisionUrl = `${SITE_URL}/poprawki/${order.revision_token}`
  const isFirstVersion = revisionsDone === 0
  const roundLabel = revisionsDone + 1
  const rund = revisionsLeft === 1 ? 'runda' : revisionsLeft < 5 ? 'rundy' : 'rund'

  const subject = isFirstVersion
    ? `Nobooking — Twoja strona jest gotowa do podglądu`
    : `Nobooking — poprawki wdrożone, wersja ${roundLabel} gotowa`

  const intro = isFirstVersion
    ? `Przygotowaliśmy pierwszą wersję strony Twojego apartamentu. Obejrzyj ją i daj znać, co dopracować.`
    : `Wdrożyliśmy Twoje poprawki. Sprawdź nową wersję strony.`

  await sendEmail(
    order.email,
    subject,
    szkielet({
      tytul: isFirstVersion ? 'Twoja strona jest gotowa' : `Wersja ${roundLabel} gotowa`,
      ikonaTytulu: isFirstVersion ? 'dom' : 'poprawki',
      tresc: `
        ${akapit(`Cześć <strong>${escapeHtml(order.first_name)}</strong>!`)}
        ${akapit(intro)}
        ${grupa([{ ikona: 'dom', tytul: escapeHtml(order.apartment_name), opis: link(siteUrl) }])}
        ${przycisk(siteUrl, 'Zobacz swoją stronę')}
        ${revisionsLeft > 0
          ? grupa([{
              ikona: 'poprawki',
              tytul: `Masz uwagi? Zostały ${revisionsLeft} ${rund} poprawek`,
              opis: 'Napisz, co zmienić: tekst, kolory, ceny, układ.',
              tresc: przycisk(revisionUrl, 'Wyślij poprawki', 'ciemny'),
            }])
          : akapit('To była ostatnia runda poprawek. Jeśli potrzebujesz dalszych zmian, napisz na kontakt@nobooking.eu.', { maly: true })}
        ${podpisMichal()}
      `,
    }),
  )
}

/** Email 5: Final revision complete — no more rounds */
export async function sendRevisionCompleteEmail(order: Order, slug: string) {
  const siteUrl = adresStronyKlienta(slug)

  await sendEmail(
    order.email,
    `Nobooking — wszystkie poprawki wdrożone`,
    szkielet({
      tytul: 'Wszystkie poprawki wdrożone',
      ikonaTytulu: 'dom',
      tresc: `
        ${akapit(`Cześć <strong>${escapeHtml(order.first_name)}</strong>!`)}
        ${akapit('Wdrożyliśmy wszystkie Twoje poprawki. Strona apartamentu jest gotowa.')}
        ${grupa([{ ikona: 'dom', tytul: escapeHtml(order.apartment_name), opis: link(siteUrl) }])}
        ${przycisk(siteUrl, 'Otwórz swoją stronę')}
        ${akapit('Zdjęcia, ceny i kalendarz zmieniasz sam w panelu. Gdyby trzeba było czegoś więcej, odpowiedz na tego maila.', { maly: true })}
        ${podpisMichal()}
      `,
    }),
  )
}

/**
 * Mail „strona gotowa” — jeden, nie dwa.
 *
 * Do 2026-11-20 provisioning wysyłał w tej samej minucie dwa maile: ten
 * („gotowa i zaczyna przyjmować rezerwacje”) i `sendSiteReadyEmail` („wstępny
 * podgląd, który dopracujemy razem”). Zakup testowy pokazał, że klient nie wie,
 * któremu wierzyć. Teraz jeden mail: adres strony, dostęp do panelu, płatności
 * jako krok obowiązkowy (bez nich strona rezerwacji nie przyjmie) i poprawki.
 */
export async function sendOwnerWelcomeEmail(params: {
  email: string
  first_name: string
  apartment_name: string
  slug: string
  temp_password: string
  stripe_onboard_url: string
  plan: 'basic' | 'pro'
  /** Link do formularza poprawek (`orders.revision_token`); bez niego sekcja znika. */
  revision_url?: string | null
  /** Czy provisioning dodał subdomenę — inaczej adres `nobooking.eu/sites/<slug>`. */
  na_subdomenie?: boolean
}) {
  const { email, first_name, apartment_name, slug, temp_password, stripe_onboard_url, plan } = params
  const previewUrl = adresStronyKlienta(slug, params.na_subdomenie ?? true)
  // Panel zostaje pod adresem głównym: logowanie właściciela sprawdzone tam na żywo.
  const adminUrl = `${SITE_URL}/sites/${slug}/admin`

  const kroki = [
    {
      ikona: 'platnosci' as const,
      tytul: 'Krok obowiązkowy: podłącz płatności Stripe',
      opis: 'Bez tego goście nie zapłacą za rezerwację. Zajmuje kilka minut — pieniądze trafiają prosto na Twoje konto.',
      tresc: przycisk(stripe_onboard_url, 'Podłącz płatności', 'ciemny'),
    },
    ...(params.revision_url ? [{
      ikona: 'poprawki' as const,
      tytul: 'Chcesz coś zmienić? Masz 4 rundy poprawek',
      opis: 'Teksty, opis, okolica, kolory — napisz, co poprawić. Zdjęcia, ceny i kalendarz zmieniasz sam w panelu.',
      tresc: przycisk(params.revision_url, 'Wyślij poprawki', 'szary'),
    }] : []),
    ...(plan === 'pro' ? [{
      ikona: 'pro' as const,
      tytul: 'Plan Pro jest aktywny',
      opis: 'SMS o rezerwacjach, online check-in i kody rabatowe czekają w panelu.',
    }] : []),
  ]

  await sendEmail(
    email,
    `Twoja strona jest gotowa — adres, panel i następne kroki`,
    szkielet({
      tytul: 'Twoja strona jest gotowa',
      ikonaTytulu: 'dom',
      podglad: `${escapeHtml(apartment_name)} już działa. Zostało podłączenie płatności.`,
      tresc: `
        ${akapit(`Cześć <strong>${escapeHtml(first_name)}</strong>!`)}
        ${akapit(`Strona apartamentu <strong>${escapeHtml(apartment_name)}</strong> już działa. Zostały dwa kroki: podłącz płatności, żeby goście mogli rezerwować, i — jeśli chcesz coś zmienić — wyślij nam poprawki.`)}
        ${grupa([{ ikona: 'dom', tytul: 'Twoja strona', opis: link(previewUrl) }])}
        ${ciemnaKarta([
          ['Panel', `<a href="${adminUrl}" style="color:#34D399;text-decoration:none;">${adminUrl}</a>`],
          ['Email', escapeHtml(email)],
          ['Hasło tymczasowe', `<span style="font-family:'SF Mono',Menlo,Consolas,monospace;font-size:15px;font-weight:700;color:#FFCC00;letter-spacing:0.04em;">${escapeHtml(temp_password)}</span>`],
        ], 'Zmień hasło po pierwszym logowaniu w Ustawieniach panelu.')}
        ${grupa(kroki, 'Następne kroki')}
        ${przycisk(adminUrl, 'Przejdź do panelu')}
        ${podpisMichal()}
      `,
    }),
  )
}

/** Email 3: Notify Michał that onboarding form was submitted */
export async function sendOnboardingSubmittedNotification(order: Order) {
  await sendEmail(
    ADMIN_EMAIL(),
    `Formularz wypełniony — ${order.first_name} ${order.last_name}`,
    szkielet({
      tytul: 'Formularz startowy wypełniony',
      ikonaTytulu: 'formularz',
      tresc: `
        ${grupa([{
          ikona: 'gosc',
          tytul: `${escapeHtml(order.first_name)} ${escapeHtml(order.last_name)}`,
          opis: `${escapeHtml(order.apartment_name)}${order.apartment_location ? ` · ${escapeHtml(order.apartment_location)}` : ''}`,
        }])}
        ${akapit('Klient wypełnił formularz. Dane do realizacji są w panelu.')}
        ${przycisk(`${SITE_URL}/admin/zamowienia/${order.id}`, 'Zobacz formularz w panelu')}
      `,
    }),
    null,
  )
}

// ─── Darmowe demo ─────────────────────────────────────────────────────────────

/** Dane zgłoszenia potrzebne mailom — bez zależności od modułu demo. */
export interface DemoDoMaila {
  first_name: string
  email: string
  apartment_name: string
  apartment_location: string
  offer_link: string | null
  token: string
}

/** Klient: link do podglądu jego strony. Wysyłany po udanym wygenerowaniu. */
export async function sendDemoReadyEmail(d: DemoDoMaila) {
  const url = `${SITE_URL}/podglad/${d.token}`
  await sendEmail(
    d.email,
    `Demo strony ${d.apartment_name} jest gotowe`,
    szkielet({
      tytul: 'Twoje demo jest gotowe',
      ikonaTytulu: 'dom',
      podglad: `Zobacz, jak może wyglądać strona ${escapeHtml(d.apartment_name)}.`,
      tresc: `
        ${akapit(`Cześć <strong>${escapeHtml(d.first_name)}</strong>!`)}
        ${akapit(`Przygotowaliśmy demo strony apartamentu <strong>${escapeHtml(d.apartment_name)}</strong>. Teksty powstały z Twojego opisu, w czterech językach. Zdjęcia są przykładowe — po zakupie dodajesz swoje w panelu, a teksty poprawiamy w czterech rundach poprawek.`)}
        ${przycisk(url, 'Zobacz swoje demo')}
        ${grupa([
          { ikona: 'kalendarz', tytul: 'Kalendarz i ceny', opis: 'Gość wybiera daty i od razu widzi cenę pobytu.' },
          { ikona: 'platnosci', tytul: 'Płatności w cenie', opis: 'Karta, Apple Pay i Google Pay, a przy cenach w złotówkach także BLIK — przez Twoje konto Stripe.' },
        ], 'Co zobaczysz')}
        ${akapit('Masz pytania? Odpowiedz na tego maila.', { wyciszony: true })}
        ${podpisMichal()}
      `,
    }),
  )
}

/** Administrator: nowe zgłoszenie demo, czyli ciepły kontakt. */
export async function sendDemoRequestNotification(d: DemoDoMaila, zrodlo: string) {
  const pary: [string, string][] = [
    ['Imię', escapeHtml(d.first_name)],
    ['Email', link(`mailto:${escapeHtml(d.email)}`, escapeHtml(d.email))],
    ['Apartament', escapeHtml(d.apartment_name)],
    ['Lokalizacja', escapeHtml(d.apartment_location)],
  ]
  if (d.offer_link) pary.push(['Oferta', link(escapeHtml(d.offer_link))])
  await sendEmail(
    ADMIN_EMAIL(),
    `Nowe demo — ${d.apartment_name} (${d.first_name})`,
    szkielet({
      tytul: 'Ktoś zamówił darmowe demo',
      ikonaTytulu: 'lupa',
      podglad: `${escapeHtml(d.apartment_name)} · ${escapeHtml(d.apartment_location)}`,
      tresc: `
        ${dane(pary, 'Zgłoszenie')}
        ${akapit(escapeHtml(zrodlo), { maly: true, wyciszony: true })}
        ${akapit('Strona generuje się sama; klient dostanie link mailem. Podgląd poniżej zadziała po minucie.')}
        ${przycisk(`${SITE_URL}/podglad/${d.token}`, 'Zobacz demo klienta')}
      `,
    }),
    null,
  )
}

/** Administrator: generowanie nie udało się po wszystkich próbach — trzeba ręcznie. */
export async function sendDemoFailedNotification(d: DemoDoMaila, blad: string) {
  await sendEmail(
    ADMIN_EMAIL(),
    `Demo nie powstało — ${d.apartment_name}`,
    szkielet({
      tytul: 'Demo nie wygenerowało się',
      ikonaTytulu: 'anulowanie',
      tresc: `
        ${akapit(`Zgłoszenie <strong>${escapeHtml(d.apartment_name)}</strong> (${escapeHtml(d.email)}) przeszło wszystkie próby bez skutku. Klient widzi komunikat, że odezwiemy się mailem.`)}
        ${cytat(escapeHtml(blad.slice(0, 400)))}
        ${przycisk(`mailto:${escapeHtml(d.email)}`, 'Napisz do klienta', 'szary')}
      `,
    }),
    null,
  )
}

// ─── Booking emails ───────────────────────────────────────────────────────────

function fmtDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })
}

export interface BookingEmailData {
  id: string
  guest_name: string
  guest_email: string
  site_id: string
  check_in: string    // YYYY-MM-DD
  check_out: string   // YYYY-MM-DD
  total_price: number
  currency: string
  discount_code: string | null
}

const liczbaNocy = (b: BookingEmailData) =>
  Math.round((new Date(b.check_out).getTime() - new Date(b.check_in).getTime()) / (1000 * 60 * 60 * 24))

/**
 * E-mail: rezerwacja anulowana.
 *
 * Obiecany w siatce funkcji („Potwierdzenie, anulowanie, przypomnienie przed
 * przyjazdem"), a nie istniał — gość dowiadywał się o anulowaniu dopiero
 * wtedy, gdy sam zajrzał do portalu.
 *
 * `powod` jest opcjonalny: właściciel nie musi się tłumaczyć, ale jeśli poda
 * powód, gość nie zostaje z samym faktem.
 */
export async function sendBookingCancelled(booking: BookingEmailData, powod?: string | null) {
  await sendEmail(
    booking.guest_email,
    `Rezerwacja anulowana — ${fmtDate(booking.check_in)} → ${fmtDate(booking.check_out)}`,
    szkielet({
      tytul: 'Rezerwacja anulowana',
      ikonaTytulu: 'anulowanie',
      tresc: `
        ${akapit(`Cześć <strong>${escapeHtml(booking.guest_name)}</strong>,`)}
        ${akapit(`Twoja rezerwacja w terminie <strong>${fmtDate(booking.check_in)} → ${fmtDate(booking.check_out)}</strong> została anulowana.`)}
        ${powod ? cytat(escapeHtml(powod)) : ''}
        ${akapit('Jeśli płatność została już pobrana, zwrot trafi tą samą metodą płatności — zwykle w ciągu kilku dni roboczych. W razie pytań skontaktuj się z gospodarzem; dane kontaktowe są na stronie apartamentu.', { maly: true, wyciszony: true })}
      `,
    }),
    null,
  )
}

/**
 * E-mail: przypomnienie przed przyjazdem.
 *
 * Wysyłany przez cron `guest-reminders` na siedem dni przed przyjazdem.
 * Dla stron w planie Pro zawiera link do check-inu online — to jedyne miejsce,
 * z którego gość dowiaduje się, że taki formularz w ogóle istnieje.
 */
export async function sendPreArrivalReminder(params: {
  booking: BookingEmailData
  slug: string
  nazwaApartamentu: string
  linkCheckin: string | null
}) {
  const { booking, slug, nazwaApartamentu, linkCheckin } = params
  const linkRezerwacji = `${escapeHtml(adresStronyKlienta(slug))}/guest/${escapeHtml(booking.id)}`

  await sendEmail(
    booking.guest_email,
    `Do zobaczenia za tydzień — ${nazwaApartamentu}`,
    szkielet({
      tytul: 'Przyjazd za tydzień',
      ikonaTytulu: 'kalendarz',
      tresc: `
        ${akapit(`Cześć <strong>${escapeHtml(booking.guest_name)}</strong>!`)}
        ${akapit(`Za tydzień zaczyna się Twój pobyt w <strong>${escapeHtml(nazwaApartamentu)}</strong>.`)}
        ${dane([
          ['Przyjazd', fmtDate(booking.check_in)],
          ['Wyjazd', fmtDate(booking.check_out)],
        ])}
        ${linkCheckin ? grupa([{
          ikona: 'checkin',
          tytul: 'Check-in online',
          opis: 'Zajmie minutę, a skróci formalności na miejscu.',
          tresc: przycisk(linkCheckin, 'Wypełnij check-in'),
        }]) : ''}
        ${przycisk(linkRezerwacji, 'Szczegóły rezerwacji', linkCheckin ? 'szary' : 'glowny')}
      `,
    }),
    null,
  )
}

/**
 * E-mail: prosba o opinie po pobycie.
 *
 * Idzie do **goscia** o apartamencie — w odroznieniu od crona
 * `review-requests`, ktory pyta wlascicieli apartamentow o opinie o samym
 * Nobookingu. To dwie rozne rzeczy o mylaco podobnych nazwach.
 */
export async function sendReviewRequest(params: {
  booking: BookingEmailData
  slug: string
  nazwaApartamentu: string
}) {
  const { booking, slug, nazwaApartamentu } = params
  const adres = `${adresStronyKlienta(slug)}/guest/${booking.id}/opinia`

  await sendEmail(
    booking.guest_email,
    `Jak było w ${nazwaApartamentu}?`,
    szkielet({
      tytul: 'Jak minął pobyt?',
      ikonaTytulu: 'opinia',
      tresc: `
        ${akapit(`Cześć <strong>${escapeHtml(booking.guest_name)}</strong>!`)}
        ${akapit(`Mamy nadzieję, że pobyt w <strong>${escapeHtml(nazwaApartamentu)}</strong> się udał. Jeśli znajdziesz chwilę, napisz kilka zdań — pomoże to kolejnym gościom przy wyborze.`)}
        ${przycisk(adres, 'Napisz opinię')}
        ${akapit('Zajmie minutę. Opinia pojawi się na stronie po zatwierdzeniu przez gospodarza.', { maly: true, wyciszony: true })}
      `,
    }),
    null,
  )
}

/** Email: Guest booking confirmation */
export async function sendBookingConfirmation(booking: BookingEmailData) {
  const wiersze: [string, string][] = [
    ['Przyjazd', fmtDate(booking.check_in)],
    ['Wyjazd', fmtDate(booking.check_out)],
    ['Liczba nocy', String(liczbaNocy(booking))],
    ['Zapłacono', `${booking.total_price} ${booking.currency}`],
  ]
  if (booking.discount_code) wiersze.push(['Kod rabatowy', escapeHtml(booking.discount_code)])

  await sendEmail(
    booking.guest_email,
    `Rezerwacja potwierdzona — ${fmtDate(booking.check_in)} → ${fmtDate(booking.check_out)}`,
    szkielet({
      tytul: 'Rezerwacja potwierdzona',
      ikonaTytulu: 'kalendarz',
      podglad: `${fmtDate(booking.check_in)} → ${fmtDate(booking.check_out)} · płatność przyjęta`,
      tresc: `
        ${akapit(`Cześć <strong>${escapeHtml(booking.guest_name)}</strong>!`)}
        ${akapit('Płatność przyjęta, rezerwacja potwierdzona. Do zobaczenia!')}
        ${dane(wiersze)}
        ${akapit('Przed przyjazdem przyślemy link do szczegółów rezerwacji: adres z mapą i kontakt do gospodarza.', { maly: true, wyciszony: true })}
      `,
    }),
    null,
  )
}

/** Email: Owner notification about new booking */
export async function sendOwnerBookingNotification(booking: BookingEmailData) {
  // Get owner email from sites table via REST (avoids circular dependency with supabase client)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const res = await fetch(`${supabaseUrl}/rest/v1/sites?id=eq.${booking.site_id}&select=owner_email`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
  })
  const sites = await res.json() as Array<{ owner_email: string }>
  const ownerEmail = sites[0]?.owner_email
  if (!ownerEmail) return

  await sendEmail(
    ownerEmail,
    `Nowa rezerwacja — ${booking.guest_name} · ${fmtDate(booking.check_in)} → ${fmtDate(booking.check_out)}`,
    szkielet({
      tytul: 'Nowa rezerwacja',
      ikonaTytulu: 'kalendarz',
      podglad: `${escapeHtml(booking.guest_name)} · ${booking.total_price} ${booking.currency}`,
      tresc: `
        ${akapit('Masz nową, opłaconą rezerwację.')}
        ${dane([
          ['Gość', escapeHtml(booking.guest_name)],
          ['Email', link(`mailto:${escapeHtml(booking.guest_email)}`, escapeHtml(booking.guest_email))],
          ['Przyjazd', fmtDate(booking.check_in)],
          ['Wyjazd', fmtDate(booking.check_out)],
          ['Noce', String(liczbaNocy(booking))],
          ['Kwota', `<span style="color:#059669;">${booking.total_price} ${booking.currency}</span>`],
        ])}
      `,
    }),
  )
}


// ─── RAPORT STANU SYSTEMU ─────────────────────────────────────────────────────

/** Raport z crona /api/cron/health. Trafia na ADMIN_EMAIL i tylko wtedy,
 *  gdy jest o czym pisać — codzienne „wszystko OK" przestaje się czytać. */
export async function sendHealthReport(subject: string, html: string) {
  await sendEmail(ADMIN_EMAIL(), subject, html)
}
