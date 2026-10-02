import { createRequire } from 'module'

const _require = createRequire(import.meta.url)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const StripeLib = _require('stripe') as any

const API_WERSJA = '2026-04-22.dahlia'

function getStripe() {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  return new StripeLib(
    (process.env.STRIPE_SECRET_KEY ?? '').trim(),
    { apiVersion: '2026-04-22.dahlia' }
  )
}

/** Domyslny kraj wlasciciela. Onboarding go nie zbiera, a klienci sa polscy;
 *  gdyby to sie zmienilo, to jest miejsce do rozszerzenia o pole w formularzu. */
export const KRAJ_DOMYSLNY = 'pl'

/**
 * Cialo zadania zakladajacego konto polaczone. Czysta funkcja — zeby dalo sie
 * sprawdzic sam ksztalt, bez dzwonienia do Stripe'a.
 *
 * **Dlaczego nie Express.** Do 2026-10-01 zakladalismy konta `type: 'express'`.
 * Taki typ dostaje `controller.fees.payer = application_express`, czyli
 * **oplaty Stripe placi platforma** — my, nie wlasciciel. Przy realnym obrocie
 * jednego apartamentu to 370-590 zl rocznie na klienta, przy przychodzie
 * ~400 zl rocznie z pakietu Basic. Koszt rosnacy razem z sukcesem klienta,
 * przy zerowym przychodzie z tego tytulu. Sama dokumentacja Stripe'a pisze
 * o tym ustawieniu: „We don't recommend using direct charges with this legacy
 * setting".
 *
 * `fees_collector: 'stripe'` znaczy, ze Stripe sciaga oplaty wprost z konta
 * wlasciciela — zgodnie z modelem, w ktorym to on jest sprzedawca.
 *
 * `losses_collector: 'stripe'` zdejmuje z platformy odpowiedzialnosc za ujemne
 * saldo konta wlasciciela. Przy Expressie spadala ona na nas i byla opisana
 * jako nie do unikniecia — przy tej konfiguracji po prostu nie wystepuje.
 *
 * Cena: wlasciciel dostaje **pelny panel Stripe** zamiast uproszczonego
 * Expressa. Panelu nie da sie pozniej zmienic, bo `dashboard` jest niezmienny
 * — trzeba by zalozyc nowe konto.
 */
export function cialoKontaV2(email: string, nazwa?: string, kraj = KRAJ_DOMYSLNY) {
  return {
    contact_email: email,
    ...(nazwa ? { display_name: nazwa.slice(0, 200) } : {}),
    dashboard: 'full' as const,
    identity: { country: kraj, entity_type: 'individual' as const },
    defaults: {
      responsibilities: {
        fees_collector: 'stripe' as const,
        losses_collector: 'stripe' as const,
      },
    },
    configuration: { merchant: {} },
  }
}

/**
 * Zaklada konto polaczone dla wlasciciela apartamentu. Zwraca `acct_…`.
 *
 * **Accounts v2.** `POST /v1/accounts` jest od 2026 odrzucane dla nowych
 * integracji („Stripe no longer recommends Accounts v1"), co przez kilka dni
 * wygladalo jak blokada weryfikacji platformy. Przez v2 to samo zadanie
 * przechodzi — sprawdzone na koncie live 2026-10-01.
 *
 * Reszta obiegu zostaje na v1 i dziala bez zmian: `account_links` buduje link
 * onboardingu, a Checkout z naglowkiem `Stripe-Account` tworzy obciazenie
 * bezposrednie. Sprawdzone na koncie zalozonym przez v2.
 */
