import { describe, it, expect } from 'vitest'
import { sezonDla, liczNoce, rozwinZakres, sprawdzDaty, wycen, MAX_NOCY, MIESIACE_SEZONU, opisMiesiecy } from './bookingPricing'
import type { ApartmentConfig } from '@/lib/apartmentTypes'

const config = {
  pricing: {
    currency: 'EUR',
    cleaningFee: 60,
    tiers: {
      low:  { pricePerNight: 80,  minNights: 3 },
      mid:  { pricePerNight: 110, minNights: 5 },
      high: { pricePerNight: 150, minNights: 7 },
    },
  },
} as unknown as ApartmentConfig

describe('sezonDla', () => {
  it('przypisuje miesiące do sezonów', () => {
    expect(['2026-07-01', '2026-08-15', '2026-09-30'].map(sezonDla)).toEqual(['high', 'high', 'high'])
    expect(['2026-05-01', '2026-06-10', '2026-10-31'].map(sezonDla)).toEqual(['mid', 'mid', 'mid'])
    expect(['2026-01-05', '2026-04-20', '2026-11-11', '2026-12-24'].map(sezonDla)).toEqual(['low', 'low', 'low', 'low'])
  })

  // Świadoma decyzja produktowa, nie błąd: pobyt na przełomie liczy się
  // w całości po stawce sezonu, w którym się zaczyna.
  it('o sezonie decyduje miesiąc przyjazdu, nie wyjazdu', () => {
    expect(sezonDla('2026-09-28')).toBe('high')
    expect(sezonDla('2026-10-02')).toBe('mid')
  })
})

describe('liczNoce i rozwinZakres', () => {
  it('liczy noce jako różnicę dni', () => {
    expect(liczNoce('2026-07-10', '2026-07-17')).toBe(7)
    expect(liczNoce('2026-07-10', '2026-07-11')).toBe(1)
  })

  it('liczy poprawnie przez zmianę czasu', () => {
    expect(liczNoce('2026-10-24', '2026-10-27')).toBe(3)
    expect(liczNoce('2026-03-28', '2026-03-31')).toBe(3)
  })

  it('dzień wyjazdu nie jest zajęty', () => {
    expect(rozwinZakres('2026-07-10', '2026-07-13')).toEqual(['2026-07-10', '2026-07-11', '2026-07-12'])
  })
})

describe('sprawdzDaty', () => {
  const dzis = '2026-09-25'

  it('przyjmuje poprawny termin w przyszłości', () => {
    expect(sprawdzDaty('2026-10-01', '2026-10-05', dzis)).toBeNull()
  })

  it('odrzuca braki, zły format i odwróconą kolejność', () => {
    for (const [a, b] of [['', '2026-10-05'], ['2026-10-01', ''], ['01-10-2026', '2026-10-05'],
                          ['2026-10-05', '2026-10-01'], ['2026-10-05', '2026-10-05']]) {
      expect(sprawdzDaty(a, b, dzis)).toBe('invalid_dates')
    }
  })

  it('odrzuca termin z przeszłości', () => {
    expect(sprawdzDaty('2026-09-24', '2026-09-28', dzis)).toBe('invalid_dates')
  })

  // Regresja: bez tego limitu data wyjazdu w roku 9999 kazała pętli zbudować
  // miliony wpisów, zanim cokolwiek innego zdążyło się wykonać.
  it('odrzuca absurdalnie długi pobyt', () => {
    expect(sprawdzDaty('2026-10-01', '9999-12-31', dzis)).toBe('stay_too_long')
    expect(sprawdzDaty('2026-10-01', '2027-10-02', dzis)).toBe('stay_too_long')
    expect(sprawdzDaty('2026-10-01', '2027-09-30', dzis)).toBeNull()
    expect(MAX_NOCY).toBe(365)
  })
})

