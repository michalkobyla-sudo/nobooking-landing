import type { ApartmentConfig } from '@/lib/apartmentTypes'

/**
 * Kalkulacja ceny rezerwacji — czysta, bez bazy i bez sieci.
 *
 * Wydzielona z trasy `/api/sites/[slug]/book`, bo to jedyne miejsce w systemie,
 * które zamienia dane wejściowe gościa na kwotę pobieraną z jego karty, a nie
 * miało ani jednego testu. Audyt 2026-09-05 wskazywał ją jako pierwszą rzecz
 * do pokrycia.
 */

export type Sezon = 'low' | 'mid' | 'high'

/** Górny limit długości pobytu. Chroni rozwijanie zakresu dat przed budowaniem
 *  milionów wpisów, gdy ktoś poda datę wyjazdu w odległej przyszłości. */
export const MAX_NOCY = 365

/** Sezon wyznacza **miesiąc przyjazdu** — pobyt na przełomie liczy się w całości
 *  po stawce sezonu, w którym się zaczyna. */
export function sezonDla(checkIn: string): Sezon {
  const miesiac = new Date(checkIn).getUTCMonth() + 1
  if (MIESIACE_SEZONU.high.includes(miesiac)) return 'high'
  if (MIESIACE_SEZONU.mid.includes(miesiac)) return 'mid'
  return 'low'
}

export function liczNoce(checkIn: string, checkOut: string): number {
  return Math.round(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86_400_000
  )
}

/** Dni pobytu jako osobne daty. Dzień wyjazdu NIE jest zajęty. */
export function rozwinZakres(checkIn: string, checkOut: string): string[] {
  const dni: string[] = []
  const koniec = new Date(checkOut)
  for (const d = new Date(checkIn); d < koniec; d.setDate(d.getDate() + 1)) {
    dni.push(d.toISOString().slice(0, 10))
  }
  return dni
}

const ISO_DATA = /^\d{4}-\d{2}-\d{2}$/

export type BladDat =
  | 'invalid_dates'   // brak, zły format, wyjazd nie po przyjeździe, termin z przeszłości
  | 'stay_too_long'   // ponad MAX_NOCY

/** Zwraca kod błędu albo null. `dzis` w formacie YYYY-MM-DD. */
export function sprawdzDaty(checkIn: string, checkOut: string, dzis: string): BladDat | null {
  if (!checkIn || !checkOut) return 'invalid_dates'
  if (!ISO_DATA.test(checkIn) || !ISO_DATA.test(checkOut)) return 'invalid_dates'
  if (checkIn >= checkOut) return 'invalid_dates'
  if (checkIn < dzis) return 'invalid_dates'
  // Limit sprawdzany PRZED rozwinięciem zakresu — inaczej data wyjazdu w roku
  // 9999 każe pętli zbudować miliony wpisów, zanim cokolwiek innego zdąży się
  // wykonać.
  if (liczNoce(checkIn, checkOut) > MAX_NOCY) return 'stay_too_long'
  return null
}

export interface Wycena {
  noce: number
  sezon: Sezon
  cenaZaNoc: number
  minNocy: number
  kwotaBazowa: number
  rabat: number
  doZaplaty: number
  waluta: string
  groszy: number
}

/**
 * Wycena pobytu. `rabatProcent` to już zweryfikowany rabat (ważność i limit
 * użyć sprawdza wywołujący, bo wymaga bazy).
 */
export function wycen(
  checkIn: string,
  checkOut: string,
  config: ApartmentConfig,
  rabatProcent = 0,
): Wycena {
  const noce = liczNoce(checkIn, checkOut)
  const sezon = sezonDla(checkIn)
  const stawka = config.pricing.tiers[sezon]
  const kwotaBazowa = noce * stawka.pricePerNight + config.pricing.cleaningFee
  const rabat = Math.round(kwotaBazowa * rabatProcent / 100)
  const doZaplaty = kwotaBazowa - rabat

  return {
    noce,
    sezon,
    cenaZaNoc: stawka.pricePerNight,
    minNocy: stawka.minNights,
    kwotaBazowa,
    rabat,
    doZaplaty,
    waluta: config.pricing.currency.toLowerCase(),
    // Stripe przyjmuje kwoty w najmniejszej jednostce waluty.
    groszy: Math.round(doZaplaty * 100),
  }
}

