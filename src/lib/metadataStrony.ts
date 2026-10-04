import type { ApartmentConfig, T } from '@/lib/apartmentTypes'

/**
 * Tytuł, opis i podgląd linku dla strony apartamentu.
 *
 * **Dlaczego to w ogóle powstało.** Trasa `/sites/[slug]` nie miała własnych
 * metadanych, więc każda strona klienta dziedziczyła je z `layout.tsx` — czyli
 * ze strony sprzedażowej Nobookinga. Zakładka przeglądarki właściciela mówiła
 * „Nobooking — własna strona rezerwacyjna bez prowizji", Google indeksował
 * wszystkie strony klientów pod jednym tytułem i jednym opisem, a wklejenie
 * linku na Facebooku albo w WhatsAppie pokazywało gościowi zapowiedź
 * *„Przestań płacić prowizje. Własna strona dla apartamentu — gotowa w 7 dni"*
 * zamiast zdjęcia apartamentu.
 *
 * To dokładne odwrócenie tego, co klient kupuje. Płaci 799 zł za własną stronę,
 * a strona przy każdym udostępnieniu reklamowała nas.
 */

const JEZYKI = ['pl', 'en', 'es', 'de'] as const
export type Jezyk = typeof JEZYKI[number]

export function poprawnyJezyk(kandydat: unknown): Jezyk {
  return JEZYKI.includes(kandydat as Jezyk) ? (kandydat as Jezyk) : 'pl'
}

/** Mapowanie na kody, których oczekuje Open Graph. */
const LOKALIZACJE: Record<Jezyk, string> = {
  pl: 'pl_PL',
  en: 'en_GB',
  es: 'es_ES',
  de: 'de_DE',
}

/**
 * Tekst w wybranym języku, z zejściem na polski, a potem na pierwszy niepusty.
 * Konfiguracje bywają uzupełnione częściowo — brak tłumaczenia ma dać gorszy
 * opis, a nie pusty tytuł.
 */
export function wJezyku(tekst: T | undefined, lang: Jezyk): string {
  if (!tekst) return ''
  const wybrany = tekst[lang]?.trim()
  if (wybrany) return wybrany
  const polski = tekst.pl?.trim()
  if (polski) return polski
  return JEZYKI.map(j => tekst[j]?.trim()).find(Boolean) ?? ''
}

/** Skraca opis do długości, którą wyszukiwarki i komunikatory i tak przycinają. */
export function skroc(tekst: string, maks = 160): string {
  const t = tekst.replace(/\s+/g, ' ').trim()
  if (t.length <= maks) return t
  // Ucinamy na granicy słowa, żeby nie zostawiać połowy wyrazu przed wielokropkiem.
  const kawalek = t.slice(0, maks - 1)
  const spacja = kawalek.lastIndexOf(' ')
  return (spacja > maks * 0.6 ? kawalek.slice(0, spacja) : kawalek).trimEnd() + '…'
}

export interface MetadaneStrony {
  title: string
  description: string
  obrazek: string | null
  locale: string
}

export function metadaneApartamentu(config: ApartmentConfig, lang: Jezyk): MetadaneStrony {
  const nazwa = (config.name ?? '').trim() || 'Apartament'
  const miejsce = (config.location ?? '').trim()

  // Nazwa i miejscowość: to jest to, czego gość szuka w zakładce i w wynikach
  // wyszukiwania. Bez miejscowości „Apart Sunny" nic nikomu nie mówi.
  const title = miejsce ? `${nazwa} — ${miejsce}` : nazwa

  // Zapowiedź linku bierze opis apartamentu; gdy go brak, zostaje hasło.
  const opis = wJezyku(config.description, lang) || wJezyku(config.tagline, lang)

  const pierwszeZdjecie = config.photos?.find(p => (p?.url ?? '').trim())?.url?.trim() ?? null

  return {
    title,
    description: skroc(opis),
    obrazek: pierwszeZdjecie,
    locale: LOKALIZACJE[lang],
  }
}
