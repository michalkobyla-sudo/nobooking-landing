import { describe, it, expect } from 'vitest'
import {
  sprawdzConfig, sprawdzStrone, blokujeWysylke, podsumowanie,
  MIN_ZDJEC, MIN_ZNAKOW_OPISU,
  type OdpowiedzStrony,
} from './provisionCheck'
import type { ApartmentConfig } from '@/lib/apartmentTypes'

const opisPoprawny = 'Przestronny apartament kilka minut od plaży, z tarasem i widokiem na morze. Kuchnia w pełni wyposażona, klimatyzacja w każdym pokoju, miejsce postojowe w cenie.'

function t(s: string) {
  return { pl: s, en: s, es: s, de: s }
}

function poprawny(): ApartmentConfig {
  return {
    slug: 'apart-sunny',
    name: 'Apart Sunny',
    tagline: t('Kilka kroków od morza'),
    location: 'Torrevieja',
    address: 'Calle Mayor 1',
    specs: { bedrooms: 2, guests: 4, sqm: 60, bathrooms: 1 },
    description: t(opisPoprawny),
    photos: [
      { url: 'https://example.com/1.jpg', alt: 'Salon' },
      { url: 'https://example.com/2.jpg', alt: 'Sypialnia' },
      { url: 'https://example.com/3.jpg', alt: 'Taras' },
    ],
    amenities: [{ icon: 'wifi', label: t('Wi-Fi') }],
    pricing: {
      currency: 'EUR',
      cleaningFee: 60,
      tiers: {
        low:  { pricePerNight: 80,  minNights: 3, label: t('Niski'),  months: 'Nov–Apr' },
        mid:  { pricePerNight: 110, minNights: 5, label: t('Średni'), months: 'May–Jun' },
        high: { pricePerNight: 150, minNights: 7, label: t('Wysoki'), months: 'Jul–Sep' },
      },
    },
    bookedDates: [],
  } as unknown as ApartmentConfig
}

/** Zmiana jednego pola bez psucia reszty. */
function z(zmiana: (c: ApartmentConfig) => void): ApartmentConfig {
  const c = poprawny()
  zmiana(c)
  return c
}

function pola(config: ApartmentConfig, waga?: 'blokujaca' | 'ostrzezenie') {
  return sprawdzConfig(config)
    .filter((u) => !waga || u.waga === waga)
    .map((u) => u.pole)
}

describe('sprawdzConfig — strona poprawna', () => {
  it('nie zgłasza żadnych usterek', () => {
    expect(sprawdzConfig(poprawny())).toEqual([])
    expect(blokujeWysylke(sprawdzConfig(poprawny()))).toBe(false)
  })
})

describe('sprawdzConfig — zaślepki', () => {
  // To jest główny powód istnienia tego modułu: model, któremu zabrakło danych,
  // zwraca poprawny strukturalnie config z tekstem do uzupełnienia w środku.
  it('wyłapuje niewypełniony szablon i typowe zaślepki w opisie', () => {
    for (const tekst of [
      '{{ opis }} ' + opisPoprawny,
      'Lorem ipsum dolor sit amet, ' + opisPoprawny,
      opisPoprawny + ' TODO: uzupełnić',
      'PLACEHOLDER — ' + opisPoprawny,
    ]) {
      expect(pola(z((c) => { c.description.pl = tekst }), 'blokujaca')).toContain('description.pl')
    }
  })

  it('wyłapuje zaślepkę w nazwie i w haśle', () => {
    expect(pola(z((c) => { c.name = 'Opis apartamentu' }), 'blokujaca')).toContain('name')
    expect(pola(z((c) => { c.tagline.pl = '{{ tagline }}' }), 'blokujaca')).toContain('tagline.pl')
  })

  it('nie myli zaślepki ze zwykłym tekstem', () => {
    expect(sprawdzConfig(z((c) => { c.description.pl = 'Apartament TODOS w Torrevieja. ' + opisPoprawny }))).toEqual([])
  })
})

describe('sprawdzConfig — opis', () => {
  it('blokuje brak opisu po polsku', () => {
    expect(pola(z((c) => { c.description.pl = '   ' }), 'blokujaca')).toContain('description.pl')
  })

  it('blokuje opis krótszy niż próg', () => {
    expect(MIN_ZNAKOW_OPISU).toBe(120)
    expect(pola(z((c) => { c.description.pl = 'Ładny apartament.' }), 'blokujaca')).toContain('description.pl')
  })

  // Brak tłumaczenia degraduje stronę, ale jej nie psuje — nie wstrzymujemy
  // przez to wysyłki, bo klient wolałby dostać stronę i poprawić ją sam.
  it('brak tłumaczeń to tylko ostrzeżenie', () => {
    const u = sprawdzConfig(z((c) => { c.description.en = ''; c.description.de = '' }))
    expect(blokujeWysylke(u)).toBe(false)
    expect(u.map((x) => x.pole)).toContain('description')
  })
})

describe('sprawdzConfig — zdjęcia', () => {
  it('blokuje zbyt małą galerię', () => {
    expect(MIN_ZDJEC).toBe(3)
    expect(pola(z((c) => { c.photos = c.photos.slice(0, 2) }), 'blokujaca')).toContain('photos')
    expect(pola(z((c) => { c.photos = [] }), 'blokujaca')).toContain('photos')
  })

  // Model bez linku od klienta potrafi wymyślić ścieżkę względną — galeria
  // pokazuje wtedy puste kafelki, a strona wygląda na zepsutą.
  it('blokuje adresy, które nie są pełnym http(s)', () => {
    for (const url of ['/zdjecia/1.jpg', 'zdjecie.jpg', 'data:image/png;base64,AAA', '']) {
      expect(pola(z((c) => { c.photos[0].url = url }), 'blokujaca')).toContain('photos')
    }
  })

  it('brak tekstu alternatywnego to ostrzeżenie', () => {
    const u = sprawdzConfig(z((c) => { c.photos[0].alt = '' }))
    expect(blokujeWysylke(u)).toBe(false)
    expect(u.map((x) => x.pole)).toContain('photos')
  })
})

