import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { dodajSubdomene } from './vercelSubdomena'

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
