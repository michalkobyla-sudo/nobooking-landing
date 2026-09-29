import { describe, it, expect } from 'vitest'
import { sprawdzNowyKod, znormalizujKod, MIN_DL_KODU, MAX_DL_KODU } from './discountCodes'

const DZIS = '2026-09-29'
const ok = (w: Parameters<typeof sprawdzNowyKod>[0]) => sprawdzNowyKod(w, DZIS)

describe('znormalizujKod', () => {
  // Realizacja porównuje `code.trim().toUpperCase()`, więc zapis musi dawać
  // dokładnie tę samą postać — inaczej powstałby kod, którego nie da się użyć.
  it('sprowadza do postaci używanej przy realizacji', () => {
    expect(znormalizujKod('  lato10 ')).toBe('LATO10')
    expect(znormalizujKod('lato 10')).toBe('LATO10')
    expect(znormalizujKod('Lato-10')).toBe('LATO-10')
  })

  it('nie wywraca się na braku wartości', () => {
    expect(znormalizujKod(undefined as unknown as string)).toBe('')
  })
})

describe('sprawdzNowyKod — kod', () => {
  it('przyjmuje poprawny kod', () => {
    const w = ok({ code: 'lato10', discount_pct: 10 })
    expect(w.ok).toBe(true)
    if (w.ok) expect(w.kod).toEqual({ code: 'LATO10', discount_pct: 10, max_uses: null, valid_until: null })
  })

  it('odrzuca zbyt krótki i zbyt długi', () => {
    expect(ok({ code: 'AB', discount_pct: 10 })).toMatchObject({ blad: 'zly_kod' })
    expect(ok({ code: 'A'.repeat(MAX_DL_KODU + 1), discount_pct: 10 })).toMatchObject({ blad: 'zly_kod' })
    expect(ok({ code: 'A'.repeat(MIN_DL_KODU), discount_pct: 10 }).ok).toBe(true)
  })

  // Gość przepisuje kod z SMS-a albo ulotki — „ł" i „l" są wtedy nie do odróżnienia.
  it('odrzuca polskie znaki i spacje wewnętrzne po normalizacji', () => {
    expect(ok({ code: 'ŁATWY10', discount_pct: 10 })).toMatchObject({ blad: 'zly_kod' })
    expect(ok({ code: 'LATO!10', discount_pct: 10 })).toMatchObject({ blad: 'zly_kod' })
  })

  it('odrzuca pusty i brakujący', () => {
    for (const c of ['', '   ', null, undefined]) {
      expect(ok({ code: c, discount_pct: 10 })).toMatchObject({ blad: 'zly_kod' })
    }
  })
})

describe('sprawdzNowyKod — procent', () => {
  it('przyjmuje 1–100', () => {
    expect(ok({ code: 'ABC', discount_pct: 1 }).ok).toBe(true)
    expect(ok({ code: 'ABC', discount_pct: 100 }).ok).toBe(true)
  })

  // Zero nie jest rabatem, wartości ujemne podniosłyby cenę, ponad 100
  // dałoby kwotę ujemną — Stripe odrzuciłby sesję.
  it('odrzuca zero, ujemne, ponad 100 i ułamki', () => {
    for (const p of [0, -5, 101, 10.5, Number.NaN, 'dużo']) {
      expect(ok({ code: 'ABC', discount_pct: p })).toMatchObject({ blad: 'zly_procent' })
    }
  })
})

describe('sprawdzNowyKod — limit użyć', () => {
  it('brak limitu to poprawny wybór', () => {
    for (const m of [null, undefined, '']) {
      const w = ok({ code: 'ABC', discount_pct: 10, max_uses: m })
      expect(w.ok).toBe(true)
      if (w.ok) expect(w.kod.max_uses).toBeNull()
    }
  })

  it('przyjmuje dodatnią liczbę całkowitą', () => {
    const w = ok({ code: 'ABC', discount_pct: 10, max_uses: 5 })
    if (w.ok) expect(w.kod.max_uses).toBe(5)
  })

  // Kod z limitem zero nie zadziałałby ani razu — to zawsze pomyłka.
  it('odrzuca zero, ujemne i ułamki', () => {
    for (const m of [0, -1, 2.5]) {
      expect(ok({ code: 'ABC', discount_pct: 10, max_uses: m })).toMatchObject({ blad: 'zly_limit' })
    }
  })
})

describe('sprawdzNowyKod — ważność', () => {
  it('brak daty oznacza bezterminowy', () => {
    const w = ok({ code: 'ABC', discount_pct: 10, valid_until: '' })
    if (w.ok) expect(w.kod.valid_until).toBeNull()
  })

  it('przyjmuje dzisiejszą i przyszłą datę', () => {
    expect(ok({ code: 'ABC', discount_pct: 10, valid_until: DZIS }).ok).toBe(true)
    expect(ok({ code: 'ABC', discount_pct: 10, valid_until: '2027-01-01' }).ok).toBe(true)
  })

  it('odrzuca datę z przeszłości i zły format', () => {
    expect(ok({ code: 'ABC', discount_pct: 10, valid_until: '2026-09-28' })).toMatchObject({ blad: 'zla_data' })
    expect(ok({ code: 'ABC', discount_pct: 10, valid_until: '28-09-2026' })).toMatchObject({ blad: 'zla_data' })
  })
})
