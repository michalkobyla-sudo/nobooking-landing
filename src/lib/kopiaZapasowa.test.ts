import { describe, it, expect } from 'vitest'
import path from 'path'
import { tabeleWKodzie } from './tabeleWKodzie'
import { KOPIOWANE, POMINIETE_W_KOPII, zbudujPlikKopii, type TabelaKopii } from './kopiaZapasowa'
import { sqlOdtworzenia } from '../../scripts/odtworz-kopie.mjs'

const KORZEN = path.join(__dirname, '..')

function pustePliki(): Record<TabelaKopii, unknown[]> {
  return Object.fromEntries(KOPIOWANE.map(t => [t, []])) as unknown as Record<TabelaKopii, unknown[]>
}

describe('zakres kopii zapasowej', () => {
  it('każda tabela używana w kodzie jest kopiowana albo świadomie pominięta', () => {
    const bezDecyzji = [...tabeleWKodzie(KORZEN).keys()].filter(
      t => !(KOPIOWANE as readonly string[]).includes(t) && !(t in POMINIETE_W_KOPII),
    )
    expect(
      bezDecyzji,
      'Nowa tabela nie ma decyzji o kopii. Dopisz ją do KOPIOWANE (w kolejności kluczy\n' +
      'obcych) albo do POMINIETE_W_KOPII z powodem — w src/lib/kopiaZapasowa.ts.',
    ).toEqual([])
  })

  it('żadna tabela nie jest jednocześnie kopiowana i pominięta', () => {
    expect(KOPIOWANE.filter(t => t in POMINIETE_W_KOPII)).toEqual([])
  })

  it('numery dokumentów z check-inu nie trafiają do kopii', () => {
    expect(KOPIOWANE as readonly string[]).not.toContain('checkin_forms')
  })

  it('kolejność idzie po kluczach obcych', () => {
    const poz = (t: TabelaKopii) => KOPIOWANE.indexOf(t)
    expect(poz('orders')).toBeLessThan(poz('sites'))
    expect(poz('sites')).toBeLessThan(poz('bookings'))
    for (const t of ['blocked_dates', 'calendar_feeds', 'discount_codes', 'reviews', 'renewal_reminders', 'sms_log'] as const) {
      expect(poz('sites')).toBeLessThan(poz(t))
    }
    expect(poz('bookings')).toBeLessThan(poz('reviews'))
    expect(poz('bookings')).toBeLessThan(poz('guest_notifications'))
  })
})

describe('plik kopii i odtworzenie', () => {
  it('liczy wiersze i zachowuje kolejność tabel', () => {
    const tabele = pustePliki()
    tabele.bookings = [{ id: 'b1' }, { id: 'b2' }]
    const plik = zbudujPlikKopii(tabele, new Date('2026-11-20T02:00:00Z'))
    expect(plik.bookings_count).toBe(2)
    expect(plik.liczby.bookings).toBe(2)
    expect(Object.keys(plik.tabele)).toEqual([...KOPIOWANE])
  })

  it('SQL wstawia tylko niepuste tabele, w kolejności, w jednej transakcji', () => {
    const tabele = pustePliki()
    tabele.orders = [{ id: 'o1' }]
    tabele.sites = [{ id: 's1', order_id: 'o1' }]
    const sql = sqlOdtworzenia(zbudujPlikKopii(tabele, new Date()))
    const linie = sql.trim().split('\n')
    expect(linie[0]).toBe('begin;')
    expect(linie.at(-1)).toBe('commit;')
    expect(linie).toHaveLength(4)
    expect(linie[1]).toContain('insert into public.orders')
    expect(linie[2]).toContain('insert into public.sites')
    expect(sql).toContain('on conflict do nothing')
  })

  it('ogranicznik nie koliduje z treścią danych', () => {
    const tabele = pustePliki()
    tabele.orders = [{ id: 'o1', notes: 'złośliwe $kopia0$; drop table orders; --' }]
    const sql = sqlOdtworzenia(zbudujPlikKopii(tabele, new Date()))
    expect(sql).toContain('$kopia1$[')
  })

  it('odrzuca niepełne kopie w wersji 1', () => {
    expect(() => sqlOdtworzenia({ exported_at: 'x', sites: [], bookings: [] })).toThrow(/wersji 2/)
  })
})
