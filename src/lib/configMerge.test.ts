import { describe, it, expect } from 'vitest'
import { scalPoRegeneracji, parsujConfig, POLA_WLASCICIELA } from './configMerge'

const cennik = (cena: number) => ({ currency: 'EUR', cleaningFee: 60, tiers: { high: { pricePerNight: cena } } })

const wygenerowany = { name: 'Apart Sunny', description: 'stary', pricing: cennik(100), contact: { email: 'a@x.pl' } }

describe('scalPoRegeneracji', () => {
  it('bez istniejącej strony bierze nowy config w całości', () => {
    const w = scalPoRegeneracji({ name: 'Nowy' }, null, wygenerowany)
    expect(w.config).toEqual({ name: 'Nowy' })
    expect(w.zachowane).toEqual([])
  })

  it('gdy właściciel niczego nie ruszał, bierze nowy config', () => {
    const nowy = { ...wygenerowany, description: 'nowy opis', pricing: cennik(120) }
    const w = scalPoRegeneracji(nowy, { ...wygenerowany }, wygenerowany)
    expect(w.config.description).toBe('nowy opis')
    expect(w.config.pricing).toEqual(cennik(120))
    expect(w.zachowane).toEqual([])
  })

  /**
   * Sedno: to są kwoty pobierane od gości. Cichy powrót do cen z onboardingu
   * jest gorszy niż zignorowanie prośby o zmianę ceny w treści poprawek —
   * tę właściciel wyklika w panelu w dziesięć sekund.
   */
  it('zachowuje ceny zmienione przez właściciela', () => {
    const biezacy = { ...wygenerowany, pricing: cennik(180) }
    const nowy = { ...wygenerowany, description: 'nowy opis', pricing: cennik(100) }

    const w = scalPoRegeneracji(nowy, biezacy, wygenerowany)
    expect(w.config.pricing).toEqual(cennik(180))
    expect(w.zachowane).toEqual(['pricing'])
    // Reszta strony ma się zaktualizować normalnie.
    expect(w.config.description).toBe('nowy opis')
  })

  it('zachowuje zmieniony kontakt', () => {
    const biezacy = { ...wygenerowany, contact: { email: 'nowy@x.pl', phone: '+48 500 100 200' } }
    const w = scalPoRegeneracji({ ...wygenerowany, description: 'x' }, biezacy, wygenerowany)
    expect(w.config.contact).toEqual({ email: 'nowy@x.pl', phone: '+48 500 100 200' })
    expect(w.zachowane).toEqual(['contact'])
  })

  it('zachowuje kilka gałęzi naraz', () => {
    const biezacy = { ...wygenerowany, pricing: cennik(180), contact: { email: 'z@x.pl' } }
    const w = scalPoRegeneracji(wygenerowany, biezacy, wygenerowany)
    // Zachowane mają być dokładnie te zmienione — nie cała lista chronionych.
    expect(w.zachowane.sort()).toEqual(['contact', 'pricing'])
    expect(POLA_WLASCICIELA).toContain('pricing')
    expect(POLA_WLASCICIELA).toContain('contact')
  })

  // Bez poprzedniej wersji nie da się odróżnić edycji właściciela od tego, co
  // model wygenerował ostatnio — wybieramy stronę ostrożniejszą.
  it('bez poprzedniej wersji zachowuje stan bieżący', () => {
    const biezacy = { ...wygenerowany, pricing: cennik(180) }
    const w = scalPoRegeneracji({ ...wygenerowany, pricing: cennik(100) }, biezacy, null)
    expect(w.config.pricing).toEqual(cennik(180))
  })

  it('nie myli braku pola ze zmianą', () => {
    const biezacy = { name: 'Apart Sunny' } // bez pricing i contact
    const w = scalPoRegeneracji(wygenerowany, biezacy, wygenerowany)
    expect(w.config.pricing).toEqual(cennik(100))
    expect(w.zachowane).toEqual([])
  })

  it('nie modyfikuje przekazanych obiektów', () => {
    const nowy = { ...wygenerowany }
    const biezacy = { ...wygenerowany, pricing: cennik(180) }
    scalPoRegeneracji(nowy, biezacy, wygenerowany)
    expect(nowy.pricing).toEqual(cennik(100))
  })
})

