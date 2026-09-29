/**
 * Analityka właściciela (pakiet Pro) — czyste liczenie, bez bazy.
 *
 * Wszystko liczy się z rezerwacji, które i tak mamy. Świadomie **nie** ma tu
 * odwiedzin strony ani konwersji, choć obiecywała je makieta: wymagałyby
 * zbierania ruchu, czyli osobnego podsystemu i zgód cookie. Lepiej pokazać
 * mniej rzeczy prawdziwych niż więcej wymyślonych.
 */

export interface RezerwacjaDoAnalizy {
  check_in: string       // YYYY-MM-DD
  check_out: string      // YYYY-MM-DD
  total_price: number
  currency: string
  status: string
  created_at: string
}

/** Rezerwacje, które liczą się do wyników: odbyte albo potwierdzone. */
const LICZONE = new Set(['confirmed', 'completed'])

export interface MiesiacAnalizy {
  /** YYYY-MM */
  miesiac: string
  /** Procent obłożenia, 0–100. */
  oblozenie: number
  przychod: number
  rezerwacje: number
}

export interface Analityka {
  miesiace: MiesiacAnalizy[]
  przychodRok: number
  waluta: string
  /** Średnia długość pobytu w nocach, zaokrąglona do jednego miejsca. */
  sredniPobyt: number
  /** Ile dni przed przyjazdem rezerwują goście — mediana, nie średnia. */
  medianaWyprzedzenia: number
  rezerwacjeRok: number
}

function dni(od: string, doK: string): number {
  return Math.round((Date.parse(doK) - Date.parse(od)) / 86_400_000)
}

function dniWMiesiacu(rok: number, miesiac: number): number {
  return new Date(Date.UTC(rok, miesiac, 0)).getUTCDate()
}

/** Ile nocy danej rezerwacji przypada na wskazany miesiąc. */
export function nocyWMiesiacu(r: { check_in: string; check_out: string }, miesiac: string): number {
  const [rok, mies] = miesiac.split('-').map(Number)
  const poczatek = Date.UTC(rok, mies - 1, 1)
  const koniec = Date.UTC(rok, mies, 1)

  // Dzień wyjazdu nie jest nocą — ta sama reguła co w kalendarzu i wycenie.
  const od = Math.max(Date.parse(r.check_in), poczatek)
  const doK = Math.min(Date.parse(r.check_out), koniec)

  return doK <= od ? 0 : Math.round((doK - od) / 86_400_000)
}

/** Ostatnie `ile` miesięcy wstecz od `dzis`, od najstarszego. */
export function ostatnieMiesiace(dzis: string, ile: number): string[] {
  const d = new Date(dzis)
  const wynik: string[] = []
  for (let i = ile - 1; i >= 0; i--) {
    const m = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - i, 1))
    wynik.push(`${m.getUTCFullYear()}-${String(m.getUTCMonth() + 1).padStart(2, '0')}`)
  }
  return wynik
}

function mediana(liczby: number[]): number {
  if (liczby.length === 0) return 0
  const s = [...liczby].sort((a, b) => a - b)
  const srodek = Math.floor(s.length / 2)
  return s.length % 2 === 1 ? s[srodek] : Math.round((s[srodek - 1] + s[srodek]) / 2)
}

/**
 * @param rezerwacje wszystkie rezerwacje strony
 * @param dzis       YYYY-MM-DD
 * @param miesiecy   ile miesięcy wstecz pokazać
 */
export function policzAnalitykę(
  rezerwacje: RezerwacjaDoAnalizy[],
  dzis: string,
  miesiecy = 12,
): Analityka {
  const liczone = rezerwacje.filter((r) => LICZONE.has(r.status))
  const miesiaceLista = ostatnieMiesiace(dzis, miesiecy)

  const miesiace: MiesiacAnalizy[] = miesiaceLista.map((m) => {
    const [rok, mies] = m.split('-').map(Number)
    const dostepne = dniWMiesiacu(rok, mies)

    let noce = 0
    let przychod = 0
    let ile = 0

    for (const r of liczone) {
      const n = nocyWMiesiacu(r, m)
      if (n === 0) continue
      noce += n
      ile += 1
      // Przychód rozkładamy proporcjonalnie na noce — pobyt na przełomie
      // miesięcy nie może liczyć się w całości dwa razy.
      const wszystkieNoce = Math.max(1, dni(r.check_in, r.check_out))
      przychod += (Number(r.total_price) || 0) * (n / wszystkieNoce)
    }

    return {
      miesiac: m,
      oblozenie: Math.min(100, Math.round((noce / dostepne) * 100)),
      przychod: Math.round(przychod),
      rezerwacje: ile,
    }
  })

  const rok = dzis.slice(0, 4)
  const wRoku = liczone.filter((r) => r.check_in.startsWith(rok))

  const dlugosci = liczone.map((r) => Math.max(1, dni(r.check_in, r.check_out)))
  const wyprzedzenia = liczone
    .map((r) => dni(r.created_at.slice(0, 10), r.check_in))
    .filter((d) => d >= 0)

  return {
    miesiace,
    przychodRok: Math.round(wRoku.reduce((a, r) => a + (Number(r.total_price) || 0), 0)),
    // Waluta z pierwszej liczonej rezerwacji. Strona ma jedną walutę
    // w cenniku, więc mieszanka zdarza się tylko wtedy, gdy właściciel zmienił
    // ją w trakcie — wtedy suma i tak nie miałaby sensu, niezależnie od etykiety.
    waluta: (liczone[0]?.currency ?? 'EUR').toUpperCase(),
    sredniPobyt: dlugosci.length === 0
      ? 0
      : Math.round((dlugosci.reduce((a, b) => a + b, 0) / dlugosci.length) * 10) / 10,
    medianaWyprzedzenia: mediana(wyprzedzenia),
    rezerwacjeRok: wRoku.length,
  }
}
