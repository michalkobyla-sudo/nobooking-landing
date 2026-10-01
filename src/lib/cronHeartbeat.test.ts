import { describe, it, expect } from 'vitest'
import { nazwaZeSciezki, milczaceCrony, MAKS_PRZERWA_H } from './cronHeartbeat'

describe('nazwaZeSciezki', () => {
  it('wyciaga nazwe crona ze sciezki', () => {
    expect(nazwaZeSciezki('/api/cron/health')).toBe('health')
    expect(nazwaZeSciezki('/api/cron/cleanup-pending-bookings')).toBe('cleanup-pending-bookings')
    expect(nazwaZeSciezki('/api/cron/backup-bookings?rebaseline=1')).toBe('backup-bookings')
  })

  it('zwraca null dla czegos, co nie jest cronem', () => {
    for (const s of ['/api/orders', '/', '', '/api/cron/']) {
      expect(nazwaZeSciezki(s)).toBeNull()
    }
  })
})

describe('milczaceCrony', () => {
  const swieze = Object.keys(MAKS_PRZERWA_H).map(nazwa => ({ nazwa, godzinTemu: 0.5 }))

  it('milczy, gdy wszystkie chodza', () => {
    expect(milczaceCrony(swieze)).toEqual([])
  })

  // Prog jest inny dla crona minutowego niz dla dobowego — jedna wspolna
  // wartosc albo przepuszczalaby martwy provision-sites, albo krzyczala
  // codziennie o cronach, ktore chodza raz na dobe.
  it('stosuje prog wlasciwy dla danego crona', () => {
    const z = milczaceCrony([
      ...swieze.filter(c => c.nazwa !== 'provision-sites' && c.nazwa !== 'backup-bookings'),
      { nazwa: 'provision-sites', godzinTemu: 3 },     // prog 2 h -> alarm
      { nazwa: 'backup-bookings', godzinTemu: 20 },    // prog 36 h -> cisza
    ])
    expect(z.map(x => x.nazwa)).toEqual(['provision-sites'])
  })

  // "Nigdy sie nie uruchomil" to gorsza wiadomosc niz "spoznil sie",
  // wiec brak wiersza nie moze oznaczac braku alarmu.
  it('zglasza crona, ktorego nie ma w tabeli', () => {
    const z = milczaceCrony(swieze.filter(c => c.nazwa !== 'health'))
    expect(z).toEqual([{ nazwa: 'health', godzinTemu: null }])
  })

  it('pusta tabela to alarm o kazdym cronie, gdy mechanizm juz chodzi', () => {
    const z = milczaceCrony([])
    expect(z).toHaveLength(Object.keys(MAKS_PRZERWA_H).length)
    expect(z.every(x => x.godzinTemu === null)).toBe(true)
  })

  // Zaraz po migracji tabela jest pusta. Siedem alarmow krytycznych naraz,
  // z ktorych zaden nie jest prawdziwy, nauczyloby ignorowac caly raport.
  it('milczy o brakujacych wpisach na rozruchu', () => {
    expect(milczaceCrony([{ nazwa: 'health', godzinTemu: 0 }], 1)).toEqual([])
    expect(milczaceCrony([], 0)).toEqual([])
  })

  // Ale spoznienie crona, ktory wiersz ma, jest jednoznaczne od poczatku.
  it('spozniony cron jest zglaszany takze na rozruchu', () => {
    const z = milczaceCrony([{ nazwa: 'provision-sites', godzinTemu: 5 }], 1)
    expect(z).toEqual([{ nazwa: 'provision-sites', godzinTemu: 5 }])
  })

  // Nieznany wpis w tabeli (np. po usunieciu crona z vercel.json) nie moze
  // generowac alarmu o czyms, czego juz nie ma.
  it('ignoruje wpisy spoza listy znanych cronow', () => {
    expect(milczaceCrony([...swieze, { nazwa: 'stary-cron', godzinTemu: 999 }])).toEqual([])
  })
})

describe('progi zgodne z vercel.json', () => {
  it('ma wpis dla kazdego crona i zapas wzgledem harmonogramu', () => {
    expect(Object.keys(MAKS_PRZERWA_H).sort()).toEqual([
      'backup-bookings', 'cleanup-pending-bookings', 'guest-reminders', 'health',
      'provision-sites', 'renewal-reminders', 'review-requests',
    ])
    // Cron dobowy ma prog ponad doby, minutowy wyraznie wiecej niz minute.
    expect(MAKS_PRZERWA_H['provision-sites']).toBeGreaterThan(1)
    for (const dobowy of ['backup-bookings', 'health', 'guest-reminders', 'renewal-reminders', 'review-requests']) {
      expect(MAKS_PRZERWA_H[dobowy]).toBeGreaterThan(24)
    }
  })
})
