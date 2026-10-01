import { describe, it, expect } from 'vitest'
import {
  normalizujNumer, trescRezerwacji, bezOgonkow, mozeWyslac,
  MAX_SMS_DZIENNIE, MAX_ZNAKOW, sprawdzNadawce, type RezerwacjaDoSms,
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
  // Operator liczy wiadomość z polskim znakiem w UCS-2, gdzie limit spada
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

describe('sprawdzNadawce', () => {
  it('przyjmuje numer w E.164', () => {
    expect(sprawdzNadawce('+48732126373')).toEqual({ ok: true, rodzaj: 'numer', wartosc: '+48732126373' })
    expect(sprawdzNadawce(' +48732126373 ')).toMatchObject({ ok: true, rodzaj: 'numer' })
  })

  it('odrzuca zly numer', () => {
    for (const v of ['+48', '+0123456789', '+4873212637300000']) {
      expect(sprawdzNadawce(v)).toMatchObject({ ok: false, blad: 'zly_numer' })
    }
  })

  // Najczestsza pomylka: numer wklejony bez plusa. Twilio potraktuje go jak
  // nazwe alfanumeryczna, a operator podmieni na "unknown" albo zablokuje.
  it('odrzuca same cyfry bez plusa', () => {
    expect(sprawdzNadawce('48732126373')).toMatchObject({ ok: false, blad: 'same_cyfry' })
    expect(sprawdzNadawce('12345')).toMatchObject({ ok: false, blad: 'same_cyfry' })
  })

  it('przyjmuje nazwe alfanumeryczna', () => {
    expect(sprawdzNadawce('Nobooking')).toEqual({ ok: true, rodzaj: 'nazwa', wartosc: 'Nobooking' })
    expect(sprawdzNadawce('Casa Sol')).toMatchObject({ ok: true, rodzaj: 'nazwa' })
    expect(sprawdzNadawce('Apart24')).toMatchObject({ ok: true, rodzaj: 'nazwa' })
  })

  it('pilnuje limitu jedenastu znakow Twilio', () => {
    expect(sprawdzNadawce('Nobooking12')).toMatchObject({ ok: true })       // 11
    expect(sprawdzNadawce('Nobooking123')).toMatchObject({ ok: false, blad: 'za_dlugi' })  // 12
  })

  // Polskie ogonki i znaki specjalne nie przechodza przez Twilio w polu From.
  it('odrzuca znaki spoza zakresu', () => {
    for (const v of ['Noclegi!', 'Mój dom', 'a_b', 'Casa-Sol']) {
      expect(sprawdzNadawce(v)).toMatchObject({ ok: false, blad: 'zle_znaki' })
    }
  })

  it('odrzuca pusty nadawce', () => {
    for (const v of ['', '   ', null, undefined]) {
      expect(sprawdzNadawce(v)).toMatchObject({ ok: false, blad: 'pusty' })
    }
  })
})
