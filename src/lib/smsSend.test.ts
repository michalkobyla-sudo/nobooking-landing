import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { wyslijSms, powiadomORezerwacji } from './smsSend'
import { MAX_SMS_DZIENNIE } from './sms'
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Wysylka SMS-a to jedyne miejsce w tym kodzie, gdzie pojedyncze wywolanie
 * kosztuje pieniadze. Logika bez zaleznosci jest w `sms.ts`; tutaj sprawdzamy
 * to, czego tam nie da sie sprawdzic: ktore sciezki w ogole siegaja do Twilio,
 * ktore zapisuja slad, i czy awaria nie przechodzi za sukces.
 */

// ── Atrapa Supabase ──────────────────────────────────────────────────────────
// Tylko dwie operacje: zliczenie dzisiejszych wysylek i zapis sladu.
function baza({ licznik = 0, bladLicznika = false, zapisy = [] as unknown[] } = {}) {
  return {
    zapisy,
    klient: {
      from(tabela: string) {
        if (tabela !== 'sms_log') throw new Error('nieoczekiwana tabela: ' + tabela)
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                gte: () => Promise.resolve(
                  bladLicznika
                    ? { count: null, error: { message: 'baza padla' } }
                    : { count: licznik, error: null },
                ),
              }),
            }),
          }),
          insert: (wiersz: unknown) => {
            zapisy.push(wiersz)
            return Promise.resolve({ error: null })
          },
        }
      },
    } as unknown as SupabaseClient,
  }
}

const PARAMY = {
  siteId: 'site-1',
  numerSurowy: '600123456',
  tresc: 'Nowa rezerwacja',
  rodzaj: 'rezerwacja',
  wlaczone: true,
}

let fetchMock: ReturnType<typeof vi.fn>

