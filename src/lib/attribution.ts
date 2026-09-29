/**
 * Skąd przyszedł klient — czysta logika, bez przeglądarki i bez bazy.
 *
 * Powód istnienia: `orders` nie ma dziś ani jednej kolumny źródła, więc nie da
 * się powiedzieć, które zamówienie przyszło z której kampanii. Audyt 2026-09-05
 * wskazuje to jako warunek wstępny warstwy marketingowej — agent reklamowy bez
 * atrybucji nie ma czego optymalizować (CZĘŚĆ 4, A6).
 *
 * Zapisujemy **pierwsze dotknięcie**. Parametry kampanii lądują na stronie
 * głównej, a formularz zamówienia jest kilka kliknięć dalej; gdyby wygrywało
 * ostatnie dotknięcie, każde zamówienie miałoby źródło „wejście bezpośrednie".
 */

export interface Zrodlo {
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  utm_term: string | null
  /** `fbclid` albo `gclid` — identyfikator kliknięcia z reklamy. */
  click_id: string | null
  referrer: string | null
  /** Ścieżka, na którą klient wszedł jako pierwszą. */
  landing_path: string | null
}

export const PUSTE_ZRODLO: Zrodlo = {
  utm_source: null, utm_medium: null, utm_campaign: null,
  utm_content: null, utm_term: null, click_id: null,
  referrer: null, landing_path: null,
}

/** Klucz w `localStorage`. */
export const KLUCZ_ZRODLA = 'nobooking_zrodlo'

/**
 * Górny limit długości pojedynczej wartości. Parametry UTM przychodzą z adresu,
 * czyli od kogokolwiek — bez limitu ktoś wkleiłby megabajt do każdego zamówienia.
 */
export const MAX_DLUGOSC = 200

function oczysc(v: string | null | undefined): string | null {
  if (typeof v !== 'string') return null
  // Znaki sterujące potrafią rozbić formatowanie maila z powiadomieniem
  // o zamówieniu, który składamy z tych wartości.
  const s = v.replace(/[\u0000-\u001f\u007f]/g, ' ').trim()
  if (s.length === 0) return null
  return s.slice(0, MAX_DLUGOSC)
}

/** Domeny, których nazwa nic by nam nie powiedziała w surowej postaci. */
const ZNANE_ZRODLA: Array<{ wzor: RegExp; source: string; medium: string }> = [
  { wzor: /(^|\.)(facebook\.com|fb\.me|fb\.com)$/i,   source: 'facebook',   medium: 'social' },
  { wzor: /(^|\.)instagram\.com$/i,                    source: 'instagram',  medium: 'social' },
  { wzor: /(^|\.)(messenger\.com)$/i,                  source: 'messenger',  medium: 'social' },
  { wzor: /(^|\.)(t\.co|twitter\.com|x\.com)$/i,       source: 'x',          medium: 'social' },
  { wzor: /(^|\.)linkedin\.com$/i,                     source: 'linkedin',   medium: 'social' },
  { wzor: /(^|\.)(tiktok\.com)$/i,                     source: 'tiktok',     medium: 'social' },
  { wzor: /(^|\.)google\.[a-z.]+$/i,                   source: 'google',     medium: 'organic' },
  { wzor: /(^|\.)(bing\.com|duckduckgo\.com|yahoo\.com|ecosia\.org)$/i, source: 'szukajarka', medium: 'organic' },
]

/**
 * Rozpoznanie źródła z adresu strony wejścia i z referrera.
 *
 * `adres` to pełny URL wejścia, `referrer` to `document.referrer` (może być pusty).
 * Parametry UTM mają pierwszeństwo przed referrerem — jeśli ktoś oznaczył link,
 * wie lepiej, skąd ten klik pochodzi.
 */
