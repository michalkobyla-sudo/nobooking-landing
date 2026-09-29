import { describe, it, expect } from 'vitest'
import {
  policzAnalitykę, nocyWMiesiacu, ostatnieMiesiace,
  type RezerwacjaDoAnalizy,
} from './analytics'

const r = (p: Partial<RezerwacjaDoAnalizy> = {}): RezerwacjaDoAnalizy => ({
  check_in: '2026-07-10',
  check_out: '2026-07-17',
  total_price: 700,
  currency: 'EUR',
  status: 'confirmed',
  created_at: '2026-06-10T10:00:00Z',
  ...p,
})

describe('nocyWMiesiacu', () => {
  it('liczy pobyt w całości wewnątrz miesiąca', () => {
    expect(nocyWMiesiacu({ check_in: '2026-07-10', check_out: '2026-07-17' }, '2026-07')).toBe(7)
  })

  // Dzień wyjazdu nie jest nocą — ta sama reguła co w kalendarzu i wycenie.
  it('nie liczy dnia wyjazdu', () => {
    expect(nocyWMiesiacu({ check_in: '2026-07-31', check_out: '2026-08-01' }, '2026-08')).toBe(0)
    expect(nocyWMiesiacu({ check_in: '2026-07-31', check_out: '2026-08-01' }, '2026-07')).toBe(1)
  })

  it('dzieli pobyt na przełomie miesięcy', () => {
    const pobyt = { check_in: '2026-07-29', check_out: '2026-08-03' }
    expect(nocyWMiesiacu(pobyt, '2026-07')).toBe(3)
    expect(nocyWMiesiacu(pobyt, '2026-08')).toBe(2)
  })

  it('zwraca zero dla miesiąca poza pobytem', () => {
    expect(nocyWMiesiacu({ check_in: '2026-07-10', check_out: '2026-07-17' }, '2026-09')).toBe(0)
  })
})

describe('ostatnieMiesiace', () => {
  it('zwraca miesiące od najstarszego, z bieżącym na końcu', () => {
    expect(ostatnieMiesiace('2026-03-15', 4)).toEqual(['2025-12', '2026-01', '2026-02', '2026-03'])
  })
})

describe('policzAnalitykę — obłożenie', () => {
  it('liczy procent z dni w miesiącu', () => {
    // 15 nocy z 31 dni lipca = 48%
    const a = policzAnalitykę([r({ check_in: '2026-07-01', check_out: '2026-07-16' })], '2026-07-15', 1)
    expect(a.miesiace[0].miesiac).toBe('2026-07')
    expect(a.miesiace[0].oblozenie).toBe(48)
  })

  it('uwzględnia różną długość miesięcy', () => {
    const luty = policzAnalitykę([r({ check_in: '2026-02-01', check_out: '2026-03-01' })], '2026-02-15', 1)
    expect(luty.miesiace[0].oblozenie).toBe(100)
  })

  it('nie przekracza stu procent przy nakładających się wpisach', () => {
    const a = policzAnalitykę(
      [
        r({ check_in: '2026-07-01', check_out: '2026-08-01' }),
        r({ check_in: '2026-07-05', check_out: '2026-07-20' }),
      ],
      '2026-07-15', 1,
    )
    expect(a.miesiace[0].oblozenie).toBe(100)
  })
})

describe('policzAnalitykę — przychód', () => {
  // Pobyt na przełomie nie może liczyć się w całości w obu miesiącach.
  it('rozkłada przychód proporcjonalnie na noce', () => {
    const a = policzAnalitykę(
      [r({ check_in: '2026-07-29', check_out: '2026-08-03', total_price: 500 })],
      '2026-08-15', 2,
    )
    const lipiec = a.miesiace.find(m => m.miesiac === '2026-07')!
    const sierpien = a.miesiace.find(m => m.miesiac === '2026-08')!
    expect(lipiec.przychod).toBe(300)   // 3 z 5 nocy
    expect(sierpien.przychod).toBe(200) // 2 z 5 nocy
    expect(lipiec.przychod + sierpien.przychod).toBe(500)
  })

  it('sumuje przychód roku po dacie przyjazdu', () => {
    const a = policzAnalitykę(
      [
        r({ check_in: '2026-07-10', total_price: 700 }),
        r({ check_in: '2026-09-01', check_out: '2026-09-05', total_price: 400 }),
        r({ check_in: '2025-07-10', total_price: 999 }),
      ],
      '2026-09-15', 12,
    )
    expect(a.przychodRok).toBe(1100)
    expect(a.rezerwacjeRok).toBe(2)
  })
})

describe('policzAnalitykę — statusy', () => {
  // Anulowane i wiszące nie są przychodem ani obłożeniem.
  it('liczy tylko confirmed i completed', () => {
    const a = policzAnalitykę(
      [
        r({ status: 'cancelled', total_price: 1000 }),
        r({ status: 'pending', total_price: 1000 }),
        r({ status: 'completed', total_price: 700 }),
      ],
      '2026-07-15', 1,
    )
    expect(a.przychodRok).toBe(700)
    expect(a.miesiace[0].rezerwacje).toBe(1)
  })
})

describe('policzAnalitykę — pobyt i wyprzedzenie', () => {
  it('liczy średnią długość pobytu', () => {
    const a = policzAnalitykę(
      [
        r({ check_in: '2026-07-01', check_out: '2026-07-04' }),  // 3
        r({ check_in: '2026-07-10', check_out: '2026-07-18' }),  // 8
      ],
      '2026-07-20', 1,
    )
    expect(a.sredniPobyt).toBe(5.5)
  })

  // Mediana, nie średnia: jedna rezerwacja zrobiona rok wcześniej
  // przesunęłaby średnią tak, że liczba przestałaby cokolwiek znaczyć.
  it('wyprzedzenie liczy medianą, odporną na pojedynczy wyskok', () => {
    const a = policzAnalitykę(
      [
        r({ created_at: '2026-06-25T00:00:00Z', check_in: '2026-07-01' }), // 6 dni
        r({ created_at: '2026-06-20T00:00:00Z', check_in: '2026-07-01' }), // 11 dni
        r({ created_at: '2025-07-01T00:00:00Z', check_in: '2026-07-01' }), // 365 dni
      ],
      '2026-07-15', 1,
    )
    expect(a.medianaWyprzedzenia).toBe(11)
  })
})

describe('policzAnalitykę — brak danych', () => {
  // Nowa strona nie ma jeszcze ani jednej rezerwacji — widok musi się
  // wyrenderować, a nie wywrócić.
  it('zwraca zera zamiast rzucać', () => {
    const a = policzAnalitykę([], '2026-07-15', 3)
    expect(a.miesiace).toHaveLength(3)
    expect(a.miesiace.every(m => m.oblozenie === 0 && m.przychod === 0)).toBe(true)
    expect(a).toMatchObject({ przychodRok: 0, sredniPobyt: 0, medianaWyprzedzenia: 0, rezerwacjeRok: 0 })
  })
})
