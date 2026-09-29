import { describe, it, expect } from 'vitest'
import {
  czytajZrodlo, scal, maInformacje, zJson, zBody, opisZrodla,
  PUSTE_ZRODLO, MAX_DLUGOSC, type Zrodlo,
} from './attribution'

const START = 'https://nobooking.eu/'

describe('czytajZrodlo — parametry UTM', () => {
  it('czyta pełny zestaw', () => {
    const z = czytajZrodlo(
      `${START}?utm_source=facebook&utm_medium=paid&utm_campaign=wiosna26&utm_content=karuzela-a&utm_term=apartament`,
      null,
    )
    expect(z).toMatchObject({
      utm_source: 'facebook', utm_medium: 'paid', utm_campaign: 'wiosna26',
      utm_content: 'karuzela-a', utm_term: 'apartament',
    })
  })

  it('zapisuje ścieżkę wejścia razem z zapytaniem', () => {
    expect(czytajZrodlo(`${START}cennik?utm_source=ig`, null).landing_path).toBe('/cennik?utm_source=ig')
    expect(czytajZrodlo(START, null).landing_path).toBe('/')
  })

  // Parametry przychodzą z adresu, czyli od kogokolwiek.
  it('przycina zbyt długie wartości', () => {
    const dlugie = 'a'.repeat(5000)
    expect(czytajZrodlo(`${START}?utm_campaign=${dlugie}`, null).utm_campaign).toHaveLength(MAX_DLUGOSC)
  })

  it('zamienia znaki sterujące na spacje', () => {
    const z = czytajZrodlo(`${START}?utm_source=${encodeURIComponent('fb\n\u0000ads')}`, null)
    expect(z.utm_source).toBe('fb  ads')
  })

  it('puste i same białe znaki traktuje jak brak', () => {
    const z = czytajZrodlo(`${START}?utm_source=&utm_medium=${encodeURIComponent('   ')}`, null)
    expect(z.utm_source).toBeNull()
    expect(z.utm_medium).toBeNull()
  })

  it('nie wywraca się na niepoprawnym adresie', () => {
    expect(czytajZrodlo('to nie jest url', null)).toEqual(PUSTE_ZRODLO)
  })
})

describe('czytajZrodlo — identyfikator kliknięcia z reklamy', () => {
  // Meta i Google dokładają go nawet wtedy, gdy kampania nie ma UTM-ów —
  // bez tego cały ruch płatny wyglądałby na bezpośredni.
  it('z fbclid wyprowadza źródło facebook/paid', () => {
    const z = czytajZrodlo(`${START}?fbclid=IwAR123`, null)
    expect(z).toMatchObject({ click_id: 'IwAR123', utm_source: 'facebook', utm_medium: 'paid' })
  })

  it('z gclid wyprowadza źródło google/paid', () => {
    const z = czytajZrodlo(`${START}?gclid=abc`, null)
    expect(z).toMatchObject({ click_id: 'abc', utm_source: 'google', utm_medium: 'paid' })
  })

  it('nie nadpisuje jawnie podanego utm_source', () => {
    const z = czytajZrodlo(`${START}?fbclid=x&utm_source=newsletter&utm_medium=email`, null)
    expect(z).toMatchObject({ utm_source: 'newsletter', utm_medium: 'email', click_id: 'x' })
  })
})