export function czytajZrodlo(adres: string, referrer: string | null | undefined): Zrodlo {
  let url: URL
  try {
    url = new URL(adres)
  } catch {
    return { ...PUSTE_ZRODLO }
  }

  const q = url.searchParams
  const fbclid = oczysc(q.get('fbclid'))
  const gclid = oczysc(q.get('gclid'))

  const z: Zrodlo = {
    utm_source: oczysc(q.get('utm_source')),
    utm_medium: oczysc(q.get('utm_medium')),
    utm_campaign: oczysc(q.get('utm_campaign')),
    utm_content: oczysc(q.get('utm_content')),
    utm_term: oczysc(q.get('utm_term')),
    click_id: fbclid ?? gclid,
    referrer: oczysc(referrer),
    landing_path: oczysc(url.pathname + url.search) ?? '/',
  }

  // Identyfikator kliknięcia z reklamy sam w sobie mówi, skąd przyszedł ruch —
  // Meta i Google dokładają go do adresu także wtedy, gdy kampania nie ma UTM-ów.
  if (!z.utm_source && fbclid) { z.utm_source = 'facebook'; z.utm_medium ??= 'paid' }
  if (!z.utm_source && gclid)  { z.utm_source = 'google';   z.utm_medium ??= 'paid' }

  if (!z.utm_source) {
    const rozpoznane = zRefererra(z.referrer)
    if (rozpoznane) {
      z.utm_source = rozpoznane.source
      z.utm_medium ??= rozpoznane.medium
    }
  }

  return z
}

/** Źródło wyprowadzone z referrera. `null`, gdy referrer jest pusty lub wewnętrzny. */
function zRefererra(referrer: string | null): { source: string; medium: string } | null {
  if (!referrer) return null
  let host: string
  try {
    host = new URL(referrer).hostname
  } catch {
    return null
  }
  // Przejście wewnątrz serwisu to nie jest nowe źródło.
  if (/(^|\.)nobooking\.eu$/i.test(host) || host === 'localhost') return null

  for (const w of ZNANE_ZRODLA) {
    if (w.wzor.test(host)) return { source: w.source, medium: w.medium }
  }
  return { source: host.replace(/^www\./i, ''), medium: 'referral' }
}

/** Czy źródło niesie jakąkolwiek informację poza ścieżką wejścia. */
export function maInformacje(z: Zrodlo): boolean {
  return Boolean(z.utm_source || z.utm_campaign || z.click_id || z.referrer)
}

/**
 * Pierwsze dotknięcie wygrywa: raz zapisanego źródła nie nadpisujemy.
 * Wyjątek — zapisane źródło bez żadnej informacji ustępuje nowemu, które ją ma.
 */
export function scal(zapisane: Zrodlo | null, biezace: Zrodlo): Zrodlo {
  if (!zapisane) return biezace
  if (!maInformacje(zapisane) && maInformacje(biezace)) return biezace
  return zapisane
}

/**
 * Bezpieczne odczytanie zapisanego źródła. Zwraca `null` przy czymkolwiek
 * nieoczekiwanym — atrybucja nie może wywrócić formularza zamówienia.
 */
export function zJson(tekst: string | null | undefined): Zrodlo | null {
  if (!tekst) return null
  try {
    const d = JSON.parse(tekst) as Record<string, unknown>
    // Tablica też przechodzi przez `typeof === 'object'`, a nie jest zapisem źródła.
    if (typeof d !== 'object' || d === null || Array.isArray(d)) return null
    const z = { ...PUSTE_ZRODLO }
    for (const k of Object.keys(PUSTE_ZRODLO) as Array<keyof Zrodlo>) {
      z[k] = oczysc(d[k] as string | undefined)
    }
    return z
  } catch {
    return null
  }
}

/** Ta sama sanityzacja po stronie serwera — dane z `body` są niezaufane. */
export function zBody(body: unknown): Zrodlo {
  const d = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>
  const z = { ...PUSTE_ZRODLO }
  for (const k of Object.keys(PUSTE_ZRODLO) as Array<keyof Zrodlo>) {
    z[k] = oczysc(d[k] as string | undefined)
  }
  return z
}

/** Jedna linia do maila z powiadomieniem o zamówieniu. */
export function opisZrodla(z: Zrodlo): string {
  if (!maInformacje(z)) return 'wejście bezpośrednie'
  const czesci = [
    z.utm_source && `źródło: ${z.utm_source}`,
    z.utm_medium && `kanał: ${z.utm_medium}`,
    z.utm_campaign && `kampania: ${z.utm_campaign}`,
    z.utm_content && `kreacja: ${z.utm_content}`,
    !z.utm_source && z.referrer && `z: ${z.referrer}`,
  ].filter(Boolean)
  return czesci.join(', ')
}
