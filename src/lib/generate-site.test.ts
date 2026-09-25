import { describe, it, expect } from 'vitest'
import { toSlug, FALLBACK_SLUG } from './generate-site'

describe('toSlug', () => {
  it('zamienia nazwę na slug w kebab-case', () => {
    expect(toSlug('Casa Sol')).toBe('casa-sol')
    expect(toSlug('Apart Sunny 2')).toBe('apart-sunny-2')
  })

  it('usuwa polskie znaki diakrytyczne', () => {
    expect(toSlug('Słoneczny Zakątek')).toBe('sloneczny-zakatek')
    expect(toSlug('Łódź Mieszkanie')).toBe('lodz-mieszkanie')
  })

  it('usuwa hiszpańskie znaki diakrytyczne', () => {
    expect(toSlug('Apartamento Málaga')).toBe('apartamento-malaga')
    expect(toSlug('Niño Sol')).toBe('nino-sol')
  })

  it('zwija wielokrotne spacje i myślniki', () => {
    expect(toSlug('Casa    Sol')).toBe('casa-sol')
    expect(toSlug('Casa --- Sol')).toBe('casa-sol')
  })

  it('nie zostawia myślnika na początku ani końcu', () => {
    expect(toSlug('  Casa Sol  ')).toBe('casa-sol')
    expect(toSlug('!!! Casa Sol !!!')).toBe('casa-sol')
    expect(toSlug('- Casa -')).toBe('casa')
  })

  it('przycina do 60 znaków bez końcowego myślnika', () => {
    const slug = toSlug('a'.repeat(80))
    expect(slug.length).toBeLessThanOrEqual(60)
    expect(slug.endsWith('-')).toBe(false)
  })

  // Regresja: nazwy bez znaków łacińskich dawały pusty slug, a wtedy każde
  // takie zamówienie lądowało pod tym samym adresem.
  it('nie zwraca pustego slugu dla nazw bez znaków łacińskich', () => {
    expect(toSlug('Дом у моря')).toBe(FALLBACK_SLUG)
    expect(toSlug('海景公寓')).toBe(FALLBACK_SLUG)
    expect(toSlug('🏖️🌞')).toBe(FALLBACK_SLUG)
    expect(toSlug('   ')).toBe(FALLBACK_SLUG)
    expect(toSlug('')).toBe(FALLBACK_SLUG)
  })

  it('zawsze zwraca slug bezpieczny w URL-u', () => {
    const nazwy = [
      'Casa Sol & Mar', 'Apartament #1', 'Dom "Pod Sosnami"',
      'Café del Mar', '../etc/passwd', 'a/b/c', 'Дом', '',
    ]
    for (const nazwa of nazwy) {
      expect(toSlug(nazwa)).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    }
  })
})
