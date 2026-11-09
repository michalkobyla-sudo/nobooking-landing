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
  /** Reguła powtarzania, jeśli wpis ją ma i rozumiemy ją w całości. */
  powtarzanie?: Powtarzanie
}

/**
 * Podzbiór RRULE (RFC 5545 §3.3.10), który rozwijamy sami.
 *
 * Portale tego nie używają — rezerwacja się nie powtarza. Ale źródło „inne"
 * to zwykle prywatny kalendarz właściciela, a tam „nie wynajmuję
 * w weekendy" jest jednym wpisem z regułą. Kalendarz Google zapisuje go jako
 * `FREQ=WEEKLY;BYDAY=SA,SU`, Apple święta jako `FREQ=YEARLY;COUNT=6`.
 *
 * Wszystko poza tym podzbiorem (BYMONTH, BYSETPOS, „ostatnia niedziela"…)
 * zostaje niezrozumiane **jawnie**: blokujemy pierwsze wystąpienie i liczymy
 * wpis jako nieodczytany, żeby panel kazał właścicielowi sprawdzić resztę.
 */
export interface Powtarzanie {
  freq: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY'
  interval: number
  count?: number
  /** Ostatni dzień, w którym wolno zacząć wystąpienie — włącznie. */
  until?: string
  /** Tylko WEEKLY: dni tygodnia, 0 = poniedziałek … 6 = niedziela. */
  dniTygodnia?: number[]
  /** EXDATE — wystąpienia wyłączone. Nadal zużywają COUNT, jak w RFC. */
  wyjatki?: string[]
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

const DNI_TYGODNIA = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU']
const ZNANE_CZESCI_REGULY = new Set(['FREQ', 'INTERVAL', 'COUNT', 'UNTIL', 'BYDAY', 'WKST'])

/** RRULE → `Powtarzanie`, albo null, gdy nie rozumiemy jej w całości.
 *  Lepiej przyznać się do niezrozumienia niż rozwinąć regułę po swojemu. */
function czytajRegule(rrule: string): Powtarzanie | null {
  const czesci = new Map<string, string>()
  for (const fragment of rrule.split(';')) {
    const [k, v] = fragment.split('=')
    if (!k || v === undefined) return null
    czesci.set(k.trim().toUpperCase(), v.trim().toUpperCase())
  }
  for (const k of czesci.keys()) if (!ZNANE_CZESCI_REGULY.has(k)) return null

  const freq = czesci.get('FREQ')
  if (freq !== 'DAILY' && freq !== 'WEEKLY' && freq !== 'MONTHLY' && freq !== 'YEARLY') return null

  const interval = czesci.has('INTERVAL') ? Number(czesci.get('INTERVAL')) : 1
  if (!Number.isInteger(interval) || interval < 1) return null

  const wynik: Powtarzanie = { freq, interval }

  if (czesci.has('COUNT')) {
    const count = Number(czesci.get('COUNT'))
    if (!Number.isInteger(count) || count < 1) return null
    wynik.count = count
  }
  if (czesci.has('UNTIL')) {
    const until = dataZIcal(czesci.get('UNTIL')!)
    if (!until) return null
    wynik.until = until
  }
  // Początek tygodnia zmienia wynik tylko przy INTERVAL > 1 z BYDAY; liczymy
  // od poniedziałku, więc inny początek to reguła, której nie odtworzymy.
  if (czesci.has('WKST') && czesci.get('WKST') !== 'MO') return null

  if (czesci.has('BYDAY')) {
    if (freq !== 'WEEKLY') return null
    // `2TU` czy `-1SU` (n-ty dzień tygodnia) nie trafi w listę — i dobrze.
    const dni = czesci.get('BYDAY')!.split(',').map(d => DNI_TYGODNIA.indexOf(d))
    if (dni.length === 0 || dni.some(d => d < 0)) return null
    wynik.dniTygodnia = [...new Set(dni)].sort((a, b) => a - b)
  }
  return wynik
}

export interface WynikParsowania {
  zdarzenia: ZdarzenieIcal[]
  /** Ile bloków VEVENT było w pliku. */
  blokow: number
  /** Bloki nieodczytane w całości: bez czytelnej daty albo z regułą
   *  powtarzania, której nie umiemy rozwinąć. Anulowane się nie liczą. */
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
          const zdarzenie: ZdarzenieIcal = {
            uid: biezace.UID ?? '',
            start,
            end: koniec && koniec > start ? koniec : dzienPo(start),
            opis: biezace.SUMMARY ?? '',
          }
          // Wpis powtarzalny, którego reguły nie rozumiemy, zostaje
          // pojedynczym wystąpieniem — to jedno na pewno jest prawdziwe —
          // ale liczy się jako nieodczytany, bo reszty dat nie znamy.
          let niepelny = biezace.RDATE !== undefined
          if (biezace.RRULE !== undefined) {
            const regula = czytajRegule(biezace.RRULE)
            if (regula) {
              const wyjatki = (biezace.EXDATE ?? '').split(',').map(dataZIcal).filter((d): d is string => !!d)
              if (wyjatki.length) regula.wyjatki = wyjatki
              zdarzenie.powtarzanie = regula
            } else {
              niepelny = true
            }
          }
          if (niepelny) pominiete++
          zdarzenia.push(zdarzenie)
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
    const wartosc = linia.slice(dwukropek + 1).trim()
    // EXDATE może wystąpić wiele razy — każdy wiersz dokłada wyjątki.
    biezace[nazwa] = nazwa === 'EXDATE' && biezace.EXDATE ? `${biezace.EXDATE},${wartosc}` : wartosc
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
  const dodaj = (s: string, e: string) => {
    // Przycięcie przed rozwinięciem — zdarzenie „do 2099 roku” nie może
    // zbudować dziesiątek tysięcy wpisów.
    const start = s > od ? s : od
    const koniec = e < do_ ? e : do_
    if (start >= koniec) return
    for (const d of rozwinZakres(start, koniec)) dni.add(d)
  }
  for (const z of zdarzenia) {
    if (!z.powtarzanie) { dodaj(z.start, z.end); continue }
    const dlugosc = roznicaDni(z.start, z.end)
    for (const s of wystapienia(z.start, dlugosc, z.powtarzanie, od, do_)) {
      dodaj(s, przesun(s, dlugosc))
    }
  }
  return [...dni].sort()
}

const DZIEN_MS = 86_400_000
const naDate = (d: string) => new Date(`${d}T00:00:00Z`)
const zDaty = (d: Date) => d.toISOString().slice(0, 10)
const roznicaDni = (a: string, b: string) => Math.round((naDate(b).getTime() - naDate(a).getTime()) / DZIEN_MS)
const przesun = (d: string, dni: number) => zDaty(new Date(naDate(d).getTime() + dni * DZIEN_MS))

/** Dzień miesiąca albo null, gdy go nie ma — 31 kwietnia, 29 lutego 2027. */
function dataJesliIstnieje(rok: number, miesiac0: number, dzien: number): string | null {
  const d = new Date(Date.UTC(rok, miesiac0, dzien))
  return d.getUTCMonth() === ((miesiac0 % 12) + 12) % 12 && d.getUTCDate() === dzien ? zDaty(d) : null
}

/** Bezpiecznik: tyle okresów reguły przechodzimy najwyżej. Reguła, która go
 *  wyczerpie, jest absurdalna (DTSTART w roku 1, INTERVAL=1000). */
const MAKS_OKRESOW = 50_000

/**
 * Początki kolejnych wystąpień w porządku chronologicznym, tylko te, które
 * mogą zachodzić na okno [od, do_).
 *
 * COUNT liczy od pierwszego wystąpienia, także sprzed okna — dlatego dla
 * reguł dziennych i tygodniowych przeskakujemy do okna arytmetycznie, ale
 * z dokładnym licznikiem, zamiast przechodzić dzień po dniu od 1970 roku.
 */
function* wystapienia(start: string, dlugosc: number, r: Powtarzanie, od: string, do_: string): Generator<string> {
  const wyjatki = new Set(r.wyjatki ?? [])
  // Wystąpienie zaczęte przed `prog` kończy się przed oknem.
  const prog = przesun(od, -Math.max(dlugosc, 1))

  // Okres: dzień, tydzień, miesiąc albo rok — razy INTERVAL. Każdy okres
  // daje uporządkowaną listę kandydatów.
  let kandydaci: (okres: number) => string[]
  let poczatekOkresu: (okres: number) => string
  let pierwszyOkres = 0
  let liczbaPrzed = 0

  if (r.freq === 'DAILY') {
    const krok = r.interval
    kandydaci = o => [przesun(start, o * krok)]
    poczatekOkresu = o => przesun(start, o * krok)
    pierwszyOkres = Math.max(0, Math.floor(roznicaDni(start, prog) / krok) - 1)
    liczbaPrzed = pierwszyOkres
  } else if (r.freq === 'WEEKLY') {
    const dniTyg = r.dniTygodnia ?? [(naDate(start).getUTCDay() + 6) % 7]
    const poniedzialek = przesun(start, -((naDate(start).getUTCDay() + 6) % 7))
    const krok = 7 * r.interval
    kandydaci = o => dniTyg.map(d => przesun(poniedzialek, o * krok + d)).filter(d => d >= start)
    poczatekOkresu = o => przesun(poniedzialek, o * krok)
    pierwszyOkres = Math.max(0, Math.floor(roznicaDni(poniedzialek, prog) / krok) - 1)
    // Pierwszy tydzień bywa niepełny (dni sprzed DTSTART nie istnieją),
    // każdy następny ma komplet.
    liczbaPrzed = pierwszyOkres === 0 ? 0 : kandydaci(0).length + (pierwszyOkres - 1) * dniTyg.length
  } else {
    const d = naDate(start)
    const rok = d.getUTCFullYear(), mies = d.getUTCMonth(), dzien = d.getUTCDate()
    const miesiecy = r.freq === 'MONTHLY' ? r.interval : 12 * r.interval
    kandydaci = o => {
      const data = dataJesliIstnieje(rok, mies + o * miesiecy, dzien)
      return data ? [data] : []
    }
    poczatekOkresu = o => zDaty(new Date(Date.UTC(rok, mies + o * miesiecy, 1)))
  }

  let numer = liczbaPrzed
  for (let o = pierwszyOkres; o < pierwszyOkres + MAKS_OKRESOW; o++) {
    if (poczatekOkresu(o) >= do_) return
    for (const s of kandydaci(o)) {
      if (r.count !== undefined && numer >= r.count) return
      if (r.until !== undefined && s > r.until) return
      if (s >= do_) return
      numer++
      if (s < prog || wyjatki.has(s)) continue
      yield s
    }
  }
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

/** Bajty znaku w UTF-8 — bez alokacji, bo liczymy znak po znaku. */
function bajtyUtf8(znak: string): number {
  const k = znak.codePointAt(0)!
  return k < 0x80 ? 1 : k < 0x800 ? 2 : k < 0x10000 ? 3 : 4
}

/**
 * RFC 5545 §3.1: wiersz dłuższy niż 75 bajtów zawijamy, a kontynuacja
 * zaczyna się spacją (która też się liczy). Liczymy bajty, nie znaki, i nie
 * tniemy znaku wielobajtowego — „ż" przecięte w pół to krzaczki w portalu.
 */
function zawin(linia: string): string {
  const wynik: string[] = []
  let biezacy = ''
  let bajty = 0
  for (const znak of linia) {
    const b = bajtyUtf8(znak)
    if (bajty + b > 75) {
      wynik.push(biezacy)
      biezacy = ' '
      bajty = 1
    }
    biezacy += znak
    bajty += b
  }
  wynik.push(biezacy)
  return wynik.join('\r\n')
}

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
  return linie.map(zawin).join('\r\n') + '\r\n'
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
