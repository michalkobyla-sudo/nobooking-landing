import { describe, it, expect } from 'vitest'
import {
  sprawdzGalerie, sprawdzWideo, naOsadzenie,
  MAX_ZDJEC, MIN_ZDJEC, MAX_WIDEO, MAX_DL_OPISU, MAX_DL_TYTULU,
} from './galeria'

const zdjecie = (n: number) => ({ url: `https://cdn.example.com/${n}.jpg`, alt: `Zdjecie ${n}` })
const trzy = [zdjecie(1), zdjecie(2), zdjecie(3)]
const film = (n: number) => ({ embedUrl: `https://www.youtube.com/embed/film${n}abc`, title: `Film ${n}` })

describe('sprawdzGalerie', () => {
  it('przyjmuje poprawna galerie', () => {
    const w = sprawdzGalerie(trzy)
    expect(w.ok).toBe(true)
    if (w.ok) expect(w.zdjecia).toEqual(trzy)
  })

  it('odrzuca puste i nie-tablice', () => {
    for (const z of [[], null, undefined, 'https://a.pl/1.jpg', {}]) {
      expect(sprawdzGalerie(z)).toMatchObject({ ok: false, blad: 'brak_zdjec' })
    }
  })

  // Strona z jednym zdjeciem wyglada na niedokonczona, a klient placi za
  // gotowa strone. Ten sam prog pilnuje sprawdzenie provisioningu.
  it('wymaga minimum zdjec', () => {
    expect(sprawdzGalerie([zdjecie(1), zdjecie(2)])).toMatchObject({ ok: false, blad: 'brak_zdjec' })
    expect(sprawdzGalerie(trzy).ok).toBe(true)
    expect(MIN_ZDJEC).toBe(3)
  })

  // Wlasciciel kasuje zastepcze z Unsplasha i zapisuje, zanim wklei swoje.
  // Blokada w tym momencie kazalaby mu trzymac cudze zdjecia na stronie.
  it('pozwala na mniej zdjec, gdy o to poprosimy', () => {
    expect(sprawdzGalerie([zdjecie(1)], { pozwolMalo: true }).ok).toBe(true)
    // Ale zero nadal nie: galeria bez zdjec to zepsuta strona glowna.
    expect(sprawdzGalerie([], { pozwolMalo: true })).toMatchObject({ ok: false, blad: 'brak_zdjec' })
  })

  it('odrzuca galerie dluzsza niz limit', () => {
    const duzo = Array.from({ length: MAX_ZDJEC + 1 }, (_, i) => zdjecie(i))
    expect(sprawdzGalerie(duzo)).toMatchObject({ ok: false, blad: 'za_duzo_zdjec' })
    expect(sprawdzGalerie(duzo.slice(0, MAX_ZDJEC)).ok).toBe(true)
  })

  // Adres wzgledny albo data: da pusty kafelek — galeria sie nie wywali,
  // tylko bedzie wygladac na zepsuta, czego nikt nie zglosi.
  it('wymaga pelnego adresu https i mowi, ktore zdjecie jest zle', () => {
    expect(sprawdzGalerie([zdjecie(1), { url: '/zdjecia/salon.jpg' }, zdjecie(3)]))
      .toMatchObject({ ok: false, blad: 'zly_adres', pozycja: 1 })

    for (const url of ['http://cdn.example.com/1.jpg', 'data:image/png;base64,AAA', 'cdn.example.com/1.jpg', '']) {
      expect(sprawdzGalerie([{ url }, zdjecie(2), zdjecie(3)])).toMatchObject({ ok: false, blad: 'zly_adres' })
    }
  })

  it('nie wywraca sie na smieciach w tablicy', () => {
    expect(sprawdzGalerie([null, zdjecie(2), zdjecie(3)])).toMatchObject({ ok: false, blad: 'zly_adres', pozycja: 0 })
    expect(sprawdzGalerie([42, 'x', true])).toMatchObject({ ok: false, blad: 'zly_adres' })
  })

  it('przyjmuje brak opisu, ale go nie wymysla', () => {
    const w = sprawdzGalerie([{ url: 'https://cdn.example.com/1.jpg' }, zdjecie(2), zdjecie(3)])
    expect(w.ok).toBe(true)
    if (w.ok) expect(w.zdjecia[0].alt).toBe('')
  })

  it('przycina opis i skleja znaki sterujace', () => {
    const w = sprawdzGalerie([{ url: 'https://cdn.example.com/1.jpg', alt: '  Salon\nz widokiem  ' }, zdjecie(2), zdjecie(3)])
    if (w.ok) expect(w.zdjecia[0].alt).toBe('Salon z widokiem')

    const dlugi = sprawdzGalerie([{ url: 'https://cdn.example.com/1.jpg', alt: 'a'.repeat(500) }, zdjecie(2), zdjecie(3)])
    if (dlugi.ok) expect(dlugi.zdjecia[0].alt).toHaveLength(MAX_DL_OPISU)
  })

  // Pole `videoUrl` istnieje w typie ApartmentPhoto, ale zadna strona go nie
  // renderuje. Przyjmowanie go byloby obiecywaniem funkcji, ktorej nie ma.
  it('nie przepuszcza pola, ktorego strona nie renderuje', () => {
    const w = sprawdzGalerie([{ ...zdjecie(1), videoUrl: 'https://www.youtube.com/embed/abc123' }, zdjecie(2), zdjecie(3)])
    expect(w.ok).toBe(true)
    if (w.ok) expect(w.zdjecia[0]).not.toHaveProperty('videoUrl')
  })
})

