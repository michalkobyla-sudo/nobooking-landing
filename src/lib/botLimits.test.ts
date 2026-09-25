import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { zaklepWiadomosc, idKomentarza, LIMIT_WIADOMOSCI } from './botLimits'

type BladBazy = { code?: string; message: string } | null

/** Atrapa klienta Supabase — odtwarza tylko te dwa łańcuchy wywołań,
 *  których używa zaklepWiadomosc. */
function atrapa(insertError: BladBazy, count: number, countError: BladBazy = null) {
  const wstawione: Record<string, unknown>[] = []
  const klient = {
    from() {
      return {
        insert(row: Record<string, unknown>) {
          wstawione.push(row)
          return Promise.resolve({ error: insertError })
        },
        select() {
          const chain = {
            eq: () => chain,
            gte: () => Promise.resolve({ count, error: countError }),
          }
          return chain
        },
      }
    },
  } as unknown as SupabaseClient
  return { klient, wstawione }
}

describe('zaklepWiadomosc', () => {
  it('pierwsza wiadomość przechodzi i zapisuje wiersz', async () => {
    const { klient, wstawione } = atrapa(null, 1)
    expect(await zaklepWiadomosc(klient, 'mid_1', 'user_1')).toEqual({ swieza: true, poLimicie: false })
    expect(wstawione[0]).toEqual({ mid: 'mid_1', fb_user_id: 'user_1' })
  })

  // Regresja: Meta ponawia webhooka, gdy nie dostanie szybko 200. Bez tego
  // gość dostawał drugą odpowiedź, a my drugi rachunek za wywołanie modelu.
  it('powtórka tej samej wiadomości nie jest świeża', async () => {
    const { klient } = atrapa({ code: '23505', message: 'duplicate key' }, 1)
    expect(await zaklepWiadomosc(klient, 'mid_1', 'user_1')).toEqual({ swieza: false, poLimicie: false })
  })

  it('sygnalizuje przekroczenie limitu po przekroczeniu progu', async () => {
    const podProgiem = await zaklepWiadomosc(atrapa(null, LIMIT_WIADOMOSCI).klient, 'm', 'u')
    expect(podProgiem.poLimicie).toBe(false)

    const nadProgiem = await zaklepWiadomosc(atrapa(null, LIMIT_WIADOMOSCI + 1).klient, 'm', 'u')
    expect(nadProgiem.poLimicie).toBe(true)
  })

  // Milczący bot jest gorszy niż bot, który odpowie dwa razy.
  it('przy awarii bazy przepuszcza wiadomość', async () => {
    const { klient } = atrapa({ code: '08006', message: 'connection failure' }, 0)
    expect(await zaklepWiadomosc(klient, 'mid_1', 'user_1')).toEqual({ swieza: true, poLimicie: false })

    const { klient: k2 } = atrapa(null, 0, { message: 'timeout' })
    expect(await zaklepWiadomosc(k2, 'mid_2', 'user_1')).toEqual({ swieza: true, poLimicie: false })
  })
})

describe('idKomentarza', () => {
  it('odróżnia komentarz od wiadomości o tym samym identyfikatorze', () => {
    expect(idKomentarza('123')).toBe('comment:123')
    expect(idKomentarza('123')).not.toBe('123')
  })
})
