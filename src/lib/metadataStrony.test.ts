import { describe, it, expect } from 'vitest'
import { metadaneApartamentu, wJezyku, skroc, poprawnyJezyk } from './metadataStrony'
import type { ApartmentConfig, T } from './apartmentTypes'

const tekst = (pl: string, en = '', es = '', de = ''): T => ({ pl, en, es, de })

const config = {
  name: 'Apart Sunny',
  location: 'Torrevieja, Alicante, Hiszpania',
  description: tekst('Nowoczesny apartament 200 m od plaży.', 'Modern flat 200 m from the beach.'),
  tagline: tekst('Twój azyl przy morzu', 'Your seaside hideaway'),
  photos: [{ url: 'https://example.com/1.jpg', alt: 'Salon' }],
} as unknown as ApartmentConfig

describe('metadaneApartamentu', () => {
  it('tytuł to nazwa i miejscowość, nie nazwa Nobookinga', () => {
    const m = metadaneApartamentu(config, 'pl')
    expect(m.title).toBe('Apart Sunny — Torrevieja, Alicante, Hiszpania')
    expect(m.title).not.toContain('Nobooking')
  })

  it('opis i język idą za wybranym językiem', () => {
    expect(metadaneApartamentu(config, 'en').description).toBe('Modern flat 200 m from the beach.')
    expect(metadaneApartamentu(config, 'en').locale).toBe('en_GB')
    expect(metadaneApartamentu(config, 'de').locale).toBe('de_DE')
  })

  it('bierze pierwsze zdjęcie na podgląd linku', () => {
    expect(metadaneApartamentu(config, 'pl').obrazek).toBe('https://example.com/1.jpg')
  })

  it('pomija puste adresy zdjęć zamiast oddawać pusty podgląd', () => {
    const c = { ...config, photos: [{ url: '  ', alt: '' }, { url: 'https://example.com/2.jpg', alt: '' }] } as unknown as ApartmentConfig
    expect(metadaneApartamentu(c, 'pl').obrazek).toBe('https://example.com/2.jpg')
  })

  it('bez zdjęć nie wymyśla obrazka', () => {
    const c = { ...config, photos: [] } as unknown as ApartmentConfig
    expect(metadaneApartamentu(c, 'pl').obrazek).toBeNull()
  })

  // Konfiguracje bywają uzupełnione częściowo — brak opisu ma dać gorszą
  // zapowiedź, a nie pustą.
  it('bez opisu spada na hasło', () => {
    const c = { ...config, description: tekst('') } as unknown as ApartmentConfig
    expect(metadaneApartamentu(c, 'pl').description).toBe('Twój azyl przy morzu')
  })

  it('bez nazwy i miejscowości nadal daje sensowny tytuł', () => {
    const c = { ...config, name: '', location: '' } as unknown as ApartmentConfig
    expect(metadaneApartamentu(c, 'pl').title).toBe('Apartament')
  })
})

describe('wJezyku', () => {
  it('schodzi na polski, gdy brakuje tłumaczenia', () => {
    expect(wJezyku(tekst('Polski'), 'es')).toBe('Polski')
  })

  it('schodzi na pierwszy niepusty, gdy brakuje i polskiego', () => {
    expect(wJezyku(tekst('', '', 'Español'), 'de')).toBe('Español')
  })

  it('pusty tekst daje pusty ciąg, nie wyjątek', () => {
    expect(wJezyku(undefined, 'pl')).toBe('')
    expect(wJezyku(tekst(''), 'pl')).toBe('')
  })
})

describe('skroc', () => {
  it('nie rusza krótkiego tekstu', () => {
    expect(skroc('Krótko.')).toBe('Krótko.')
  })

  it('tnie na granicy słowa', () => {
    const dlugi = 'Apartament ' + 'bardzo '.repeat(40) + 'ładny.'
    const w = skroc(dlugi)
    expect(w.length).toBeLessThanOrEqual(160)
    expect(w.endsWith('…')).toBe(true)
    expect(w).not.toMatch(/bard…$/)
  })

  it('zbija białe znaki, bo opis bywa łamany w panelu', () => {
    expect(skroc('Dwa\n\n  wiersze')).toBe('Dwa wiersze')
  })
})

describe('poprawnyJezyk', () => {
  it('przepuszcza znane języki', () => {
    expect(poprawnyJezyk('es')).toBe('es')
  })

  // Parametr pochodzi z adresu, więc może być czymkolwiek.
  it('wszystko inne to polski', () => {
    expect(poprawnyJezyk('kl')).toBe('pl')
    expect(poprawnyJezyk(undefined)).toBe('pl')
    expect(poprawnyJezyk(['en'])).toBe('pl')
  })
})
