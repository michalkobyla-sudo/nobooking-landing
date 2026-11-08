import { describe, it, expect } from 'vitest'
import { parseIcal, parseIcalZeStatystyka, dniZajete, zakresyZDni, zbudujIcal, sprawdzAdresKalendarza, pobierzKalendarz, MAKS_ROZMIAR_ICAL } from './ical'

// Skrócony eksport z Booking.com — tak wyglądają ich pliki: CRLF, daty
// całodniowe, SUMMARY bez danych gościa.
const BOOKING = [
  'BEGIN:VCALENDAR',
  'VERSION:2.0',
  'PRODID:-//Booking.com//Booking.com Calendar//EN',
  'BEGIN:VEVENT',
  'UID:abc123@booking.com',
  'DTSTART;VALUE=DATE:20261110',
  'DTEND;VALUE=DATE:20261113',
  'SUMMARY:CLOSED - Not available',
  'END:VEVENT',
  'END:VCALENDAR',
  '',
].join('\r\n')

// Airbnb: zawija długie linie (RFC 5545 — kontynuacja zaczyna się spacją).
const AIRBNB = [
  'BEGIN:VCALENDAR',
  'BEGIN:VEVENT',
  'DTEND;VALUE=DATE:20261202',
  'DTSTART;VALUE=DATE:20261128',
  'UID:1418fb94e984-f2b8c3ad4f1d0e4c7a5b0e2fa1c9d7e8@a',
  ' irbnb.com',
  'SUMMARY:Reserved',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\n')

describe('parseIcal', () => {
  it('czyta zdarzenie całodniowe z Bookingu', () => {
    expect(parseIcal(BOOKING)).toEqual([
      { uid: 'abc123@booking.com', start: '2026-11-10', end: '2026-11-13', opis: 'CLOSED - Not available' },
    ])
  })

  it('skleja zawinięte linie i przyjmuje same LF', () => {
    const [z] = parseIcal(AIRBNB)
    expect(z.uid).toBe('1418fb94e984-f2b8c3ad4f1d0e4c7a5b0e2fa1c9d7e8@airbnb.com')
    expect(z.start).toBe('2026-11-28')
    expect(z.end).toBe('2026-12-02')
  })

  it('z daty z godziną bierze sam dzień', () => {
    const tekst = 'BEGIN:VEVENT\nUID:x\nDTSTART:20261110T150000Z\nDTEND:20261112T100000Z\nEND:VEVENT'
    expect(parseIcal(tekst)[0]).toMatchObject({ start: '2026-11-10', end: '2026-11-12' })
  })

  it('bez DTEND zajmuje jeden dzień', () => {
    const tekst = 'BEGIN:VEVENT\nUID:x\nDTSTART;VALUE=DATE:20261231\nEND:VEVENT'
    expect(parseIcal(tekst)[0]).toMatchObject({ start: '2026-12-31', end: '2027-01-01' })
  })

  it('pomija zdarzenia anulowane i bez daty początku', () => {
    const tekst = [
      'BEGIN:VEVENT', 'UID:a', 'STATUS:CANCELLED', 'DTSTART;VALUE=DATE:20261110', 'DTEND;VALUE=DATE:20261111', 'END:VEVENT',
      'BEGIN:VEVENT', 'UID:b', 'SUMMARY:bez daty', 'END:VEVENT',
    ].join('\n')
    expect(parseIcal(tekst)).toEqual([])
  })

  it('śmieci zamiast kalendarza dają pustą listę, a nie wyjątek', () => {
    expect(parseIcal('<html>Not found</html>')).toEqual([])
  })
})

describe('dniZajete', () => {
  it('dzień wyjazdu jest wolny — jak w rozwinZakres', () => {
    const z = parseIcal(BOOKING)
    expect(dniZajete(z, '2026-11-01', '2027-01-01')).toEqual(['2026-11-10', '2026-11-11', '2026-11-12'])
  })

  it('przycina do okna i usuwa duplikaty', () => {
    const z = [
      { uid: 'a', start: '2026-10-30', end: '2026-11-03', opis: '' },
      { uid: 'b', start: '2026-11-02', end: '2026-11-04', opis: '' },
    ]
    expect(dniZajete(z, '2026-11-01', '2026-11-03')).toEqual(['2026-11-01', '2026-11-02'])
  })
})

describe('zakresyZDni', () => {
  it('łączy kolejne dni w pobyty z wyjazdem dzień po ostatniej nocy', () => {
    expect(zakresyZDni(['2026-11-12', '2026-11-10', '2026-11-11', '2026-11-20'])).toEqual([
      { start: '2026-11-10', end: '2026-11-13' },
      { start: '2026-11-20', end: '2026-11-21' },
    ])
  })

  it('przechodzi przez koniec miesiąca i roku', () => {
    expect(zakresyZDni(['2026-12-31', '2027-01-01'])).toEqual([{ start: '2026-12-31', end: '2027-01-02' }])
  })
})

describe('zbudujIcal', () => {
  const tekst = zbudujIcal({
    nazwa: 'Apartament Sol',
    zakresy: [{ start: '2026-11-10', end: '2026-11-13' }],
    domena: 'nobooking.eu',
    teraz: new Date('2026-11-06T18:00:00Z'),
  })

  it('daje poprawny kalendarz z liniami CRLF', () => {
    expect(tekst.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true)
    expect(tekst.endsWith('END:VCALENDAR\r\n')).toBe(true)
    expect(tekst).toContain('\r\nDTSTART;VALUE=DATE:20261110\r\n')
    expect(tekst).toContain('\r\nDTEND;VALUE=DATE:20261113\r\n')
    expect(tekst).toContain('\r\nDTSTAMP:20261106T180000Z\r\n')
  })

  it('nie zdradza danych gościa — tylko „zajęte”', () => {
    expect(tekst).toContain('SUMMARY:Not available')
  })

  it('UID jest stały dla tego samego pobytu, więc Booking nie dubluje blokad', () => {
    expect(tekst).toContain('UID:20261110-20261113@nobooking.eu')
  })

  it('to, co zbudujemy, sami umiemy przeczytać', () => {
    expect(parseIcal(tekst)).toEqual([
      { uid: '20261110-20261113@nobooking.eu', start: '2026-11-10', end: '2026-11-13', opis: 'Not available' },
    ])
  })
})

describe('sprawdzAdresKalendarza', () => {
  it('przyjmuje linki eksportu z Bookingu i Airbnb', () => {
    expect(sprawdzAdresKalendarza('https://admin.booking.com/hotel/hoteladmin/ical.html?t=abc')).toBeNull()
    expect(sprawdzAdresKalendarza('https://www.airbnb.pl/calendar/ical/123.ics?s=xyz')).toBeNull()
  })

  it('odrzuca śmieci i inne protokoły', () => {
    expect(sprawdzAdresKalendarza('nie link')).toBe('invalid_url')
    expect(sprawdzAdresKalendarza('http://www.airbnb.pl/calendar/ical/1.ics')).toBe('not_https')
    expect(sprawdzAdresKalendarza('file:///etc/passwd')).toBe('not_https')
  })

  // Serwer pobiera ten adres sam — bez tej blokady właściciel mógłby kazać
  // mu zajrzeć do sieci wewnętrznej (SSRF).
  it('odrzuca adresy lokalne i gołe IP', () => {
    for (const u of ['https://localhost/x.ics', 'https://127.0.0.1/x.ics', 'https://10.0.0.5/x.ics',
                     'https://169.254.169.254/latest', 'https://[::1]/x.ics', 'https://intranet/x.ics']) {
      expect(sprawdzAdresKalendarza(u)).toBe('private_host')
    }
  })
})

describe('pobierzKalendarz', () => {
  const odp = (status: number, body: string, headers: Record<string, string> = {}) =>
    new Response(body, { status, headers })

  it('zwraca zdarzenia z poprawnego pliku', async () => {
    const wynik = await pobierzKalendarz('https://admin.booking.com/ical?t=1', async () => odp(200, BOOKING))
    expect(wynik).toEqual({ ok: true, zdarzenia: parseIcal(BOOKING), pominiete: 0 })
  })

  // Portal w awarii odsyła stronę HTML. Gdybyśmy uznali ją za pusty
  // kalendarz, cron odblokowałby wszystkie terminy zajęte na Bookingu.
  it('strona HTML zamiast kalendarza to błąd, nie „wszystko wolne”', async () => {
    const wynik = await pobierzKalendarz('https://admin.booking.com/ical', async () => odp(200, '<html>Maintenance</html>'))
    expect(wynik).toEqual({ ok: false, blad: 'not_ical' })
  })

  it('pusty kalendarz jest poprawny — portal nie ma rezerwacji', async () => {
    const wynik = await pobierzKalendarz('https://admin.booking.com/ical', async () => odp(200, 'BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n'))
    expect(wynik).toEqual({ ok: true, zdarzenia: [], pominiete: 0 })
  })

  it('błąd HTTP zwraca kod', async () => {
    const wynik = await pobierzKalendarz('https://admin.booking.com/ical', async () => odp(404, 'nope'))
    expect(wynik).toEqual({ ok: false, blad: 'http_404' })
  })

  it('idzie za przekierowaniem na zwykłą domenę', async () => {
    const adresy: string[] = []
    const wynik = await pobierzKalendarz('https://airbnb.pl/calendar/ical/1.ics', async (u) => {
      adresy.push(u)
      return adresy.length === 1 ? odp(301, '', { location: 'https://www.airbnb.com/calendar/ical/1.ics' }) : odp(200, AIRBNB)
    })
    expect(adresy).toEqual(['https://airbnb.pl/calendar/ical/1.ics', 'https://www.airbnb.com/calendar/ical/1.ics'])
    expect(wynik.ok).toBe(true)
  })

  it('nie idzie za przekierowaniem do sieci wewnętrznej', async () => {
    let wywolania = 0
    const wynik = await pobierzKalendarz('https://evil.example.com/x.ics', async () => {
      wywolania++
      return odp(302, '', { location: 'http://169.254.169.254/latest/meta-data' })
    })
    expect(wynik).toEqual({ ok: false, blad: 'not_https' })
    expect(wywolania).toBe(1)
  })

  it('odrzuca za duży plik', async () => {
    const wielki = 'BEGIN:VCALENDAR\r\n' + 'X'.repeat(MAKS_ROZMIAR_ICAL + 1)
    const wynik = await pobierzKalendarz('https://admin.booking.com/ical', async () => odp(200, wielki))
    expect(wynik).toEqual({ ok: false, blad: 'too_large' })
  })

  it('wyjątek sieci zamienia na błąd', async () => {
    const wynik = await pobierzKalendarz('https://admin.booking.com/ical', async () => { throw new Error('ETIMEDOUT') })
    expect(wynik).toEqual({ ok: false, blad: 'network' })
  })
})

/**
 * Plik, którego nie umiemy sparsować, nie może wyglądać jak kalendarz pusty.
 *
 * To najgroźniejszy scenariusz całej synchronizacji i jedyny, którego nie da
 * się sprawdzić na żywo bez konta gospodarza w portalu. Jeśli Booking.com
 * zmieni kształt pliku albo poda go w dialekcie, którego parser nie rozumie,
 * dostaniemy zero zdarzeń — a cron zinterpretuje to jako „portal zwolnił
 * wszystkie terminy" i odblokuje daty, które są sprzedane. Właściciel dowie
 * się o tym od drugiego gościa stojącego pod tymi samymi drzwiami.
 *
 * Rozróżnienie jest proste i nie wymaga znajomości dialektu: pusty kalendarz
 * nie ma bloków VEVENT, a niezrozumiany plik ma ich wiele i żadnego czytelnego.
 */
describe('niezrozumiany plik vs kalendarz pusty', () => {
  const odp = (body: string) => new Response(body, { status: 200 })

  // Dialekt, którego parser nie zna: daty w polu, którego nie czytamy.
  const OBCY_DIALEKT = [
    'BEGIN:VCALENDAR',
    'BEGIN:VEVENT',
    'UID:1@portal',
    'X-CHECKIN-DATE:20261110',
    'X-CHECKOUT-DATE:20261113',
    'END:VEVENT',
    'BEGIN:VEVENT',
    'UID:2@portal',
    'X-CHECKIN-DATE:20261201',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n')

  it('bloki VEVENT bez ani jednej czytelnej daty to błąd', async () => {
    const wynik = await pobierzKalendarz('https://admin.booking.com/ical', async () => odp(OBCY_DIALEKT))
    expect(wynik).toEqual({ ok: false, blad: 'parse_failed' })
  })

  it('brak bloków VEVENT to nadal poprawny pusty kalendarz', async () => {
    const wynik = await pobierzKalendarz('https://admin.booking.com/ical',
      async () => odp('BEGIN:VCALENDAR\r\nEND:VCALENDAR\r\n'))
    expect(wynik).toEqual({ ok: true, zdarzenia: [], pominiete: 0 })
  })

  // Anulowana rezerwacja jest pomijana celowo — nie wolno jej liczyć jako
  // wpisu, którego nie zrozumieliśmy.
  it('kalendarz z samymi anulowanymi jest pusty, nie zepsuty', async () => {
    const tylkoAnulowane = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT', 'UID:1@a', 'DTSTART;VALUE=DATE:20261110', 'STATUS:CANCELLED', 'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')
    const wynik = await pobierzKalendarz('https://admin.booking.com/ical', async () => odp(tylkoAnulowane))
    expect(wynik).toEqual({ ok: true, zdarzenia: [], pominiete: 0 })
  })

  // Jeden zepsuty wpis nie zatrzymuje reszty — ale zostaje policzony, bo
  // pominięty wpis to termin sprzedany w portalu i wolny u nas.
  it('częściowo czytelny plik przechodzi i liczy pominięte wpisy', async () => {
    const polowa = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT', 'UID:1@a', 'DTSTART;VALUE=DATE:20261110', 'DTEND;VALUE=DATE:20261113', 'END:VEVENT',
      'BEGIN:VEVENT', 'UID:2@a', 'X-CHECKIN-DATE:20261201', 'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n')
    const wynik = await pobierzKalendarz('https://admin.booking.com/ical', async () => odp(polowa))
    expect(wynik.ok).toBe(true)
    if (!wynik.ok) return
    expect(wynik.zdarzenia).toHaveLength(1)
    expect(wynik.pominiete).toBe(1)
  })
})

describe('parseIcalZeStatystyka', () => {
  it('liczy bloki, zdarzenia i pominięte', () => {
    expect(parseIcalZeStatystyka(BOOKING)).toEqual({
      zdarzenia: parseIcal(BOOKING),
      blokow: 1,
      pominiete: 0,
    })
  })

  it('na śmieciach nie znajduje żadnego bloku', () => {
    expect(parseIcalZeStatystyka('<html>Not found</html>')).toEqual({ zdarzenia: [], blokow: 0, pominiete: 0 })
  })
})
