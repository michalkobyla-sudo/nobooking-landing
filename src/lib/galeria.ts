/**
 * Galeria apartamentu — walidacja zdjęć i filmów. Bez bazy, bez sieci.
 *
 * Powód istnienia: nowy klient dostaje stronę z sześcioma zdjęciami zastępczymi
 * z Unsplasha (`PLACEHOLDER_PHOTOS` w `generate-site.ts`), a `config.videos`
 * generator nie produkuje wcale. W panelu nie było czym tego zmienić — jedyną
 * drogą była ręczna podmiana w bazie, czyli usługa, a nie funkcja, mimo że
 * oferta mówi „Galeria zdjęć i wideo".
 *
 * Na adresach URL, nie na wgrywaniu plików: właściciele i tak trzymają zdjęcia
 * w chmurze (w onboardingu podają link), a to oszczędza osobnego bucketu,
 * limitów rozmiaru i obsługi przesyłania.
 */

import type { T } from './apartmentTypes'

export interface Zdjecie {
  url: string
  alt: string
}

export interface Wideo {
  embedUrl: string
  title: T
  thumbnail?: string
}

export type BladGalerii =
  | 'brak_zdjec'
  | 'za_duzo_zdjec'
  | 'zly_adres'
  | 'za_duzo_wideo'
  | 'zly_adres_wideo'
  | 'brak_tytulu'

/** Poniżej tylu zdjęć strona wygląda na niedokończoną — ten sam próg pilnuje
 *  sprawdzenie provisioningu (`provisionCheck`). */
export const MIN_ZDJEC = 3

/** Galeria dłuższa niż to przestaje się ładować na telefonie. */
export const MAX_ZDJEC = 40

/** Sekcja wideo to siatka 2 × n kafli. Powyżej tego robi się z niej lista. */
export const MAX_WIDEO = 6

export const MAX_DL_OPISU = 160
export const MAX_DL_TYTULU = 60

/** Identyfikator filmu na YouTube. */
const ID_YT = /^[\w-]{6,20}$/

function tekst(v: unknown, maks: number): string {
  if (typeof v !== 'string') return ''
  return v.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maks)
}

function pelnyAdres(url: string): boolean {
  return /^https:\/\/\S+$/i.test(url)
}

/**
 * Sprawdza listę zdjęć z panelu właściciela.
 *
 * `pozwolMalo` dopuszcza mniej niż `MIN_ZDJEC` — właściciel kasuje zdjęcia
 * zastępcze, zanim wklei własne, i zapisuje po drodze.
 */
export function sprawdzGalerie(
  wejscie: unknown,
  { pozwolMalo = false }: { pozwolMalo?: boolean } = {},
): { ok: true; zdjecia: Zdjecie[] } | { ok: false; blad: BladGalerii; pozycja?: number } {
  const lista = Array.isArray(wejscie) ? wejscie : []

  if (lista.length === 0) return { ok: false, blad: 'brak_zdjec' }
  if (lista.length > MAX_ZDJEC) return { ok: false, blad: 'za_duzo_zdjec' }
  if (!pozwolMalo && lista.length < MIN_ZDJEC) return { ok: false, blad: 'brak_zdjec' }

  const zdjecia: Zdjecie[] = []

  for (let i = 0; i < lista.length; i++) {
    const w = (typeof lista[i] === 'object' && lista[i] !== null ? lista[i] : {}) as Record<string, unknown>

    const url = tekst(w.url, 2000)
    // Adres względny albo `data:` daje pusty kafelek w galerii: strona się nie
    // wywraca, tylko wygląda na zepsutą — a tego nikt nie zgłosi.
    if (!pelnyAdres(url)) return { ok: false, blad: 'zly_adres', pozycja: i }

    zdjecia.push({ url, alt: tekst(w.alt, MAX_DL_OPISU) })
  }

  return { ok: true, zdjecia }
}

