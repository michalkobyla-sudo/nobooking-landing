import type { ApartmentConfig, T } from '@/lib/apartmentTypes'

/**
 * Sprawdzenie strony wygenerowanej dla nowego klienta — zanim pójdzie do niego mail.
 *
 * Powód istnienia: cron provisioningu wykonuje kroki, ale niczego nie sprawdza.
 * Wygeneruje config, założy konto, wyśle dane logowania i zaraportuje sukces —
 * nawet jeśli model zwrócił opis w postaci zaślepki, zero zdjęć albo cenę 0.
 * Klient dowiaduje się pierwszy i pisze. Audyt 2026-09-05 nazywa tę ścieżkę
 * najkruchszą w systemie właśnie z tego powodu (CZĘŚĆ 4, A1).
 *
 * Tutaj jest sama ocena, bez bazy i bez sieci. Pobranie strony robi
 * `sprawdzStrone`, które dostaje funkcję pobierającą z zewnątrz.
 */

/** Blokująca wstrzymuje maile do klienta. Ostrzeżenie tylko trafia do logu. */
export type WagaUsterki = 'blokujaca' | 'ostrzezenie'

export interface Usterka {
  waga: WagaUsterki
  pole: string
  opis: string
}

/** Poniżej tylu zdjęć strona wygląda na niedokończoną, a nie na minimalistyczną. */
export const MIN_ZDJEC = 3

/** Krótszy opis oznacza zwykle, że model nie miał z czego pisać. */
export const MIN_ZNAKOW_OPISU = 120

/**
 * Ślady zaślepek. `{{ }}` to niewypełniony szablon, reszta to teksty, które
 * modele wstawiają, gdy brakuje im danych wejściowych.
 */
const ZASLEPKI = /\{\{|\}\}|lorem ipsum|\bTODO\b|\bTBD\b|\bXXX\b|placeholder|wpisz tutaj|tu wpisz|opis apartamentu\b/i

const WALUTY = ['EUR', 'PLN', 'GBP', 'USD', 'CHF', 'CZK', 'SEK', 'NOK', 'DKK']

const JEZYKI: Array<keyof T> = ['pl', 'en', 'es', 'de']

function pusty(s: unknown): boolean {
  return typeof s !== 'string' || s.trim().length === 0
}

/**
 * Ocena wygenerowanego configu. Zwraca listę usterek — pusta oznacza, że
 * strona nadaje się do wysłania klientowi.
 */