describe('wycen', () => {
  it('liczy pobyt w wysokim sezonie ze sprzątaniem', () => {
    const w = wycen('2026-07-10', '2026-07-17', config)
    expect(w).toMatchObject({ noce: 7, sezon: 'high', cenaZaNoc: 150, kwotaBazowa: 1110, rabat: 0, doZaplaty: 1110 })
  })

  it('stosuje rabat procentowy do całości wraz ze sprzątaniem', () => {
    const w = wycen('2026-01-10', '2026-01-15', config, 10)
    // 5 × 80 + 60 = 460, rabat 46
    expect(w.kwotaBazowa).toBe(460)
    expect(w.rabat).toBe(46)
    expect(w.doZaplaty).toBe(414)
  })

  it('zaokrągla rabat do pełnej jednostki', () => {
    const w = wycen('2026-01-10', '2026-01-13', config, 7) // 300 × 7% = 21
    expect(w.rabat).toBe(21)
    expect(w.doZaplaty).toBe(279)
  })

  // Stripe przyjmuje kwoty w najmniejszej jednostce waluty — błąd tutaj
  // oznacza pobranie stukrotnie za dużo albo za mało.
  it('przelicza na grosze bez błędu zmiennoprzecinkowego', () => {
    expect(wycen('2026-01-10', '2026-01-13', config).groszy).toBe(30000)
    const drogi = { pricing: { ...config.pricing, cleaningFee: 60.1, tiers: config.pricing.tiers } } as unknown as ApartmentConfig
    expect(wycen('2026-01-10', '2026-01-13', drogi).groszy).toBe(30010)
  })

  it('zwraca walutę małymi literami, jak wymaga Stripe', () => {
    expect(wycen('2026-01-10', '2026-01-13', config).waluta).toBe('eur')
  })

  it('podaje minimalną liczbę nocy właściwą dla sezonu', () => {
    expect(wycen('2026-07-10', '2026-07-17', config).minNocy).toBe(7)
    expect(wycen('2026-01-10', '2026-01-13', config).minNocy).toBe(3)
  })
})

describe('MIESIACE_SEZONU i opisMiesiecy', () => {
  it('każdy miesiąc należy do dokładnie jednego sezonu', () => {
    const wszystkie = [...MIESIACE_SEZONU.low, ...MIESIACE_SEZONU.mid, ...MIESIACE_SEZONU.high].sort((a, b) => a - b)
    expect(wszystkie).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  })

  // Reguła i etykieta muszą pochodzić z tego samego miejsca — rozjazd między
  // nimi oznacza, że gość widzi inną cenę, niż zostanie policzona.
  it('sezonDla zgadza się z tablicą miesięcy dla każdego miesiąca', () => {
    for (let m = 1; m <= 12; m++) {
      const data = `2026-${String(m).padStart(2, '0')}-15`
      const sezon = sezonDla(data)
      expect(MIESIACE_SEZONU[sezon]).toContain(m)
    }
  })

  it('skleja miesiące idące po sobie w zakres', () => {
    expect(opisMiesiecy('high')).toBe('lip–wrz')
  })

  // Średni sezon jest nieciągły (maj, czerwiec i październik), więc zakres
  // sam w sobie by go nie opisał.
  it('rozdziela grupy nieciągłe przecinkiem', () => {
    expect(opisMiesiecy('mid')).toBe('maj–cze, paź')
  })

  // Niski sezon przechodzi przez przełom roku — bez zawinięcia wyszłoby
  // „sty–kwi, lis–gru", co czyta się jak dwa różne okresy.
  it('zawija niski sezon przez grudzień i styczeń', () => {
    expect(opisMiesiecy('low')).toBe('lis–kwi')
  })

  it('tłumaczy skróty miesięcy', () => {
    expect(opisMiesiecy('high', 'en')).toBe('Jul–Sep')
    expect(opisMiesiecy('mid', 'de')).toBe('Mai–Jun, Okt')
    expect(opisMiesiecy('low', 'es')).toBe('nov–abr')
  })

  // Październik był opisany jako niski sezon, a liczony jako średni.
  it('październik to średni sezon, zgodnie z PAKIET-BASIC', () => {
    expect(sezonDla('2026-10-26')).toBe('mid')
    expect(opisMiesiecy('low')).not.toContain('paź')
  })
})
