/**
 * Synchronizacja kalendarzy z Booking.com i Airbnb przez iCal (RFC 5545).
 *
 * Czysto, bez bazy i bez sieci — pobieranie i zapis robi cron
 * `/api/cron/sync-calendars`, eksport trasa `/api/sites/[slug]/calendar.ics`.
 *
 * iCal to jedyny sposób synchronizacji, który oba portale dają każdemu
 * właścicielowi bez umowy partnerskiej. Ma swoje granice: portale pobierają
 * nasz plik co kilka godzin, więc krótkie okno na podwójną rezerwację zostaje.
 * Pełna synchronizacja na żywo wymaga API dla partnerów (channel manager).
 */

import { rozwinZakres } from '@/lib/bookingPricing'

export interface ZdarzenieIcal {
  uid: string
  /** Pierwsza zajęta noc, YYYY-MM-DD. */
  start: string
  /** Dzień wyjazdu — wolny, jak w `rozwinZakres`. */
  end: string
  opis: string
}

export interface Zakres {
  start: string
  end: string
}

/** RFC 5545 §3.1: linia zaczynająca się spacją lub tabem kontynuuje poprzednią. */
function rozwinLinie(tekst: string): string[] {
  return tekst.replace(/\r?\n[ \t]/g, '').split(/\r?\n/)
}

/** `20261110` albo `20261110T150000Z` → `2026-11-10`. Godzinę pomijamy:
 *  portale eksportują pobyty jako całe doby. */
function dataZIcal(wartosc: string): string | null {
  const m = wartosc.match(/^(\d{4})(\d{2})(\d{2})/)
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null
}

