import { describe, it, expect } from 'vitest'
import { czyAdmin, identyfikatoryAdminow } from './czyAdmin'

const ADMIN = '74a4858d-e785-463c-9669-9c23c144e8d3'

describe('czyAdmin', () => {
  it('wpuszcza konto z listy', () => {
    expect(czyAdmin({ id: ADMIN }, [ADMIN])).toBe(true)
  })

  it('nie wpuszcza innego zalogowanego użytkownika — np. właściciela apartamentu', () => {
    expect(czyAdmin({ id: '11111111-2222-3333-4444-555555555555' }, [ADMIN])).toBe(false)
  })

  it('odmawia bez użytkownika i bez identyfikatora', () => {
    expect(czyAdmin(null, [ADMIN])).toBe(false)
    expect(czyAdmin(undefined, [ADMIN])).toBe(false)
    expect(czyAdmin({ id: '' }, [ADMIN])).toBe(false)
    expect(czyAdmin({}, [ADMIN])).toBe(false)
  })

  it('pusta lista nikogo nie wpuszcza', () => {
    expect(czyAdmin({ id: ADMIN }, [])).toBe(false)
  })
})

describe('identyfikatoryAdminow', () => {
  it('zmienna środowiskowa nadpisuje listę domyślną', () => {
    expect(identyfikatoryAdminow(' AAA , bbb ,')).toEqual(['aaa', 'bbb'])
  })

  it('bez zmiennej — konto administratora', () => {
    expect(identyfikatoryAdminow(undefined)).toEqual([ADMIN])
    expect(identyfikatoryAdminow('  ')).toEqual([ADMIN])
  })
})
