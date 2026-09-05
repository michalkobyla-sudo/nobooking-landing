import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { requireCron } from './cronAuth'

const ORYGINALNY_SEKRET = process.env.CRON_SECRET

function zadanie(authorization?: string): NextRequest {
  return new NextRequest('https://nobooking.eu/api/cron/provision-sites', {
    headers: authorization ? { authorization } : {},
  })
}

beforeEach(() => {
  process.env.CRON_SECRET = 'sekret-testowy-abc123'
})

afterEach(() => {
  if (ORYGINALNY_SEKRET === undefined) delete process.env.CRON_SECRET
  else process.env.CRON_SECRET = ORYGINALNY_SEKRET
})

describe('requireCron', () => {
  it('przepuszcza żądanie z poprawnym nagłówkiem', () => {
    expect(requireCron(zadanie('Bearer sekret-testowy-abc123'))).toBeNull()
  })

  it('odrzuca błędny sekret', () => {
    expect(requireCron(zadanie('Bearer zly-sekret-abc12'))?.status).toBe(401)
  })

  it('odrzuca brak nagłówka', () => {
    expect(requireCron(zadanie())?.status).toBe(401)
  })

  it('odrzuca nagłówek bez prefiksu Bearer', () => {
    expect(requireCron(zadanie('sekret-testowy-abc123'))?.status).toBe(401)
  })

  // Regresja: trzy z pięciu cronów pomijały sprawdzenie, gdy zmienna nie była
  // ustawiona — brak konfiguracji czynił je publicznymi.
  it('odrzuca, gdy CRON_SECRET nie jest ustawiony', () => {
    delete process.env.CRON_SECRET
    expect(requireCron(zadanie('Bearer cokolwiek'))?.status).toBe(401)
    expect(requireCron(zadanie())?.status).toBe(401)
  })

  it('nie daje się nabrać na literalny "Bearer undefined"', () => {
    delete process.env.CRON_SECRET
    expect(requireCron(zadanie('Bearer undefined'))?.status).toBe(401)
  })

  it('nie rzuca wyjątkiem przy nagłówku innej długości', () => {
    expect(() => requireCron(zadanie('Bearer x'))).not.toThrow()
    expect(requireCron(zadanie('Bearer x'))?.status).toBe(401)
  })
})