describe('sprawdzWideo', () => {
  it('przyjmuje liste filmow', () => {
    const w = sprawdzWideo([film(1), film(2)])
    expect(w.ok).toBe(true)
    if (w.ok) expect(w.wideo).toHaveLength(2)
  })

  // Brak filmow to poprawny stan: sekcja wideo po prostu sie nie pokazuje
  // (`if (!videos || videos.length === 0) return null`).
  it('pusta lista jest poprawna', () => {
    expect(sprawdzWideo([])).toMatchObject({ ok: true, wideo: [] })
    expect(sprawdzWideo(null)).toMatchObject({ ok: true, wideo: [] })
  })

  it('odrzuca liste dluzsza niz limit', () => {
    const duzo = Array.from({ length: MAX_WIDEO + 1 }, (_, i) => film(i))
    expect(sprawdzWideo(duzo)).toMatchObject({ ok: false, blad: 'za_duzo_wideo' })
  })

  // ApartmentPage czyta t(video.title, lang) dla kazdego jezyka osobno —
  // niepelne pole pokazaloby czesci gosci puste miejsce na kaflu.
  it('wypelnia tytul we wszystkich czterech jezykach', () => {
    const w = sprawdzWideo([{ embedUrl: 'https://youtu.be/dQw4w9WgXcQ', title: 'Spacer po apartamencie' }])
    expect(w.ok).toBe(true)
    if (w.ok) expect(w.wideo[0].title).toEqual({
      pl: 'Spacer po apartamencie', en: 'Spacer po apartamencie',
      es: 'Spacer po apartamencie', de: 'Spacer po apartamencie',
    })
  })

  it('przyjmuje tytul juz rozbity na jezyki', () => {
    const w = sprawdzWideo([{ embedUrl: 'https://youtu.be/dQw4w9WgXcQ', title: { pl: 'Taras', en: 'Terrace', es: 'x', de: 'y' } }])
    if (w.ok) expect(w.wideo[0].title.pl).toBe('Taras')
  })

  // Kafel bez tytulu to czarny prostokat z trojkatem.
  it('wymaga tytulu', () => {
    expect(sprawdzWideo([{ embedUrl: 'https://youtu.be/dQw4w9WgXcQ' }]))
      .toMatchObject({ ok: false, blad: 'brak_tytulu', pozycja: 0 })
    expect(sprawdzWideo([film(1), { embedUrl: 'https://youtu.be/dQw4w9WgXcQ', title: '   ' }]))
      .toMatchObject({ ok: false, blad: 'brak_tytulu', pozycja: 1 })
  })

  it('przycina dlugi tytul', () => {
    const w = sprawdzWideo([{ embedUrl: 'https://youtu.be/dQw4w9WgXcQ', title: 'a'.repeat(200) }])
    if (w.ok) expect(w.wideo[0].title.pl).toHaveLength(MAX_DL_TYTULU)
  })

  it('odrzuca adresy, ktore nie sa filmem z YouTube', () => {
    for (const embedUrl of ['https://vimeo.com/123', 'https://example.com/film.mp4', '', 'https://www.youtube.com/']) {
      expect(sprawdzWideo([{ embedUrl, title: 'Film' }]))
        .toMatchObject({ ok: false, blad: 'zly_adres_wideo', pozycja: 0 })
    }
  })

  it('normalizuje adres wklejony z paska przegladarki', () => {
    const w = sprawdzWideo([{ embedUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', title: 'Film' }])
    if (w.ok) expect(w.wideo[0].embedUrl).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ')
  })

  it('miniatura jest opcjonalna, ale musi byc pelnym adresem', () => {
    const bez = sprawdzWideo([film(1)])
    if (bez.ok) expect(bez.wideo[0]).not.toHaveProperty('thumbnail')

    const z = sprawdzWideo([{ ...film(1), thumbnail: 'https://cdn.example.com/m.jpg' }])
    if (z.ok) expect(z.wideo[0].thumbnail).toBe('https://cdn.example.com/m.jpg')

    expect(sprawdzWideo([{ ...film(1), thumbnail: '/m.jpg' }]))
      .toMatchObject({ ok: false, blad: 'zly_adres', pozycja: 0 })
  })
})

describe('naOsadzenie', () => {
  it('rozumie wszystkie postacie adresu YouTube', () => {
    const cel = 'https://www.youtube.com/embed/dQw4w9WgXcQ'
    for (const a of [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtube.com/watch?v=dQw4w9WgXcQ',
      'https://m.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ',
      'https://www.youtube.com/shorts/dQw4w9WgXcQ',
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ',
    ]) {
      expect(naOsadzenie(a)).toBe(cel)
    }
  })

  // Adres z listy odtwarzania ma v= za innymi parametrami.
  it('znajduje identyfikator za innymi parametrami', () => {
    expect(naOsadzenie('https://www.youtube.com/watch?list=PL123&v=dQw4w9WgXcQ&t=10'))
      .toBe('https://www.youtube.com/embed/dQw4w9WgXcQ')
  })

  // ApartmentPage sklada zrodlo ramki jako `${embedUrl}?autoplay=1`, wiec adres
  // z wlasnym zapytaniem dalby dwa znaki zapytania i film by nie wstal.
  it('obcina zapytanie i kotwice', () => {
    expect(naOsadzenie('https://youtu.be/dQw4w9WgXcQ?si=AbCdEf')).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ')
    expect(naOsadzenie('https://www.youtube.com/embed/dQw4w9WgXcQ?start=30&rel=0')).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ')
    expect(naOsadzenie('https://www.youtube.com/watch?v=dQw4w9WgXcQ#t=5')).toBe('https://www.youtube.com/embed/dQw4w9WgXcQ')
  })

  it('zwraca pusty ciag dla tego, czego nie rozumie', () => {
    for (const a of ['', 'https://vimeo.com/123', 'dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=', 'https://example.com/youtube.com/watch?v=abc123']) {
      expect(naOsadzenie(a)).toBe('')
    }
  })
})
