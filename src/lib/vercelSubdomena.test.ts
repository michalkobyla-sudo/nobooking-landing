import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { dodajSubdomene, sprawdzTokenVercel } from './vercelSubdomena'

const odp = (status: number, body: unknown) => new Response(JSON.stringify(body), { status })

describe('dodajSubdomene', () => {
  beforeEach(() => { vi.stubEnv('VERCEL_API_TOKEN', 'tok') })
  afterEach(() => { vi.unstubAllEnvs() })

  it('wysyła nazwę slug.nobooking.eu do projektu, z tokenem i zespołem', async () => {
    const pobierz = vi.fn(async () => odp(200, { name: 'casa-sol.nobooking.eu', verified: true }))
    expect(await dodajSubdomene('casa-sol', pobierz)).toEqual({ ok: true })
    const [url, init] = pobierz.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toMatch(/^https:\/\/api\.vercel\.com\/v10\/projects\/prj_[\w]+\/domains\?teamId=team_\w+$/)
    expect(JSON.parse(String(init.body))).toEqual({ name: 'casa-sol.nobooking.eu' })
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok')
  })

  // Provisioning bywa ponawiany — druga próba nie może być awarią.
  it('subdomena już w naszym projekcie to sukces', async () => {
    const pobierz = vi.fn()
      .mockResolvedValueOnce(odp(400, { error: { code: 'domain_already_in_use', message: 'The domain already exists on the project' } }))
      .mockResolvedValueOnce(odp(200, { name: 'casa-sol.nobooking.eu' }))
    expect(await dodajSubdomene('casa-sol', pobierz)).toEqual({ ok: true })
    expect(String(pobierz.mock.calls[1][0])).toContain('/v9/projects/prj_')
  })

  // Ten sam tekst „already” przy domenie w cudzym projekcie — to awaria.
  it('subdomena w innym projekcie to błąd', async () => {
    const pobierz = vi.fn()
      .mockResolvedValueOnce(odp(409, { error: { code: 'domain_already_in_use', message: 'The domain is already assigned to another Vercel project' } }))
      .mockResolvedValueOnce(odp(404, { error: { code: 'not_found' } }))
    expect(await dodajSubdomene('casa-sol', pobierz)).toEqual({ ok: false, powod: 'http_409_domain_already_in_use' })
  })

  it('inny błąd zwraca powód', async () => {
    const pobierz = vi.fn(async () => odp(403, { error: { code: 'forbidden', message: 'nope' } }))
    expect(await dodajSubdomene('casa-sol', pobierz)).toEqual({ ok: false, powod: 'http_403_forbidden' })
  })

  it('bez tokenu nic nie wysyła', async () => {
    vi.stubEnv('VERCEL_API_TOKEN', '')
    const pobierz = vi.fn()
    expect(await dodajSubdomene('casa-sol', pobierz)).toEqual({ ok: false, powod: 'brak_tokenu' })
    expect(pobierz).not.toHaveBeenCalled()
  })

  // Apartament nazwany „WWW” albo „Admin” nie może zająć adresu, który
  // znaczy co innego.
  it('nazwy zarezerwowane i niepoprawne odpadają bez wysyłki', async () => {
    const pobierz = vi.fn()
    for (const s of ['www', 'demo', 'api', 'admin', 'mail', 'Casa Sol', '', '-x']) {
      expect((await dodajSubdomene(s, pobierz)).ok).toBe(false)
    }
    expect(pobierz).not.toHaveBeenCalled()
  })

  it('błąd sieci nie rzuca', async () => {
    const pobierz = vi.fn(async () => { throw new Error('ECONNRESET') })
    expect(await dodajSubdomene('casa-sol', pobierz)).toEqual({ ok: false, powod: 'siec' })
  })
})

/**
 * Raport zdrowia sprawdza, czy token działa, a nie tylko czy istnieje —
 * zakres tokenu (zespół czy projekt) widać dopiero w działaniu, a token
 * odwołany w panelu Vercela nie zostawia śladu w zmiennych środowiska.
 */
describe('sprawdzTokenVercel', () => {
  beforeEach(() => { vi.stubEnv('VERCEL_API_TOKEN', 'tok') })
  afterEach(() => { vi.unstubAllEnvs() })

  it('odczyt demo.nobooking.eu z projektu = token działa', async () => {
    const pobierz = vi.fn(async () => odp(200, { name: 'demo.nobooking.eu' }))
    expect(await sprawdzTokenVercel(pobierz)).toBe('dziala')
    expect(String((pobierz.mock.calls[0] as unknown[])[0])).toContain('/v9/projects/prj_')
  })

  it('odmowa = token nie działa', async () => {
    expect(await sprawdzTokenVercel(vi.fn(async () => odp(403, {})))).toBe('nie_dziala')
    expect(await sprawdzTokenVercel(vi.fn(async () => odp(401, {})))).toBe('nie_dziala')
  })

  it('brak tokenu', async () => {
    vi.stubEnv('VERCEL_API_TOKEN', '')
    expect(await sprawdzTokenVercel(vi.fn())).toBe('brak')
  })

  // Awaria Vercela to nie zepsuty token — nie budzimy alarmu o tokenie.
  it('błąd sieci albo 5xx = nie wiadomo', async () => {
    expect(await sprawdzTokenVercel(vi.fn(async () => { throw new Error('x') }))).toBe('nieznany')
    expect(await sprawdzTokenVercel(vi.fn(async () => odp(503, {})))).toBe('nieznany')
  })
})