function dzienPo(data: string): string {
  const d = new Date(`${data}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

export interface WynikParsowania {
  zdarzenia: ZdarzenieIcal[]
  /** Ile bloków VEVENT było w pliku. */
  blokow: number
  /** Bloki pominięte bez wyjaśnienia — ani zdarzenie, ani STATUS:CANCELLED. */
  pominiete: number
}

/**
 * Zdarzenia z pliku iCal razem z tym, czego nie udało się przeczytać.
 *
 * Nieczytelne fragmenty pomija zamiast rzucać — jeden zepsuty wpis z portalu
 * nie może zatrzymać synchronizacji reszty. Ale je **liczy**, i to jest tu
 * najważniejsze: pominięty wpis znaczy termin sprzedany w portalu i wolny
 * u nas. Cisza w tym miejscu kończy się dwoma gośćmi pod jednymi drzwiami,
 * więc liczba pominięć musi wyjść na zewnątrz zamiast zostać w parserze.
 */
export function parseIcalZeStatystyka(tekst: string): WynikParsowania {
  const zdarzenia: ZdarzenieIcal[] = []
  let blokow = 0
  let pominiete = 0
  let biezace: Record<string, string> | null = null

  for (const linia of rozwinLinie(tekst)) {
    if (linia === 'BEGIN:VEVENT') { biezace = {}; blokow++; continue }
    if (linia === 'END:VEVENT') {
      if (biezace) {
        const start = dataZIcal(biezace.DTSTART ?? '')
        const koniec = dataZIcal(biezace.DTEND ?? '')
        // Anulowana rezerwacja jest pomijana celowo — nie wolno jej liczyć
        // jako wpisu, którego nie zrozumieliśmy.
        const anulowane = biezace.STATUS === 'CANCELLED'
        if (start && !anulowane) {
          zdarzenia.push({
            uid: biezace.UID ?? '',
            start,
            end: koniec && koniec > start ? koniec : dzienPo(start),
            opis: biezace.SUMMARY ?? '',
          })
        } else if (!anulowane) {
          pominiete++
        }
      }
      biezace = null
      continue
    }
    if (!biezace) continue
    const dwukropek = linia.indexOf(':')
    if (dwukropek < 0) continue
    // `DTSTART;VALUE=DATE` → `DTSTART`: parametry nie są nam potrzebne.
    const nazwa = linia.slice(0, dwukropek).split(';')[0].toUpperCase()
    biezace[nazwa] = linia.slice(dwukropek + 1).trim()
  }

  return { zdarzenia, blokow, pominiete }
}

/** Same zdarzenia — gdy statystyka pominięć nie jest potrzebna. */
export function parseIcal(tekst: string): ZdarzenieIcal[] {
  return parseIcalZeStatystyka(tekst).zdarzenia
}

/** Zajęte dni w oknie [od, do), posortowane, bez powtórzeń. */
export function dniZajete(zdarzenia: ZdarzenieIcal[], od: string, do_: string): string[] {
  const dni = new Set<string>()
  for (const z of zdarzenia) {
    // Przycięcie przed rozwinięciem — zdarzenie „do 2099 roku” nie może
    // zbudować dziesiątek tysięcy wpisów.
    const start = z.start > od ? z.start : od
    const koniec = z.end < do_ ? z.end : do_
    if (start >= koniec) continue
    for (const d of rozwinZakres(start, koniec)) dni.add(d)
  }
  return [...dni].sort()
}

/** Kolejne zajęte dni → pobyty. Koniec to dzień po ostatniej nocy. */
export function zakresyZDni(dni: string[]): Zakres[] {
  const posortowane = [...new Set(dni)].sort()
  const wynik: Zakres[] = []
  for (const d of posortowane) {
    const ostatni = wynik[wynik.length - 1]
    if (ostatni && ostatni.end === d) ostatni.end = dzienPo(d)
    else wynik.push({ start: d, end: dzienPo(d) })
  }
  return wynik
}

const bezMyslnikow = (d: string) => d.replace(/-/g, '')

/**
 * Plik iCal do pobrania przez Booking i Airbnb.
 *
 * Opis zawsze „Not available”: plik jest dostępny pod publicznym adresem,
 * więc nie może zawierać imion ani e-maili gości. UID wynika z dat pobytu,
 * żeby kolejne pobrania nie tworzyły po stronie portalu nowych blokad.
 */
export function zbudujIcal(opcje: { nazwa: string; zakresy: Zakres[]; domena: string; teraz: Date }): string {
  const stempel = opcje.teraz.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
  const nazwa = opcje.nazwa.replace(/[\r\n,;\\]/g, ' ')
  const linie = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NoBooking//Kalendarz//PL',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${nazwa}`,
  ]
  for (const z of opcje.zakresy) {
    linie.push(
      'BEGIN:VEVENT',
      `UID:${bezMyslnikow(z.start)}-${bezMyslnikow(z.end)}@${opcje.domena}`,
      `DTSTAMP:${stempel}`,
      `DTSTART;VALUE=DATE:${bezMyslnikow(z.start)}`,
      `DTEND;VALUE=DATE:${bezMyslnikow(z.end)}`,
      'SUMMARY:Not available',
      'END:VEVENT',
    )
  }
  linie.push('END:VCALENDAR')
  return linie.join('\r\n') + '\r\n'
}

export type BladAdresu = 'invalid_url' | 'not_https' | 'private_host'

/**
 * Czy serwer może pobrać ten adres.
 *
 * Adres podaje właściciel, a pobiera go nasz serwer — bez tej kontroli dałoby
 * się nim zajrzeć do sieci wewnętrznej Vercela (SSRF). Odrzucamy gołe IP
 * i nazwy bez kropki; portale zawsze dają zwykłą domenę z https.
 */
export function sprawdzAdresKalendarza(adres: string): BladAdresu | null {
  let url: URL
  try { url = new URL(adres) } catch { return 'invalid_url' }
  if (url.protocol !== 'https:') return 'not_https'
  const host = url.hostname.toLowerCase()
  if (
    !host.includes('.') ||
    host.startsWith('[') ||
    /^\d{1,3}(\.\d{1,3}){3}$/.test(host) ||
    /(^|\.)(localhost|local|internal)$/.test(host)
  ) return 'private_host'
  return null
}