describe('parsujConfig', () => {
  it('przyjmuje obiekt i tekst JSON', () => {
    expect(parsujConfig({ a: 1 })).toEqual({ a: 1 })
    expect(parsujConfig('{"a":1}')).toEqual({ a: 1 })
  })

  it('zwraca null dla wszystkiego, co nie jest configiem', () => {
    for (const w of [null, undefined, '', 'nie json', '[1,2]', '"tekst"', '5', [1, 2], 7]) {
      expect(parsujConfig(w)).toBeNull()
    }
  })
})

describe('scalPoRegeneracji — dwie rundy poprawek', () => {
  /**
   * Punktem odniesienia musi być config **wygenerowany**, nie scalony.
   * Gdyby zapisywać scalony, przy drugiej rundzie zmiana właściciela zrównałaby
   * się z punktem odniesienia, wyglądała na brak zmiany i zostałaby cofnięta —
   * czyli ceny wróciłyby do wartości z onboardingu przy drugiej poprawce.
   */
  it('zachowuje ceny właściciela także przy drugiej rundzie', () => {
    const generowany = wygenerowany                       // model zawsze daje to samo
    const poOwnerze = { ...wygenerowany, pricing: cennik(180) }

    const runda1 = scalPoRegeneracji(generowany, poOwnerze, generowany)
    expect(runda1.config.pricing).toEqual(cennik(180))

    // Punkt odniesienia = config wygenerowany, a na stronie stoi wynik scalenia.
    const runda2 = scalPoRegeneracji(generowany, runda1.config, generowany)
    expect(runda2.config.pricing).toEqual(cennik(180))
  })

  it('zapisanie scalonego jako punktu odniesienia cofnęłoby ceny — dowód', () => {
    const generowany = wygenerowany
    const poOwnerze = { ...wygenerowany, pricing: cennik(180) }

    const runda1 = scalPoRegeneracji(generowany, poOwnerze, generowany)
    // Błędny wariant: punktem odniesienia jest config scalony.
    const zly = scalPoRegeneracji(generowany, runda1.config, runda1.config)
    expect(zly.config.pricing).toEqual(cennik(100))
  })
})

describe('scalPoRegeneracji — zdjecia i wideo', () => {
  const zastepcze = [{ url: 'https://unsplash/1.jpg', alt: 'Apartament' }]
  const prawdziwe = [
    { url: 'https://klient/salon.jpg', alt: 'Salon' },
    { url: 'https://klient/taras.jpg', alt: 'Taras', videoUrl: 'https://youtube.com/embed/x' },
  ]

  /**
   * Generator wstawia te same zdjecia zastepcze przy KAZDEJ generacji, bo model
   * nie potrafi wytworzyc prawdziwych. Bez ochrony pierwsza poprawka klienta
   * cofalaby zdjecia apartamentu do stockowych z Unsplasha.
   */
  it('nie cofa prawdziwych zdjec do zastepczych', () => {
    const generowany = { ...wygenerowany, photos: zastepcze }
    const naStronie = { ...wygenerowany, photos: prawdziwe }

    const w = scalPoRegeneracji(generowany, naStronie, generowany)
    expect(w.config.photos).toEqual(prawdziwe)
    expect(w.zachowane).toContain('photos')
  })

  it('przepuszcza zastepcze, gdy nikt zdjec nie podmienil', () => {
    const generowany = { ...wygenerowany, photos: zastepcze }
    const w = scalPoRegeneracji(generowany, { ...generowany }, generowany)
    expect(w.config.photos).toEqual(zastepcze)
    expect(w.zachowane).not.toContain('photos')
  })

  it('chroni wideo, ktorego generator nie produkuje wcale', () => {
    const wideo = [{ url: 'https://youtube.com/embed/abc', title: 'Spacer' }]
    const w = scalPoRegeneracji(wygenerowany, { ...wygenerowany, videos: wideo }, wygenerowany)
    expect(w.config.videos).toEqual(wideo)
  })
})
