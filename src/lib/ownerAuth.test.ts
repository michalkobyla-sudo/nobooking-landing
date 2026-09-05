import { describe, it, expect, beforeAll } from 'vitest'
import { hashPassword, verifyPassword, createOwnerToken, cookieName } from './ownerAuth'

beforeAll(() => {
  process.env.OWNER_JWT_SECRET = 'test-secret-tylko-do-testow-0123456789abcdef'
})

describe('hashPassword / verifyPassword', () => {
  it('akceptuje poprawne hasło', () => {
    const hash = hashPassword('poprawne-haslo-123')
    expect(verifyPassword('poprawne-haslo-123', hash)).toBe(true)
  })

  it('odrzuca błędne hasło', () => {
    const hash = hashPassword('poprawne-haslo-123')
    expect(verifyPassword('bledne-haslo', hash)).toBe(false)
    expect(verifyPassword('', hash)).toBe(false)
    expect(verifyPassword('poprawne-haslo-12', hash)).toBe(false)
  })

  it('używa losowej soli — dwa hashe tego samego hasła się różnią', () => {
    const a = hashPassword('to-samo-haslo')
    const b = hashPassword('to-samo-haslo')
    expect(a).not.toBe(b)
    expect(verifyPassword('to-samo-haslo', a)).toBe(true)
    expect(verifyPassword('to-samo-haslo', b)).toBe(true)
  })

  it('ma format scrypt:salt:hash', () => {
    const parts = hashPassword('x').split(':')
    expect(parts).toHaveLength(3)
    expect(parts[0]).toBe('scrypt')
  })

  it('odrzuca uszkodzone lub podrobione wpisy zamiast rzucać wyjątkiem', () => {
    for (const zepsute of ['', 'nonsens', 'scrypt:tylko-dwa', 'bcrypt:a:b', 'scrypt::', 'scrypt:a:zzzz']) {
      expect(verifyPassword('cokolwiek', zepsute)).toBe(false)
    }
  })
})

describe('createOwnerToken', () => {
  it('tworzy token w formacie payload.podpis', () => {
    const token = createOwnerToken('site-id-1', 'casa-sol')
    const kropka = token.lastIndexOf('.')
    expect(kropka).toBeGreaterThan(0)

    const payload = JSON.parse(
      Buffer.from(token.slice(0, kropka), 'base64url').toString()
    ) as { siteId: string; slug: string; exp: number }

    expect(payload.siteId).toBe('site-id-1')
    expect(payload.slug).toBe('casa-sol')
    expect(payload.exp).toBeGreaterThan(Math.floor(Date.now() / 1000))
  })

  it('daje różne podpisy dla różnych stron', () => {
    const a = createOwnerToken('site-a', 'casa-sol')
    const b = createOwnerToken('site-b', 'casa-sol')
    expect(a.slice(a.lastIndexOf('.'))).not.toBe(b.slice(b.lastIndexOf('.')))
  })
})

describe('cookieName', () => {
  it('sprowadza slug do znaków bezpiecznych w nazwie cookie', () => {
    expect(cookieName('casa-sol')).toBe('nb_owner_casa_sol')
    expect(cookieName('apart.sunny')).toBe('nb_owner_apart_sunny')
  })
})