describe('sprawdzConfig — cennik', () => {
  // Najdroższa klasa błędu: strona przyjmie rezerwację po złej cenie, a pieniądze
  // idą direct charge na konto właściciela.
  it('blokuje niedodatnią cenę za noc', () => {
    for (const cena of [0, -10, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(pola(z((c) => { c.pricing.tiers.high.pricePerNight = cena }), 'blokujaca'))
        .toContain('pricing.tiers.high')
    }
  })

  it('blokuje minimalną liczbę nocy poniżej jednej', () => {
    expect(pola(z((c) => { c.pricing.tiers.low.minNights = 0 }), 'blokujaca')).toContain('pricing.tiers.low')
    expect(pola(z((c) => { c.pricing.tiers.low.minNights = 2.5 }), 'blokujaca')).toContain('pricing.tiers.low')
  })

  it('blokuje nieznaną walutę', () => {
    expect(pola(z((c) => { (c.pricing as { currency: string }).currency = 'BTC' }), 'blokujaca'))
      .toContain('pricing.currency')
  })

  it('blokuje ujemną opłatę za sprzątanie, ale zero przepuszcza', () => {
    expect(pola(z((c) => { c.pricing.cleaningFee = -1 }), 'blokujaca')).toContain('pricing.cleaningFee')
    expect(sprawdzConfig(z((c) => { c.pricing.cleaningFee = 0 }))).toEqual([])
  })

  it('blokuje brak całego sezonu', () => {
    expect(pola(z((c) => { delete (c.pricing.tiers as Record<string, unknown>).mid }), 'blokujaca'))
      .toContain('pricing.tiers.mid')
  })
})

describe('sprawdzConfig — pojemność', () => {
  // guests ogranicza formularz rezerwacji, więc zero gości to strona,
  // na której nikt nie zarezerwuje.
  it('blokuje liczbę gości poniżej jednego', () => {
    expect(pola(z((c) => { c.specs.guests = 0 }), 'blokujaca')).toContain('specs.guests')
  })

  it('brak metrażu i udogodnień to ostrzeżenia', () => {
    const u = sprawdzConfig(z((c) => { c.specs.sqm = 0; c.amenities = [] }))
    expect(blokujeWysylke(u)).toBe(false)
    expect(u.map((x) => x.pole).sort()).toEqual(['amenities', 'specs.sqm'])
  })
})

describe('sprawdzConfig — config kompletnie pusty', () => {
  // Nie może rzucić wyjątkiem: rzucenie w cronie przerwałoby provisioning
  // po założeniu konta, a przed zapisem — czyli w najgorszym możliwym miejscu.
  it('zgłasza usterki zamiast rzucać', () => {
    const u = sprawdzConfig({} as ApartmentConfig)
    expect(blokujeWysylke(u)).toBe(true)
    expect(u.map((x) => x.pole)).toEqual(
      expect.arrayContaining(['name', 'description.pl', 'photos', 'pricing', 'specs.guests']),
    )
  })
})

describe('sprawdzStrone', () => {
  const ok = (tresc: string) => async (): Promise<OdpowiedzStrony> => ({ status: 200, tresc })

  it('przepuszcza stronę 200 z nazwą w treści', async () => {
    expect(await sprawdzStrone('https://x/', 'Apart Sunny', ok('<h1>Apart Sunny</h1>'))).toEqual([])
  })

  it('blokuje kod inny niż 200', async () => {
    const u = await sprawdzStrone('https://x/', 'Apart Sunny', async () => ({ status: 500, tresc: '' }))
    expect(blokujeWysylke(u)).toBe(true)
  })

  // Sieć potrafi paść w środku crona; brak odpowiedzi nie może wywrócić przebiegu.
  it('blokuje, gdy pobranie rzuci wyjątkiem', async () => {
    const u = await sprawdzStrone('https://x/', 'Apart Sunny', () => Promise.reject(new Error('ETIMEDOUT')))
    expect(blokujeWysylke(u)).toBe(true)
    expect(u[0].opis).toContain('ETIMEDOUT')
  })

  // Nazwa bywa rozbita znacznikami, więc jej brak nie może wstrzymywać wysyłki.
  it('brak nazwy w treści to tylko ostrzeżenie', async () => {
    const u = await sprawdzStrone('https://x/', 'Apart Sunny', ok('<h1>Apart <em>Sunny</em></h1>'))
    expect(blokujeWysylke(u)).toBe(false)
    expect(u).toHaveLength(1)
  })
})

describe('podsumowanie', () => {
  it('opisuje brak usterek', () => {
    expect(podsumowanie([])).toBe('bez zastrzeżeń')
  })

  it('składa usterki w jedną linię z oznaczeniem wagi', () => {
    const s = podsumowanie([
      { waga: 'blokujaca', pole: 'photos', opis: 'Zero zdjęć.' },
      { waga: 'ostrzezenie', pole: 'amenities', opis: 'Brak udogodnień.' },
    ])
    expect(s).toBe('✗ photos: Zero zdjęć. | ! amenities: Brak udogodnień.')
  })
})
