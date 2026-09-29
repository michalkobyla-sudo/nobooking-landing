import { describe, it, expect } from 'vitest'
import {
  normalizujNumer, trescRezerwacji, bezOgonkow, mozeWyslac,
  MAX_SMS_DZIENNIE, MAX_ZNAKOW, type RezerwacjaDoSms,
} from './sms'

describe('normalizujNumer', () => {
  // Właściciele wpisują numer ręcznie w formularzu onboardingu — każdy z tych
  // zapisów pojawia się w praktyce.
  it('sprowadza typowe zapisy do jednej postaci', () => {
    for (const zapis of [
      '+48600123456', '48600123456', '0048600123456', '600123456',
      '600 123 456', '+48 600-123-456', '(48) 600 123 456', '+48.600.123.456',
    ]) {
      expect(normalizujNumer(zapis)).toEqual({ ok: true, numer: '+48600123456' })
    }
  })

  it('zachowuje numer zagraniczny', () => {
    expect(normalizujNumer('+34 612 345 678')).toEqual({ ok: true, numer: '+34612345678' })
    expect(normalizujNumer('004915112345678')).toEqual({ ok: true, numer: '+4915112345678' })
  })

  it('odrzuca pusty', () => {
    for (const p of ['', '   ', null, undefined]) {
      expect(normalizujNumer(p)).toEqual({ ok: false, blad: 'pusty' })
    }
  })

  // Litera w numerze to zawsze pomyłka, nie zapis do uratowania.
  it('odrzuca litery', () => {
    expect(normalizujNumer('600-ABC-456')).toMatchObject({ blad: 'niedozwolone_znaki' })
    expect(normalizujNumer('brak')).toMatchObject({ blad: 'niedozwolone_znaki' })
  })

  it('pilnuje zakresu długości z E.164', () => {
    expect(normalizujNumer('+12345')).toMatchObject({ blad: 'za_krotki' })
    expect(normalizujNumer('+1234567890123456')).toMatchObject({ blad: 'za_dlugi' })
    expect(normalizujNumer('+12345678').ok).toBe(true)
    expect(normalizujNumer('+123456789012345').ok).toBe(true)
  })
})

describe('bezOgonkow', () => {
  // SMSAPI liczy wiadomość z polskim znakiem w UCS-2, gdzie limit spada
  // ze 160 znaków do 70 — ta sama treść kosztowałaby trzy razy więcej.
  it('zamienia wszystkie polskie znaki', () => {
    expect(bezOgonkow('Zażółć gęślą jaźń')).toBe('Zazolc gesla jazn')
    expect(bezOgonkow('ŁÓDŹ ŚWIĘTA')).toBe('LODZ SWIETA')
  })

  it('nie rusza reszty', () => {
    expect(bezOgonkow('Jose Muñoz 2026-07-10')).toBe('Jose Muñoz 2026-07-10')
  })
})

describe('trescRezerwacji', () => {
  const r: RezerwacjaDoSms = {
    guest_name: 'Anna Kowalska',
    check_in: '2026-07-10',
    check_out: '2026-07-17',
    total_price: 1110,
    currency: 'eur',
  }

  it('zawiera wszystko, co właściciel musi wiedzieć od razu', () => {
    const t = trescRezerwacji(r, 'Apart Sunny')
    expect(t).toContain('Anna Kowalska')
    expect(t).toContain('2026-07-10')
    expect(t).toContain('2026-07-17')
    expect(t).toContain('1110 EUR')
    expect(t).toContain('Apart Sunny')
  })

  it('nie zawiera polskich znaków', () => {
    const t = trescRezerwacji({ ...r, guest_name: 'Łukasz Żółć' }, 'Apartament Słoneczny')
    expect(t).not.toMatch(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/)
    expect(t).toContain('Lukasz Zolc')
  })

  // Przekroczenie 160 znaków to druga wiadomość i druga opłata.
  it('mieści się w jednym SMS-ie nawet przy skrajnych danych', () => {
    const t = trescRezerwacji(
      { ...r, guest_name: 'A'.repeat(200), total_price: 999999 },
      'B'.repeat(200),
    )
    expect(t.length).toBeLessThanOrEqual(MAX_ZNAKOW)
  })

  it('zaokrągla kwotę do pełnej jednostki', () => {
    expect(trescRezerwacji({ ...r, total_price: 1110.49 }, 'X')).toContain('1110 EUR')
  })
})

describe('mozeWyslac', () => {
  it('przepuszcza poniżej limitu i blokuje na limicie', () => {
    expect(mozeWyslac(0)).toBe(true)
    expect(mozeWyslac(MAX_SMS_DZIENNIE - 1)).toBe(true)
    expect(mozeWyslac(MAX_SMS_DZIENNIE)).toBe(false)
    expect(mozeWyslac(MAX_SMS_DZIENNIE + 5)).toBe(false)
  })
})

describe('normalizujNumer — granica doklejania prefiksu', () => {
  // Regresja: „48600123456" wpisane bez plusa to numer z prefiksem. Doklejenie
  // domyślnego kraju dawało „+4848600123456", czyli SMS wysłany w próżnię.
  it('nie dokleja prefiksu numerowi, który już go ma', () => {
    expect(normalizujNumer('48600123456')).toEqual({ ok: true, numer: '+48600123456' })
    expect(normalizujNumer('34612345678')).toEqual({ ok: true, numer: '+34612345678' })
  })

  it('dokleja tylko przy długości numeru krajowego', () => {
    expect(normalizujNumer('600123456')).toEqual({ ok: true, numer: '+48600123456' })
  })
})
