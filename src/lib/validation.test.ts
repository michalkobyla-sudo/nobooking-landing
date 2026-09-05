import { describe, it, expect } from 'vitest'
import { isValidEmail, toBoundedNumber, LIMITY_CENNIKA } from './validation'

describe('isValidEmail', () => {
  it('akceptuje poprawne adresy', () => {
    for (const email of ['a@b.pl', 'michal.kobyla@gmail.com', 'owner+tag@sub.domain.co.uk']) {
      expect(isValidEmail(email)).toBe(true)
    }
  })

  it('odrzuca niepoprawne', () => {
    for (const email of ['', 'bez-malpy', 'a@b', 'a@@b.pl', 'a b@c.pl', '@b.pl', 'a@.pl']) {
      expect(isValidEmail(email)).toBe(false)
    }
  })

  it('ignoruje otaczające spacje', () => {
    expect(isValidEmail('  a@b.pl  ')).toBe(true)
  })
})

describe('toBoundedNumber', () => {
  const zakres = { min: 0, max: 100 }

  it('przepuszcza liczby w zakresie', () => {
    expect(toBoundedNumber(50, zakres)).toBe(50)
    expect(toBoundedNumber('50', zakres)).toBe(50)
    expect(toBoundedNumber(0, zakres)).toBe(0)
    expect(toBoundedNumber(100, zakres)).toBe(100)
  })

  it('odrzuca wartości spoza zakresu', () => {
    expect(toBoundedNumber(-1, zakres)).toBeNull()
    expect(toBoundedNumber(101, zakres)).toBeNull()
  })

  // Regresja: Number() przepuszczało te wartości do cennika. NaN zapisany
  // w jsonb staje się null i wywracał kalkulację ceny rezerwacji.
  it('odrzuca NaN, Infinity i tekst', () => {
    expect(toBoundedNumber('abc', zakres)).toBeNull()
    expect(toBoundedNumber(NaN, zakres)).toBeNull()
    expect(toBoundedNumber(Infinity, zakres)).toBeNull()
    expect(toBoundedNumber('1e999', zakres)).toBeNull()
    expect(toBoundedNumber({}, zakres)).toBeNull()
    expect(toBoundedNumber([1, 2], zakres)).toBeNull()
  })

  it('odrzuca puste i brakujące wartości zamiast zamieniać je na 0', () => {
    expect(toBoundedNumber('', zakres)).toBeNull()
    expect(toBoundedNumber(null, zakres)).toBeNull()
    expect(toBoundedNumber(undefined, zakres)).toBeNull()
  })

  it('nie dopuszcza ceny ujemnej ani zerowej liczby nocy', () => {
    expect(toBoundedNumber(-10, LIMITY_CENNIKA.pricePerNight)).toBeNull()
    expect(toBoundedNumber(0, LIMITY_CENNIKA.minNights)).toBeNull()
    expect(toBoundedNumber(1, LIMITY_CENNIKA.minNights)).toBe(1)
    expect(toBoundedNumber(-1, LIMITY_CENNIKA.cleaningFee)).toBeNull()
  })
})