export async function createConnectAccount(email: string, nazwa?: string): Promise<string> {
  const klucz = (process.env.STRIPE_SECRET_KEY ?? '').trim()
  if (!klucz) throw new Error('STRIPE_SECRET_KEY nie jest ustawiony')

  const odp = await fetch('https://api.stripe.com/v2/core/accounts', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${klucz}:`).toString('base64'),
      'Content-Type': 'application/json',
      'Stripe-Version': API_WERSJA,
    },
    body: JSON.stringify(cialoKontaV2(email, nazwa)),
  })

  const dane = await odp.json() as { id?: string; error?: { code?: string; message?: string } }

  if (!odp.ok || dane.error || !dane.id) {
    const e = dane.error ?? {}
    throw new Error(`Stripe v2 accounts: ${[e.code, e.message].filter(Boolean).join(': ') || `HTTP ${odp.status}`}`)
  }

  return dane.id
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

/**
 * Czy platforma moze dzis zakladac konta polaczone.
 *
 * Powstalo, bo odpowiedz na to pytanie przychodzila dotad mailem od wsparcia
 * Stripe'a — czyli wtedy, gdy ktos akurat odpisal. Sam stan konta zmienia sie
 * niezaleznie od korespondencji, a od niego zalezy caly Etap 2.
 *
 * **Probujemy Accounts v2**, nie v1. Sprawdzone 2026-10-01 w trybie testowym:
 * `POST /v1/accounts` jest odrzucane dla nowych integracji ("Stripe no longer
 * recommends Accounts v1"), a `POST /v2/core/accounts` przechodzi. Nasz
 * `createConnectAccount` nadal uzywa v1 i dlatego wymaga migracji — proba
 * sprawdza wiec te droge, ktora ma dzialac, a nie te, ktora mamy w kodzie.
 *
 * Odczyt `GET /v1/account` tego nie rozstrzyga: blokada weryfikacji platformy
 * nie pokazuje sie w `requirements` wlasnego konta, wychodzi dopiero przy
 * probie zalozenia konta polaczonego.
 *
 * Konto probne zamykamy w `finally` (v2 nie ma kasowania, ma `/close`).
 * Gdyby zamkniecie nie przeszlo, id trafia do logu — lepszy slad w logu niz
 * sierota w panelu Connect, o ktorej nikt nie wie.
 */
export type StanConnect =
  | { mozna: true }
  | { mozna: false; powod: string }

export async function czyMoznaZakladacKonta(): Promise<StanConnect | null> {
  const klucz = (process.env.STRIPE_SECRET_KEY ?? '').trim()
  if (!klucz) return null

  const naglowki = {
    Authorization: 'Basic ' + Buffer.from(`${klucz}:`).toString('base64'),
    'Content-Type': 'application/json',
    'Stripe-Version': API_WERSJA,
  }

  let id: string | null = null

  try {
    const odp = await fetch('https://api.stripe.com/v2/core/accounts', {
      method: 'POST',
      headers: naglowki,
      // Dokladnie to cialo, ktore poleci przy zakladaniu konta klienta.
      // Proba z uproszczonym zadaniem potwierdzalaby, ze dziala cos innego
      // niz to, co nas interesuje.
      body: JSON.stringify(cialoKontaV2('probe@nobooking.eu', 'Proba agenta zdrowia')),
    })
    const dane = await odp.json() as { id?: string; error?: { code?: string; message?: string } }

    if (!odp.ok || dane.error) {
      const e = dane.error ?? {}
      const powod = [e.code, e.message].filter(Boolean).join(': ') || `HTTP ${odp.status}`
      // Sam komunikat odmowy mowi "aktywuj konto", ale nie mowi CZEGO brakuje.
      // Lista zalegolsci jest w `requirements` konta platformy — bez niej
      // zostaje klikanie po panelu na slepo.
      const braki = await zaleglosciPlatformy(klucz)
      return { mozna: false, powod: (powod + (braki ? ` | brakuje: ${braki}` : '')).slice(0, 500) }
    }

    id = dane.id ?? null
    return { mozna: true }

  } catch (err) {
    return { mozna: false, powod: (err instanceof Error ? err.message : String(err)).slice(0, 300) }

  } finally {
    if (id) {
      try {
        const z = await fetch(`https://api.stripe.com/v2/core/accounts/${id}/close`, {
          method: 'POST',
          headers: naglowki,
          body: JSON.stringify({ applied_configurations: ['merchant'] }),
        })
        if (!z.ok) throw new Error(`HTTP ${z.status}`)
      } catch (err) {
        console.error(
          `[connect-probe] nie udalo sie zamknac konta probnego ${id} — zamknij recznie:`,
          err instanceof Error ? err.message : String(err),
        )
      }
    }
  }
}

