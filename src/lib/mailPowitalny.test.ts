import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import fs from 'fs'
import { sendOwnerWelcomeEmail, adresStronyKlienta } from './email'

/**
 * Mail „strona gotowa” — jeden zamiast dwóch sprzecznych (zakup testowy 2026-11-20).
 * Treść przechwytujemy z zapytania do Brevo; nic nie wychodzi do sieci.
 */
let wyslane: { subject: string; htmlContent: string } | null = null

beforeEach(() => {
  vi.stubEnv('BREVO_API_KEY', 'test')
  wyslane = null
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init: RequestInit) => {
    wyslane = JSON.parse(String(init.body)) as { subject: string; htmlContent: string }
    return new Response('{}', { status: 201 })
  }))
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

const PARAMS = {
  email: 'klient@example.com',
  first_name: 'Anna',
  apartment_name: 'Casa <Test>',
  slug: 'casa-test',
  temp_password: 'Hx7kQ2pL9m',
  stripe_onboard_url: 'https://connect.stripe.com/setup/x',
  plan: 'basic' as const,
  revision_url: 'https://nobooking.eu/poprawki/abc',
}

describe('mail powitalny', () => {
  it('linkuje stronę pod subdomeną, a panel pod adresem głównym', async () => {
    await sendOwnerWelcomeEmail(PARAMS)
    const html = wyslane!.htmlContent
    expect(html).toContain('https://casa-test.nobooking.eu')
    expect(html).toContain('/sites/casa-test/admin')
  })

  it('bez subdomeny — adres, który zawsze działa', async () => {
    await sendOwnerWelcomeEmail({ ...PARAMS, na_subdomenie: false })
    expect(wyslane!.htmlContent).not.toContain('casa-test.nobooking.eu')
    expect(wyslane!.htmlContent).toContain('/sites/casa-test')
  })

  it('nie obiecuje rezerwacji przed podłączeniem płatności i zawiera poprawki', async () => {
    await sendOwnerWelcomeEmail(PARAMS)
    const html = wyslane!.htmlContent
    expect(html).not.toMatch(/zaczyna przyjmować rezerwacje/)
    expect(html).toContain('podłącz płatności')
    expect(html).toContain(PARAMS.revision_url)
    expect(html).toContain('Casa &lt;Test&gt;')
    if (process.env.PODGLAD_MAILA) fs.writeFileSync(process.env.PODGLAD_MAILA, html)
  })

  it('bez tokenu poprawek sekcja znika', async () => {
    await sendOwnerWelcomeEmail({ ...PARAMS, revision_url: null })
    expect(wyslane!.htmlContent).not.toContain('Wyślij poprawki')
  })
})

describe('adresStronyKlienta', () => {
  it('subdomena albo ścieżka', () => {
    expect(adresStronyKlienta('x')).toBe('https://x.nobooking.eu')
    expect(adresStronyKlienta('x', false)).toMatch(/\/sites\/x$/)
  })
})
