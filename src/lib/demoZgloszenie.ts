import type { DaneDoGeneracji } from './generate-site'

/**
 * Darmowe demo na apartamencie klienta — czysta logika, bez bazy i sieci.
 *
 * Klient podaje kilka danych (bez płacenia), generator buduje z nich stronę
 * jak dla zamówienia, a klient dostaje link do podglądu `/podglad/<token>`.
 * Zakup jest dopiero potem. Przepływ: `api/demo/route.ts` → `lib/demoGeneracja.ts`.
 *
 * Każde zgłoszenie to jedno wywołanie modelu, czyli pieniądze — stąd twarde
 * limity długości tutaj i limity liczby zgłoszeń w trasie.
 */

export type StatusDemo = 'new' | 'generating' | 'ready' | 'failed'

/** Tyle prób generowania, potem zgłoszenie czeka na ręczną obsługę (mail do administratora). */
export const MAX_PROB_DEMO = 3

/** Zgłoszenia bez zakupu usuwamy po tylu dniach (polityka prywatności, pkt 9). */
export const RETENCJA_DEMO_DNI = 180

export interface ZgloszenieDemo {
  first_name: string
  email: string
  apartment_name: string
  apartment_location: string
  description: string | null
  price_per_night: number | null
  currency: 'pln' | 'eur'
  max_guests: number | null
  bedrooms: number | null
  offer_link: string | null
}

/** Wiersz tabeli `demo_requests` — tylko pola, których używa kod. */
export interface WierszDemo extends ZgloszenieDemo {
  id: string
  token: string
  status: StatusDemo
  attempts: number
  config: unknown | null
  order_id: string | null
}

export type WynikWalidacji =
  | { ok: true; dane: ZgloszenieDemo }
  | { ok: false; blad: string }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function tekst(v: unknown, maks: number): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim().replace(/\s+/g, ' ')
  return t ? t.slice(0, maks) : null
}

/** Liczba z pola formularza: pusta → null, poza zakresem → `undefined` (błąd). */
function liczba(v: unknown, min: number, maks: number): number | null | undefined {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'))
  if (!Number.isFinite(n) || n < min || n > maks) return undefined
  return Math.round(n)
}

/** Tylko http(s) — link trafia do maila administratora jako klikalny adres. */
function link(v: unknown): string | null | undefined {
  const t = tekst(v, 500)
  if (!t) return null
  try {
    const u = new URL(/^https?:\/\//i.test(t) ? t : `https://${t}`)
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : undefined
  } catch {
    return undefined
  }
}

export function walidujZgloszenie(body: Record<string, unknown>): WynikWalidacji {
  const first_name = tekst(body.first_name, 60)
  const email = tekst(body.email, 160)?.toLowerCase() ?? null
  const apartment_name = tekst(body.apartment_name, 80)
  const apartment_location = tekst(body.apartment_location, 120)

  if (!first_name) return { ok: false, blad: 'missing_first_name' }
  if (!email || !EMAIL.test(email)) return { ok: false, blad: 'invalid_email' }
  if (!apartment_name) return { ok: false, blad: 'missing_apartment_name' }
  if (!apartment_location) return { ok: false, blad: 'missing_apartment_location' }
  // Ściśle `true`, jak akceptacja regulaminu w zamówieniu.
  if (body.zgoda !== true) return { ok: false, blad: 'missing_consent' }

  const currency = body.currency === 'eur' ? 'eur' : 'pln'
  const price_per_night = liczba(body.price_per_night, 1, 100_000)
  const max_guests = liczba(body.max_guests, 1, 40)
  const bedrooms = liczba(body.bedrooms, 0, 20)
  const offer_link = link(body.offer_link)
  if (price_per_night === undefined) return { ok: false, blad: 'invalid_price' }
  if (max_guests === undefined) return { ok: false, blad: 'invalid_guests' }
  if (bedrooms === undefined) return { ok: false, blad: 'invalid_bedrooms' }
  if (offer_link === undefined) return { ok: false, blad: 'invalid_link' }

  // Opis bez zwijania nowych linii — klient pisze akapitami.
  const description = typeof body.description === 'string' && body.description.trim()
    ? body.description.trim().slice(0, 1500)
    : null

  return {
    ok: true,
    dane: {
      first_name, email, apartment_name, apartment_location, description,
      price_per_night, currency, max_guests, bedrooms, offer_link,
    },
  }
}

/**
 * Zgłoszenie w postaci, którą rozumie generator stron.
 *
 * Telefon pusty celowo: demo pokazuje tylko adres e-mail, który klient sam
 * podał — numeru nie zbieramy, a model nie ma go wymyślać.
 */
export function daneDoGeneracji(w: Pick<WierszDemo, 'id'> & ZgloszenieDemo): DaneDoGeneracji {
  return {
    id: w.id,
    apartment_name: w.apartment_name,
    apartment_location: w.apartment_location,
    email: w.email,
    phone: '',
    ob_address: null,
    ob_seasons: null,
    ob_currency: w.currency,
    ob_bedrooms: w.bedrooms,
    ob_bathrooms: null,
    ob_sqm: null,
    ob_max_guests: w.max_guests,
    ob_description: w.description,
    ob_tagline: null,
    ob_amenities: null,
    ob_rules: null,
    ob_checkin_time: null,
    ob_checkout_time: null,
    ob_contact_email: w.email,
    ob_contact_phone: null,
    ob_instagram: null,
    ob_facebook: null,
    ob_color: null,
    ob_price_per_night: w.price_per_night,
    revision_notes: null,
  }
}

/** Adres podglądu — względny, bo trafia też do linków wewnętrznych. */
export function sciezkaPodgladu(token: string): string {
  return `/podglad/${token}`
}

/** Token w adresie: 24 znaki base64url, czyli 144 bity — nie do zgadnięcia. */
export function poprawnyToken(token: string): boolean {
  return /^[A-Za-z0-9_-]{24}$/.test(token)
}
