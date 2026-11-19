import { PRICE_LABELS, PLAN_NAMES } from './prices'
import { markdownNaHtml } from './markdown'
import { dataSlownie, WERSJA_REGULAMINU } from './dokumentyPrawne'

/**
 * Potwierdzenie zawarcia umowy — fragment maila wysyłanego po płatności.
 *
 * Art. 21 ustawy o prawach konsumenta: przedsiębiorca potwierdza umowę na
 * trwałym nośniku, w rozsądnym czasie i przed rozpoczęciem świadczenia,
 * z informacjami z art. 12 — w tym o prawie odstąpienia. Mail jest trwałym
 * nośnikiem; link do regulaminu nie jest, bo treść pod nim może się zmienić.
 * Dlatego regulamin idzie w całości w treści maila.
 *
 * Do 2026-11-18 mail po płatności nie zawierał ani pouczenia, ani regulaminu.
 */

const KONTAKT = 'kontakt@nobooking.eu'
const REGULAMIN_URL = 'https://nobooking.eu/regulamin'

/** Ostatni dzień na odstąpienie: 14 dni od zawarcia umowy (art. 27 upk). */
export function terminOdstapienia(zawarcie: Date): string {
  const d = new Date(Date.UTC(zawarcie.getUTCFullYear(), zawarcie.getUTCMonth(), zawarcie.getUTCDate()))
  d.setUTCDate(d.getUTCDate() + 14)
  return d.toISOString().slice(0, 10)
}

const bezRoku = (s: string) => s.replace(/ r\.$/, '')

/**
 * Co zwracamy przy odstąpieniu. Żądanie wcześniejszego startu potwierdzamy
 * tutaj, na trwałym nośniku (art. 21 ust. 2 upk) — bez tego potwierdzenia nie
 * można żądać zapłaty za wykonaną część (art. 36).
 */
function zwrot(wczesnyStart: boolean | null): string {
  if (wczesnyStart === true) {
    return 'W zamówieniu zażądano rozpoczęcia usługi przed upływem tego terminu — potwierdzamy to żądanie. Jeśli odstąpisz od umowy, zwrócimy zapłaconą kwotę pomniejszoną o wartość usługi wykonanej do chwili odstąpienia, liczoną proporcjonalnie do jej zakresu, w ciągu 14 dni, tą samą metodą płatności.'
  }
  if (wczesnyStart === false) {
    return 'Zwracamy całą zapłaconą kwotę w ciągu 14 dni, tą samą metodą płatności.'
  }
  return 'Zasady zwrotu opisuje pkt 7 regulaminu poniżej.'
}

/** Regulamin linkuje względnie (`/polityka-prywatnosci`) — w mailu taki link
 *  prowadzi donikąd, bo klient pocztowy nie zna domeny. */
const bezwzgledneLinki = (html: string) => html.replace(/href="\//g, 'href="https://nobooking.eu/')

export function htmlPotwierdzenia(p: {
  plan: 'basic' | 'pro'
  currency: 'pln' | 'eur'
  /** Identyfikator zamówienia — w mailu jako numer. */
  numer: string
  zawarcie: Date
  /** Treść `docs/PRAWNE-regulamin.md`; null, gdy pliku nie udało się wczytać. */
  regulaminMd: string | null
  /** Czy klient zaznaczył żądanie rozpoczęcia usługi przed upływem 14 dni.
   *  null = nie wiadomo (ponowna wysyłka, Stripe nie odpowiedział). */
  wczesnyStart: boolean | null
}): string {
  const dataZawarcia = bezRoku(dataSlownie(p.zawarcie.toISOString().slice(0, 10)))
  const termin = bezRoku(dataSlownie(terminOdstapienia(p.zawarcie)))
  const wiersz = (k: string, v: string) =>
    `<tr><td style="padding:4px 12px 4px 0;color:#6b7280;white-space:nowrap;vertical-align:top">${k}</td><td style="padding:4px 0;color:#111827">${v}</td></tr>`

  const regulamin = p.regulaminMd
    ? `<div style="margin-top:1.5rem;padding:1.25rem 1.5rem;border:1px solid #e5e7eb;border-radius:10px;font-size:12.5px;line-height:1.6;color:#4b5563">
        ${bezwzgledneLinki(markdownNaHtml(p.regulaminMd))}
      </div>`
    : `<p style="font-size:0.85rem;color:#374151">Pełna treść regulaminu: <a href="${REGULAMIN_URL}" style="color:#059669">${REGULAMIN_URL}</a></p>`

  return `
    <h2 style="font-size:1.05rem;margin:0 0 0.75rem;color:#111827">Potwierdzenie zawarcia umowy</h2>
    <table style="border-collapse:collapse;font-size:0.875rem;margin-bottom:1rem">
      ${wiersz('Sprzedawca', 'KobylinskiStudio.pl Michał Kobyliński, ul. Łagowska 4/1U, 01-464 Warszawa, NIP 5342334497, tel. +48 505 594 294')}
      ${wiersz('Usługa', `${PLAN_NAMES[p.plan]} — strona rezerwacyjna z utrzymaniem przez 2 lata od uruchomienia`)}
      ${wiersz('Cena', `${PRICE_LABELS[p.plan][p.currency]} (cena końcowa, zapłacona)`)}
      ${wiersz('Numer zamówienia', p.numer.slice(0, 8))}
      ${wiersz('Data zawarcia', dataZawarcia)}
      ${wiersz('Regulamin', `wersja z ${bezRoku(dataSlownie(WERSJA_REGULAMINU))}, w całości poniżej`)}
    </table>

    <div style="background:#f9fafb;border-left:3px solid #059669;padding:0.9rem 1.1rem;border-radius:0 8px 8px 0;font-size:0.875rem;color:#374151;margin-bottom:1rem">
      <strong>Prawo odstąpienia od umowy.</strong> Jako konsument możesz odstąpić od umowy bez podania
      przyczyny do <strong>${termin}</strong> włącznie (14 dni od zawarcia umowy). Wystarczy wysłać
      oświadczenie na <a href="mailto:${KONTAKT}" style="color:#059669">${KONTAKT}</a> — zwykłą
      wiadomością albo wzorem formularza z końca regulaminu. ${zwrot(p.wczesnyStart)}
    </div>

    <p style="font-size:0.85rem;color:#374151;margin:0">
      Reklamacje i pytania: <a href="mailto:${KONTAKT}" style="color:#059669">${KONTAKT}</a> — odpowiadamy w ciągu 14 dni.
      Zachowaj tę wiadomość: jest potwierdzeniem umowy.
    </p>
    ${regulamin}
  `
}