/**
 * Sprawdza listę filmów.
 *
 * Tytuł właściciel podaje raz, a trafia w cztery języki tą samą treścią.
 * `ApartmentPage` czyta `t(video.title, lang)`, więc pole musi być pełne —
 * brakujący język pokazałby gościowi puste miejsce. Tłumaczyć tego nie
 * tłumaczymy i nie udajemy, że tłumaczymy: to jedno-, dwuwyrazowa etykieta
 * („Spacer po apartamencie"), a właściciel może wpisać ją po angielsku, jeśli
 * zależy mu na gościach z zagranicy.
 */
export function sprawdzWideo(
  wejscie: unknown,
): { ok: true; wideo: Wideo[] } | { ok: false; blad: BladGalerii; pozycja?: number } {
  const lista = Array.isArray(wejscie) ? wejscie : []
  if (lista.length > MAX_WIDEO) return { ok: false, blad: 'za_duzo_wideo' }

  const wideo: Wideo[] = []

  for (let i = 0; i < lista.length; i++) {
    const w = (typeof lista[i] === 'object' && lista[i] !== null ? lista[i] : {}) as Record<string, unknown>

    const embedUrl = naOsadzenie(tekst(w.embedUrl, 2000))
    if (!embedUrl) return { ok: false, blad: 'zly_adres_wideo', pozycja: i }
    if (!/^https:\/\/www\.youtube\.com\/embed\/[\w-]{6,20}$/.test(embedUrl)) {
      return { ok: false, blad: 'zly_adres_wideo', pozycja: i }
    }

    const tytul = tekst(typeof w.title === 'string' ? w.title : (w.title as T | undefined)?.pl, MAX_DL_TYTULU)
    // Kafel bez tytułu to czarny prostokąt z trójkątem — nie da się poznać,
    // co w nim jest, dopóki się go nie kliknie.
    if (!tytul) return { ok: false, blad: 'brak_tytulu', pozycja: i }

    const thumbnail = tekst(w.thumbnail, 2000)
    if (thumbnail && !pelnyAdres(thumbnail)) return { ok: false, blad: 'zly_adres', pozycja: i }

    wideo.push({
      embedUrl,
      title: { pl: tytul, en: tytul, es: tytul, de: tytul },
      ...(thumbnail ? { thumbnail } : {}),
    })
  }

  return { ok: true, wideo }
}

/**
 * Sprowadza dowolny adres filmu z YouTube do czystej postaci osadzanej.
 *
 * Dwa powody, żeby nie przyjmować adresu takim, jakim go wklejono:
 *
 * 1. `youtube.com/watch?v=…` nie da się osadzić w `<iframe>` — gość zobaczyłby
 *    pustą ramkę. A właściciel kopiuje adres z paska przeglądarki, więc
 *    dostajemy właśnie taki. Odrzucenie byłoby formalnie poprawne i wkurzające,
 *    skoro zamiana jest jednoznaczna.
 * 2. `ApartmentPage` buduje źródło ramki jako `${embedUrl}?autoplay=1`, więc
 *    adres z własnym zapytaniem (`?si=…` z przycisku „Udostępnij") dałby dwa
 *    znaki zapytania i film by nie wstał. Dlatego obcinamy zapytanie i kotwicę.
 *
 * Zwraca `''`, gdy to nie jest adres filmu z YouTube.
 */
export function naOsadzenie(adres: string): string {
  const s = String(adres ?? '').trim()
  if (!s) return ''

  const wzory = [
    /^https?:\/\/(?:www\.)?youtube(?:-nocookie)?\.com\/embed\/([\w-]{6,20})/,
    /^https?:\/\/(?:www\.|m\.)?youtube\.com\/watch\?(?:[^#]*&)?v=([\w-]{6,20})/,
    /^https?:\/\/(?:www\.)?youtube\.com\/shorts\/([\w-]{6,20})/,
    /^https?:\/\/youtu\.be\/([\w-]{6,20})/,
  ]

  for (const wzor of wzory) {
    const m = s.match(wzor)
    if (m && ID_YT.test(m[1])) return `https://www.youtube.com/embed/${m[1]}`
  }

  return ''
}