/**
 * Miesiące każdego sezonu — **jedyne źródło prawdy**.
 *
 * Do 2026-10-05 reguła sezonów żyła w trzech miejscach naraz: w `sezonDla`,
 * w osobnej kopii w formularzu rezerwacji i w swobodnym tekście `months`
 * wpisywanym do konfiguracji przez generator stron. Trzecia kopia była
 * nieprawdziwa od początku:
 *
 * | sezon | etykieta generatora | co naprawdę liczył kod |
 * |---|---|---|
 * | niski  | „paź–kwi / Oct–Apr" | XI–IV (bez października) |
 * | średni | „maj–cze / May–Jun" | V, VI **i X** |
 * | wysoki | „lip–wrz / Jul–Sep" | VII–IX ✓ |
 *
 * Skutek dla gościa: strona pokazywała „Niski sezon paź–kwi, 80 €/noc,
 * min. 3 noce", a rezerwacja na 10 października była liczona po stawce
 * średniej i odbijała się komunikatem o minimum 5 nocy. Złapane 2026-10-05
 * przy próbie złożenia rezerwacji na 26 października.
 *
 * Etykiety składa teraz `opisMiesiecy` z tej tablicy, więc nie da się ich
 * rozjechać z regułą — także na stronach już wygenerowanych, bo zapisanego
 * `months` nie czytamy.
 */
export const MIESIACE_SEZONU: Record<Sezon, number[]> = {
  high: [7, 8, 9],
  mid: [5, 6, 10],
  low: [1, 2, 3, 4, 11, 12],
}

const SKROTY_MIESIECY: Record<'pl' | 'en' | 'es' | 'de', string[]> = {
  pl: ['sty', 'lut', 'mar', 'kwi', 'maj', 'cze', 'lip', 'sie', 'wrz', 'paź', 'lis', 'gru'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  es: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
  de: ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'],
}

/**
 * Opis miesięcy sezonu, np. „lis–kwi" albo „maj–cze, paź".
 *
 * Miesiące idące po sobie skleja w zakres, resztę wypisuje po przecinku.
 * Niski sezon przechodzi przez grudzień i styczeń, więc zawijanie roku
 * traktujemy jak ciągłość — inaczej wyszłoby „sty–kwi, lis–gru".
 */
export function opisMiesiecy(sezon: Sezon, lang: 'pl' | 'en' | 'es' | 'de' = 'pl'): string {
  const nazwy = SKROTY_MIESIECY[lang] ?? SKROTY_MIESIECY.pl
  const miesiace = [...MIESIACE_SEZONU[sezon]].sort((a, b) => a - b)
  if (miesiace.length === 0) return ''

  const grupy: number[][] = []
  for (const m of miesiace) {
    const ostatnia = grupy[grupy.length - 1]
    if (ostatnia && m === ostatnia[ostatnia.length - 1] + 1) ostatnia.push(m)
    else grupy.push([m])
  }

  // Grudzień i styczeń w osobnych grupach to ta sama zima — sklejamy.
  if (grupy.length > 1) {
    const pierwsza = grupy[0]
    const ostatnia = grupy[grupy.length - 1]
    if (pierwsza[0] === 1 && ostatnia[ostatnia.length - 1] === 12) {
      grupy[grupy.length - 1] = [...ostatnia, ...pierwsza]
      grupy.shift()
    }
  }

  return grupy
    .map(g => (g.length === 1 ? nazwy[g[0] - 1] : `${nazwy[g[0] - 1]}–${nazwy[g[g.length - 1] - 1]}`))
    .join(', ')
}