export function sprawdzConfig(config: ApartmentConfig): Usterka[] {
  const u: Usterka[] = []
  const blad = (pole: string, opis: string) => u.push({ waga: 'blokujaca', pole, opis })
  const uwaga = (pole: string, opis: string) => u.push({ waga: 'ostrzezenie', pole, opis })

  // ── Tożsamość strony ──────────────────────────────────────────────────────
  if (pusty(config?.name)) blad('name', 'Nazwa apartamentu jest pusta.')
  else if (ZASLEPKI.test(config.name)) blad('name', `Nazwa wygląda na zaślepkę: „${config.name}".`)

  if (pusty(config?.location)) uwaga('location', 'Brak miejscowości — sekcja okolicy będzie pusta.')

  // ── Opis ──────────────────────────────────────────────────────────────────
  // Polski jest obowiązkowy, bo to język domyślny strony. Brak tłumaczenia
  // degraduje stronę, ale jej nie psuje — stąd różnica wagi.
  const opisPl = config?.description?.pl
  if (pusty(opisPl)) {
    blad('description.pl', 'Brak opisu po polsku.')
  } else {
    if (opisPl.trim().length < MIN_ZNAKOW_OPISU) {
      blad('description.pl', `Opis ma ${opisPl.trim().length} znaków, minimum to ${MIN_ZNAKOW_OPISU}.`)
    }
    if (ZASLEPKI.test(opisPl)) blad('description.pl', 'Opis zawiera tekst zaślepki.')
  }

  const brakujaceJezyki = JEZYKI.filter((j) => j !== 'pl' && pusty(config?.description?.[j]))
  if (brakujaceJezyki.length > 0) {
    uwaga('description', `Brak tłumaczeń opisu: ${brakujaceJezyki.join(', ')}.`)
  }

  if (config?.tagline && !pusty(config.tagline.pl) && ZASLEPKI.test(config.tagline.pl)) {
    blad('tagline.pl', 'Hasło zawiera tekst zaślepki.')
  }

  // ── Zdjęcia ───────────────────────────────────────────────────────────────
  const zdjecia = Array.isArray(config?.photos) ? config.photos : []
  if (zdjecia.length < MIN_ZDJEC) {
    blad('photos', `Strona ma ${zdjecia.length} zdjęć, minimum to ${MIN_ZDJEC}.`)
  }

  // Adres względny albo `data:` oznacza, że model wymyślił ścieżkę zamiast użyć
  // linku od klienta — galeria pokaże wtedy puste kafelki.
  const zleAdresy = zdjecia.filter((z) => !/^https?:\/\//i.test(z?.url ?? ''))
  if (zleAdresy.length > 0) {
    blad('photos', `${zleAdresy.length} z ${zdjecia.length} zdjęć nie ma pełnego adresu http(s).`)
  }

  const bezOpisu = zdjecia.filter((z) => pusty(z?.alt)).length
  if (bezOpisu > 0) uwaga('photos', `${bezOpisu} zdjęć bez tekstu alternatywnego.`)

  // ── Cennik ────────────────────────────────────────────────────────────────
  // Błąd tutaj jest najdroższy z możliwych: strona przyjmie rezerwację po złej
  // cenie, a pieniądze idą bezpośrednio na konto właściciela.
  const cennik = config?.pricing
  if (!cennik) {
    blad('pricing', 'Brak cennika — strona nie przyjmie rezerwacji.')
  } else {
    if (!WALUTY.includes(cennik.currency)) {
      blad('pricing.currency', `Nieznana waluta: „${String(cennik.currency)}".`)
    }
    if (typeof cennik.cleaningFee !== 'number' || cennik.cleaningFee < 0 || !Number.isFinite(cennik.cleaningFee)) {
      blad('pricing.cleaningFee', 'Opłata za sprzątanie nie jest poprawną liczbą nieujemną.')
    }
    for (const sezon of ['low', 'mid', 'high'] as const) {
      const t = cennik.tiers?.[sezon]
      if (!t) {
        blad(`pricing.tiers.${sezon}`, 'Brak stawki dla sezonu.')
        continue
      }
      if (!Number.isFinite(t.pricePerNight) || t.pricePerNight <= 0) {
        blad(`pricing.tiers.${sezon}`, `Cena za noc to ${String(t.pricePerNight)} — musi być dodatnia.`)
      }
      if (!Number.isInteger(t.minNights) || t.minNights < 1) {
        blad(`pricing.tiers.${sezon}`, `Minimalna liczba nocy to ${String(t.minNights)} — musi być co najmniej 1.`)
      }
    }
  }

  // ── Pojemność ─────────────────────────────────────────────────────────────
  // `guests` ogranicza formularz rezerwacji (`/api/sites/[slug]/book` odrzuca
  // większe grupy), więc zero gości oznacza stronę, na której nikt nie zarezerwuje.
  const specs = config?.specs
  if (!specs || !Number.isInteger(specs.guests) || specs.guests < 1) {
    blad('specs.guests', 'Liczba gości musi być liczbą całkowitą co najmniej 1.')
  }
  if (specs && (!Number.isFinite(specs.sqm) || specs.sqm <= 0)) {
    uwaga('specs.sqm', 'Metraż nie został podany.')
  }

  if (!Array.isArray(config?.amenities) || config.amenities.length === 0) {
    uwaga('amenities', 'Brak udogodnień — sekcja będzie pusta.')
  }

  return u
}

/** Odpowiedź z serwera, w zakresie, który nas interesuje. */
export interface OdpowiedzStrony {
  status: number
  tresc: string
}

/**
 * Sprawdzenie, czy wygenerowana strona w ogóle się otwiera.
 *
 * `pobierz` wstrzykujemy, żeby test nie chodził do sieci.
 */
export async function sprawdzStrone(
  url: string,
  nazwaApartamentu: string,
  pobierz: (url: string) => Promise<OdpowiedzStrony>,
): Promise<Usterka[]> {
  let odp: OdpowiedzStrony
  try {
    odp = await pobierz(url)
  } catch (err) {
    const powod = err instanceof Error ? err.message : String(err)
    return [{ waga: 'blokujaca', pole: 'strona', opis: `Strona ${url} nie odpowiedziała: ${powod}` }]
  }

  if (odp.status !== 200) {
    return [{ waga: 'blokujaca', pole: 'strona', opis: `Strona ${url} zwróciła ${odp.status}.` }]
  }

  // Sama nazwa to słaby, ale tani sygnał, że wyrenderowała się właściwa treść,
  // a nie strona błędu z kodem 200. Ostrzeżenie, nie błąd — nazwa bywa
  // rozbita znacznikami i wtedy proste wyszukiwanie jej nie znajdzie.
  if (!pusty(nazwaApartamentu) && !odp.tresc.includes(nazwaApartamentu.trim())) {
    return [{ waga: 'ostrzezenie', pole: 'strona', opis: 'W treści strony nie widać nazwy apartamentu.' }]
  }

  return []
}

/**
 * Znacznik wpisywany do `orders.notes`, gdy strona nie przeszła sprawdzenia.
 * Po nim agent zdrowia znajduje zamówienia czekające na przegląd — bez niego
 * wstrzymane zamówienie wyglądałoby dokładnie jak udane.
 */
export const MARKER_PRZEGLADU = '[PROVISION-CHECK]'

/** Czy lista usterek wstrzymuje wysyłkę maili do klienta. */
export function blokujeWysylke(usterki: Usterka[]): boolean {
  return usterki.some((u) => u.waga === 'blokujaca')
}

/** Jedna linia do logu i do pola `notes` w zamówieniu. */
export function podsumowanie(usterki: Usterka[]): string {
  if (usterki.length === 0) return 'bez zastrzeżeń'
  return usterki.map((u) => `${u.waga === 'blokujaca' ? '✗' : '!'} ${u.pole}: ${u.opis}`).join(' | ')
}