describe('czytajZrodlo — referrer', () => {
  const zRef = (ref: string) => czytajZrodlo(START, ref)

  it('rozpoznaje serwisy społecznościowe', () => {
    expect(zRef('https://m.facebook.com/')).toMatchObject({ utm_source: 'facebook', utm_medium: 'social' })
    expect(zRef('https://l.instagram.com/?u=x')).toMatchObject({ utm_source: 'instagram', utm_medium: 'social' })
    expect(zRef('https://t.co/abc')).toMatchObject({ utm_source: 'x', utm_medium: 'social' })
  })

  it('rozpoznaje wyszukiwarki', () => {
    expect(zRef('https://www.google.pl/search?q=strona+dla+apartamentu'))
      .toMatchObject({ utm_source: 'google', utm_medium: 'organic' })
    expect(zRef('https://duckduckgo.com/')).toMatchObject({ utm_source: 'szukajarka', utm_medium: 'organic' })
  })

  it('nieznaną domenę zapisuje jako odesłanie, bez www', () => {
    expect(zRef('https://www.blogoapartamentach.pl/wpis/1'))
      .toMatchObject({ utm_source: 'blogoapartamentach.pl', utm_medium: 'referral' })
  })

  // Przejście z podstrony na podstronę to nie jest nowe źródło — inaczej
  // każde zamówienie miałoby źródło „nobooking.eu".
  it('ignoruje referrer wewnętrzny', () => {
    expect(zRef('https://nobooking.eu/cennik').utm_source).toBeNull()
    expect(zRef('https://www.nobooking.eu/').utm_source).toBeNull()
  })

  it('brak referrera to wejście bezpośrednie', () => {
    const z = czytajZrodlo(START, '')
    expect(maInformacje(z)).toBe(false)
    expect(opisZrodla(z)).toBe('wejście bezpośrednie')
  })
})

describe('scal — pierwsze dotknięcie wygrywa', () => {
  const zFb = czytajZrodlo(`${START}?utm_source=facebook&utm_campaign=wiosna26`, null)
  const zGoogle = czytajZrodlo(`${START}?utm_source=google&utm_campaign=jesien26`, null)

  it('nie nadpisuje zapisanego źródła', () => {
    expect(scal(zFb, zGoogle).utm_source).toBe('facebook')
  })

  it('przyjmuje pierwsze, gdy nic jeszcze nie zapisano', () => {
    expect(scal(null, zGoogle).utm_source).toBe('google')
  })

  // Klient wszedł bezpośrednio, wrócił z reklamy i dopiero wtedy zamówił —
  // przypisanie tego do „wejścia bezpośredniego" ukrywałoby skuteczną kampanię.
  it('puste zapisane ustępuje źródłu z informacją', () => {
    const bezposrednie = czytajZrodlo(START, '')
    expect(scal(bezposrednie, zFb).utm_source).toBe('facebook')
  })
})

describe('zJson i zBody — dane niezaufane', () => {
  it('odczytuje zapisane źródło', () => {
    const z = czytajZrodlo(`${START}?utm_source=ig&utm_campaign=x`, null)
    expect(zJson(JSON.stringify(z))).toEqual(z)
  })

  it('zwraca null przy uszkodzonym wpisie', () => {
    for (const t of ['', null, undefined, '{', 'null', '"tekst"', '[1,2]']) {
      expect(zJson(t)).toBeNull()
    }
  })

  it('odrzuca pola spoza zestawu i typy inne niż tekst', () => {
    const z = zBody({ utm_source: 'fb', utm_campaign: 42, zlosliwe: 'drop table', click_id: { a: 1 } })
    expect(z).toEqual({ ...PUSTE_ZRODLO, utm_source: 'fb' })
    expect(Object.keys(z).sort()).toEqual(Object.keys(PUSTE_ZRODLO).sort())
  })

  it('przycina długości także po stronie serwera', () => {
    expect(zBody({ utm_term: 'b'.repeat(999) }).utm_term).toHaveLength(MAX_DLUGOSC)
  })

  it('nie wywraca się na czymkolwiek', () => {
    for (const b of [null, undefined, 'tekst', 7, []]) {
      expect(zBody(b)).toEqual(PUSTE_ZRODLO)
    }
  })
})

describe('opisZrodla', () => {
  it('składa czytelną linię do maila', () => {
    const z = czytajZrodlo(`${START}?utm_source=facebook&utm_medium=paid&utm_campaign=wiosna26&utm_content=karuzela-a`, null)
    expect(opisZrodla(z)).toBe('źródło: facebook, kanał: paid, kampania: wiosna26, kreacja: karuzela-a')
  })

  it('przy samym referrerze podaje skąd przyszedł', () => {
    const z: Zrodlo = { ...PUSTE_ZRODLO, referrer: 'https://blog.example/wpis' }
    expect(opisZrodla(z)).toBe('z: https://blog.example/wpis')
  })
})
