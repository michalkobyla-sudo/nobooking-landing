import { describe, it, expect } from 'vitest'
import { czyPrzekroczono, posprzataj, MAX_KLUCZY, type Wpis } from './rateLimit'

const nowa = () => new Map<string, Wpis>()

describe('czyPrzekroczono', () => {
  it('przepuszcza do limitu, blokuje powyzej', () => {
    const m = nowa()
    for (let i = 0; i < 5; i++) {
      expect(czyPrzekroczono(m, 'ip', 5, 60_000, 1000)).toBe(false)
    }
    expect(czyPrzekroczono(m, 'ip', 5, 60_000, 1000)).toBe(true)
  })

  it('liczy klucze osobno', () => {
    const m = nowa()
    czyPrzekroczono(m, 'a', 1, 60_000, 1000)
    expect(czyPrzekroczono(m, 'a', 1, 60_000, 1000)).toBe(true)
    expect(czyPrzekroczono(m, 'b', 1, 60_000, 1000)).toBe(false)
  })

  it('otwiera nowe okno po wygasnieciu', () => {
    const m = nowa()
    czyPrzekroczono(m, 'ip', 1, 60_000, 1000)
    expect(czyPrzekroczono(m, 'ip', 1, 60_000, 1000)).toBe(true)
    expect(czyPrzekroczono(m, 'ip', 1, 60_000, 61_001)).toBe(false)
  })

  // Blokada nie przedluza okna — inaczej natarczywy klient trzymalby sie
  // zablokowany w nieskonczonosc, odnawiajac kare kazda proba.
  it('blokada nie przedluza okna', () => {
    const m = nowa()
    czyPrzekroczono(m, 'ip', 1, 60_000, 1000)
    czyPrzekroczono(m, 'ip', 1, 60_000, 30_000)
    czyPrzekroczono(m, 'ip', 1, 60_000, 50_000)
    expect(czyPrzekroczono(m, 'ip', 1, 60_000, 61_001)).toBe(false)
  })
})

describe('posprzataj', () => {
  it('usuwa tylko wygasle wpisy', () => {
    const m = nowa()
    m.set('stary', { ile: 1, koniec: 500 })
    m.set('swiezy', { ile: 1, koniec: 5000 })
    expect(posprzataj(m, 1000)).toBe(1)
    expect([...m.keys()]).toEqual(['swiezy'])
  })
})

describe('mapa nie rosnie bez konca', () => {
  // Wczesniej kazdy nowy adres IP zakladal wpis, ktorego nic nie usuwalo.
  // Skan z wielu adresow — czyli to, przed czym limiter ma bronic — wypychal
  // instancje z pamieci.
  it('sprzata wygasle wpisy po osiagnieciu progu', () => {
    const m = nowa()
    for (let i = 0; i < MAX_KLUCZY; i++) m.set('stary' + i, { ile: 1, koniec: 500 })
    expect(m.size).toBe(MAX_KLUCZY)

    czyPrzekroczono(m, 'nowy', 5, 60_000, 1000)
    expect(m.size).toBe(1)
  })

  it('oddaje najstarsze wpisy, gdy wszystkie sa swieze', () => {
    const m = nowa()
    for (let i = 0; i < MAX_KLUCZY; i++) m.set('swiezy' + i, { ile: 1, koniec: 999_000 })

    czyPrzekroczono(m, 'nowy', 5, 60_000, 1000)
    expect(m.size).toBeLessThan(MAX_KLUCZY)
    expect(m.has('nowy')).toBe(true)
    // Usuniete od poczatku, a nie losowo.
    expect(m.has('swiezy0')).toBe(false)
    expect(m.has('swiezy' + (MAX_KLUCZY - 1))).toBe(true)
  })

  it('zwykly ruch nie uruchamia sprzatania', () => {
    const m = nowa()
    for (let i = 0; i < 100; i++) czyPrzekroczono(m, 'ip' + i, 5, 60_000, 1000)
    expect(m.size).toBe(100)
  })
})
