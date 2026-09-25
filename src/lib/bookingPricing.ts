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
  if ([7, 8, 9].includes(miesiac)) return 'high'
  if ([5, 6, 10].includes(miesiac)) return 'mid'
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