/**
 * Czego Stripe zada od konta platformy. Pusty ciag, gdy nic albo gdy odczyt
 * sie nie powiodl — to funkcja pomocnicza do komunikatu, nie zrodlo prawdy.
 */
async function zaleglosciPlatformy(klucz: string): Promise<string> {
  try {
    const r = await fetch('https://api.stripe.com/v1/account', {
      headers: { Authorization: 'Basic ' + Buffer.from(`${klucz}:`).toString('base64') },
    })
    // Klucz restrykcyjny moze nie miec prawa czytania konta platformy.
    // Cisza wygladalaby wtedy jak "nic nie brakuje", co byloby mylace.
    if (!r.ok) return `odczytu konta nie udalo sie wykonac (HTTP ${r.status})`
    const d = await r.json() as {
      requirements?: { currently_due?: string[]; past_due?: string[]; disabled_reason?: string | null }
      charges_enabled?: boolean
      details_submitted?: boolean
    }
    const req = d.requirements ?? {}
    const czesci = [
      d.details_submitted === false ? 'wniosek niezlozony' : '',
      req.disabled_reason ? `powod blokady: ${req.disabled_reason}` : '',
      (req.past_due ?? []).length ? `po terminie: ${(req.past_due ?? []).join(', ')}` : '',
      (req.currently_due ?? []).length ? `do uzupelnienia: ${(req.currently_due ?? []).join(', ')}` : '',
      d.charges_enabled === false ? 'platnosci wylaczone' : '',
    ].filter(Boolean)
    return czesci.join(' | ')
  } catch (err) {
    return `odczyt konta sie nie powiodl: ${err instanceof Error ? err.message : String(err)}`
  }
}

/**
 * Dociaga status kont polaczonych, ktore zglosily sie jako nieukonczone.
 *
 * `/api/connect/callback` sprawdza gotowosc konta **raz**, w chwili powrotu
 * wlasciciela ze Stripe. Weryfikacja u Stripe jest asynchroniczna: potrafi
 * zapalic `charges_enabled` kilka sekund albo kilka minut pozniej. Jesli
 * trafi po przekierowaniu, flaga zostaje na `false` i **nic jej nigdy nie
 * przestawia**.
 *
 * Dla klienta wyglada to tak: zrobil wszystko poprawnie, Stripe ma go za
 * gotowego, a jego strona dalej pokazuje gosciom dane kontaktowe zamiast
 * platnosci. Nie ma z tego wyjscia poza ponownym klikniecem "Polacz Stripe".
 *
 * Wylapane przy pierwszym pelnym przebiegu (Etap 2, 2026-10-02).
 *
 * Zwraca slugi stron, ktorym status zostal podniesiony.
 */
export async function odswiezStatusConnect(
  db: { from: (t: string) => any },   // eslint-disable-line @typescript-eslint/no-explicit-any
): Promise<string[]> {
  /* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-assignment */
  const { data, error } = await db
    .from('sites')
    .select('slug, stripe_account_id')
    .eq('active', true)
    .eq('stripe_onboarded', false)
    .not('stripe_account_id', 'is', null)

  if (error || !data) return []

  const podniesione: string[] = []

  for (const s of data as Array<{ slug: string; stripe_account_id: string }>) {
    try {
      if (!(await isConnectAccountReady(s.stripe_account_id))) continue
      const { error: bladZapisu } = await db
        .from('sites')
        .update({ stripe_onboarded: true })
        .eq('slug', s.slug)
      if (bladZapisu) {
        console.error(`[connect] nie udalo sie zapisac statusu dla ${s.slug}:`, bladZapisu.message)
        continue
      }
      podniesione.push(s.slug)
    } catch (err) {
      // Konto moze byc z innego trybu (testowe vs live) — wtedy klucz go nie
      // widzi. To nie powod, zeby przerwac sprawdzanie pozostalych.
      console.error(`[connect] nie udalo sie sprawdzic ${s.slug}:`, err instanceof Error ? err.message : String(err))
    }
  }

  return podniesione
  /* eslint-enable */
}
