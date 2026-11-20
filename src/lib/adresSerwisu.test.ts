import { describe, it, expect } from 'vitest'
import { adresSerwisu, domenaGlowna } from './adresSerwisu'

describe('adresSerwisu', () => {
  it('obcina znak nowej linii z wartości w Vercelu i końcowe ukośniki', () => {
    expect(adresSerwisu('https://nobooking.eu\n')).toBe('https://nobooking.eu')
    expect(adresSerwisu(' https://nobooking.eu// ')).toBe('https://nobooking.eu')
  })
  it('bez zmiennej — adres produkcyjny', () => {
    expect(adresSerwisu(undefined)).toBe('https://nobooking.eu')
    expect(adresSerwisu('')).toBe('https://nobooking.eu')
  })
  it('domena główna', () => {
    expect(domenaGlowna('nobooking.eu\n')).toBe('nobooking.eu')
    expect(domenaGlowna(undefined)).toBe('nobooking.eu')
  })
})
