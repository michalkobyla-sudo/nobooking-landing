/**
 * Dokąd odesłać właściciela po zalogowaniu.
 *
 * Trasy chronione sesją odsyłają na ekran logowania z parametrem `powrot`,
 * żeby po wpisaniu hasła wrócić tam, gdzie właściciel szedł. Bez tego
 * `/api/connect/onboard` — który od 2026-10-03 wymaga sesji — wyrzucał
 * z wygasłego linku onboardingowego Stripe'a na stronę logowania, a stamtąd
 * do panelu. Właściciel musiał sam odnaleźć przycisk, od którego zaczął.
 *
 * **Parametr pochodzi z adresu, czyli od kogokolwiek.** Odnośnik
 * `/sites/x/admin/login?powrot=https://zly.example/phishing` wyglądałby jak
 * nasz, a po zalogowaniu wyrzucałby poza serwis — z wiarygodnością kupioną
 * naszą domeną. Dlatego przepuszczamy wyłącznie ścieżki w obrębie tej samej
 * witryny i tylko wewnątrz katalogu tej jednej strony.
 */

/** Adres panelu — dokąd idziemy, gdy nie ma dokąd wracać. */
export function panelWlasciciela(slug: string): string {
  return `/sites/${slug}/admin`
}

/**
 * Sprawdza `powrot` i zwraca adres do przekierowania.
 *
 * Przyjmuje tylko ścieżkę względną zaczynającą się od `/sites/<slug>/`
 * albo `/api/` z tym samym slugiem. Cokolwiek innego — adres bezwzględny,
 * inny slug, `//obcy.host`, `\\` w roli ukośnika — ląduje w panelu.
 */
export function bezpiecznyPowrot(powrot: string | null | undefined, slug: string): string {
  const panel = panelWlasciciela(slug)
  if (!powrot) return panel

  const p = powrot.trim()

  // Musi być ścieżką względną. `//host` i `/\host` przeglądarki traktują
  // jak adres bezwzględny, mimo że zaczynają się od ukośnika.
  if (!p.startsWith('/')) return panel
  if (p.startsWith('//') || p.startsWith('/\\')) return panel

  // Znaki sterujące w nagłówku `Location` pozwalają dokleić kolejny nagłówek.
  if (/[\u0000-\u001f\u007f]/.test(p)) return panel

  // Slug w adresie musi być tym, na który się logujemy. Inaczej właściciel
  // jednej strony odsyłałby właściciela innej w głąb cudzego panelu.
  const dozwolone = [`/sites/${slug}/`, `/api/sites/${slug}/`, `/api/connect/`]
  if (!dozwolone.some(prefiks => p.startsWith(prefiks))) return panel

  // `/api/connect/*` dotyczy jednej strony przez parametr, nie przez ścieżkę,
  // więc slug sprawdzamy w zapytaniu.
  if (p.startsWith('/api/connect/') && !p.includes(`slug=${slug}`)) return panel

  // Powrót na sam ekran logowania zapętliłby formularz.
  if (p.startsWith(`/sites/${slug}/admin/login`)) return panel

  return p
}