beforeEach(() => {
  process.env.TWILIO_ACCOUNT_SID = 'ACtest'
  process.env.TWILIO_AUTH_TOKEN = 'token'
  process.env.TWILIO_FROM_NUMBER = 'Nobooking'
  fetchMock = vi.fn(async () => new Response(JSON.stringify({ sid: 'SM1' }), { status: 201 }))
  vi.stubGlobal('fetch', fetchMock)
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('wyslijSms — kiedy w ogole dzwonimy do Twilio', () => {
  it('wysyla i zapisuje slad', async () => {
    const b = baza()
    const w = await wyslijSms(b.klient, PARAMY)

    expect(w).toEqual({ stan: 'wyslano', numer: '+48600123456' })
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(b.zapisy).toEqual([{ site_id: 'site-1', phone: '+48600123456', rodzaj: 'rezerwacja', udane: true, blad: null }])
  })

  it('wysyla z nadawca i trescia bez ogonkow', async () => {
    await wyslijSms(baza().klient, { ...PARAMY, tresc: 'Gość: Łódź, zaliczka OK' })

    const [, opcje] = fetchMock.mock.calls[0] as [string, RequestInit]
    const ciało = new URLSearchParams(String(opcje.body))
    expect(ciało.get('From')).toBe('Nobooking')
    expect(ciało.get('To')).toBe('+48600123456')
    // Diakrytyki przelaczaja kodowanie na UCS-2 i tna limit ze 160 na 70
    // znakow, wiec jeden SMS robi sie trzema.
    expect(ciało.get('Body')).toBe('Gosc: Lodz, zaliczka OK')
  })

  // Kazda z tych sciezek musi skonczyc sie BEZ dzwonienia do Twilio.
  it.each([
    ['brak konfiguracji', () => { delete process.env.TWILIO_AUTH_TOKEN }, PARAMY, 'brak_konfiguracji'],
    ['zly nadawca', () => { process.env.TWILIO_FROM_NUMBER = '48732126373' }, PARAMY, 'zly_nadawca'],
    ['wylaczone przez wlasciciela', () => {}, { ...PARAMY, wlaczone: false }, 'wylaczone'],
    ['brak numeru', () => {}, { ...PARAMY, numerSurowy: null }, 'brak_numeru'],
    ['zly numer', () => {}, { ...PARAMY, numerSurowy: '123' }, 'brak_numeru'],
  ])('%s — nie dzwoni do Twilio', async (_nazwa, przygotuj, paramy, powod) => {
    przygotuj()
    const w = await wyslijSms(baza().klient, paramy)

    expect(w).toEqual({ stan: 'pominieto', powod })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('wyslijSms — limit dzienny', () => {
  it('przepuszcza ponizej limitu', async () => {
    await wyslijSms(baza({ licznik: MAX_SMS_DZIENNIE - 1 }).klient, PARAMY)
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('odcina po osiagnieciu limitu i zostawia slad', async () => {
    const b = baza({ licznik: MAX_SMS_DZIENNIE })
    const w = await wyslijSms(b.klient, PARAMY)

    expect(w).toEqual({ stan: 'pominieto', powod: 'limit_dzienny' })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(b.zapisy).toEqual([expect.objectContaining({ udane: false, blad: 'limit_dzienny' })])
  })

  // Nieznany licznik znaczy "nie wiem, czy limit przekroczony". Lepiej nie
  // wyslac jednego SMS-a niz wyslac ich tyle, ile przyjdzie zdarzen.
  it('zawodzi na zamknieto, gdy licznika nie da sie odczytac', async () => {
    const w = await wyslijSms(baza({ bladLicznika: true }).klient, PARAMY)
    expect(w).toEqual({ stan: 'pominieto', powod: 'limit_dzienny' })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('wyslijSms — awaria nie moze przejsc za sukces', () => {
  it('blad Twilio zwraca stan bledu i zapisuje powod', async () => {
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ code: 21212, message: 'Invalid From' }), { status: 400 }),
    )
    const b = baza()
    const w = await wyslijSms(b.klient, PARAMY)

    expect(w).toMatchObject({ stan: 'blad' })
    expect(w).toHaveProperty('powod', expect.stringContaining('21212'))
    expect(b.zapisy).toEqual([expect.objectContaining({ udane: false })])
  })

  it('zerwane polaczenie tez zostawia slad', async () => {
    fetchMock.mockRejectedValueOnce(new Error('ECONNRESET'))
    const b = baza()
    const w = await wyslijSms(b.klient, PARAMY)

    expect(w).toMatchObject({ stan: 'blad', powod: 'ECONNRESET' })
    expect(b.zapisy).toEqual([expect.objectContaining({ udane: false, blad: 'ECONNRESET' })])
  })
})

describe('powiadomORezerwacji — bramka planu', () => {
  const strona = { id: 'site-1', slug: 'apart', sms_phone: '600123456', sms_enabled: true, plan: 'pro' }
  const rezerwacja = {
    guest_name: 'Jan Kowalski', check_in: '2026-07-01', check_out: '2026-07-08',
    total_price: 2240, currency: 'PLN',
  }

  it('plan pro wysyla', async () => {
    const w = await powiadomORezerwacji(baza().klient, strona, rezerwacja, 'Apart Sunny')
    expect(w).toMatchObject({ stan: 'wyslano' })
  })

  // Bramka po stronie serwera, nie tylko w interfejsie: SMS kosztuje,
  // a plan da sie podmienic w zadaniu.
  it('plan basic nie wysyla', async () => {
    const w = await powiadomORezerwacji(baza().klient, { ...strona, plan: 'basic' }, rezerwacja, 'Apart Sunny')
    expect(w).toEqual({ stan: 'pominieto', powod: 'wylaczone' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('wylacznik wlasciciela zatrzymuje wysylke', async () => {
    const w = await powiadomORezerwacji(baza().klient, { ...strona, sms_enabled: false }, rezerwacja, 'Apart Sunny')
    expect(w).toEqual({ stan: 'pominieto', powod: 'wylaczone' })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