/** Największy plik, jaki przyjmujemy. Kalendarz jednego apartamentu na rok
 *  to kilkadziesiąt kilobajtów; więcej znaczy, że pod linkiem jest coś innego. */
export const MAKS_ROZMIAR_ICAL = 2 * 1024 * 1024

const MAKS_PRZEKIEROWAN = 3
const LIMIT_CZASU_MS = 10_000

export type WynikPobrania =
  | { ok: true; zdarzenia: ZdarzenieIcal[]; pominiete: number }
  | { ok: false; blad: string }

type Pobieracz = (url: string, init: RequestInit) => Promise<Response>

/**
 * Pobiera i czyta kalendarz z portalu.
 *
 * Przekierowania obsługujemy ręcznie, żeby każdy kolejny adres przeszedł
 * `sprawdzAdresKalendarza` — inaczej dozwolona domena mogłaby odesłać serwer
 * do sieci wewnętrznej.
 *
 * Wszystko, co nie jest kalendarzem, jest błędem. Wywołujący zostawia wtedy
 * poprzednie zajęte dni: lepiej trzymać nieaktualną blokadę niż odblokować
 * termin, który na Bookingu jest sprzedany.
 */
export async function pobierzKalendarz(adres: string, pobierz: Pobieracz = fetch): Promise<WynikPobrania> {
  let url = adres
  for (let krok = 0; krok <= MAKS_PRZEKIEROWAN; krok++) {
    const bladAdresu = sprawdzAdresKalendarza(url)
    if (bladAdresu) return { ok: false, blad: bladAdresu }

    let odp: Response
    try {
      odp = await pobierz(url, {
        redirect: 'manual',
        signal: AbortSignal.timeout(LIMIT_CZASU_MS),
        headers: { 'User-Agent': 'NoBooking-Calendar-Sync/1.0', Accept: 'text/calendar, */*' },
      })
    } catch {
      return { ok: false, blad: 'network' }
    }

    if (odp.status >= 300 && odp.status < 400) {
      const dalej = odp.headers.get('location')
      if (!dalej) return { ok: false, blad: `http_${odp.status}` }
      url = new URL(dalej, url).toString()
      continue
    }
    if (!odp.ok) return { ok: false, blad: `http_${odp.status}` }

    const deklarowany = Number(odp.headers.get('content-length') ?? 0)
    if (deklarowany > MAKS_ROZMIAR_ICAL) return { ok: false, blad: 'too_large' }
    let tekst: string
    try { tekst = await odp.text() } catch { return { ok: false, blad: 'network' } }
    if (tekst.length > MAKS_ROZMIAR_ICAL) return { ok: false, blad: 'too_large' }

    if (!/^﻿?\s*BEGIN:VCALENDAR/i.test(tekst)) return { ok: false, blad: 'not_ical' }

    // Plik, którego nie umiemy sparsować, nie może wyglądać jak kalendarz
    // pusty. Bez tego rozróżnienia zmiana dialektu po stronie portalu
    // zostałaby odczytana jako „zwolniono wszystkie terminy".
    //
    // Sygnałem jest pominięcie **niewyjaśnione**, a nie samo zero zdarzeń:
    // kalendarz złożony z anulowanych rezerwacji jest pusty w pełni legalnie
    // i nie wolno go uznać za zepsuty.
    const wynik = parseIcalZeStatystyka(tekst)
    if (wynik.zdarzenia.length === 0 && wynik.pominiete > 0) {
      return { ok: false, blad: 'parse_failed' }
    }
    return { ok: true, zdarzenia: wynik.zdarzenia, pominiete: wynik.pominiete }
  }
  return { ok: false, blad: 'too_many_redirects' }
}
