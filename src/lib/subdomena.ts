/**
 * Ścieżka wewnętrzna dla żądania na subdomenie apartamentu
 * (`casa-sol.nobooking.eu/x` → `/sites/casa-sol/x`), albo null, gdy żądanie
 * ma przejść bez przepisywania.
 *
 * Bez przepisywania przechodzą:
 * - `/api/*` — slug jest już w ścieżce, a prefiks dawał 404 formularza rezerwacji;
 * - ścieżki zaczynające się od `/sites/<ta-subdomena>` (dla demo: `/demo`) — dzięki temu link
 *   zbudowany jako `/sites/slug/…` działa i na domenie głównej, i na
 *   subdomenie. Wcześniej prefiks doklejał się drugi raz.
 */
export function sciezkaDlaSubdomeny(subdomena: string, sciezka: string): string | null {
  if (sciezka.startsWith('/api/')) return null
  const wlasna = subdomena === 'demo' ? '/demo' : `/sites/${subdomena}`
  if (sciezka === wlasna || sciezka.startsWith(`${wlasna}/`)) return null
  return `${wlasna}${sciezka === '/' ? '' : sciezka}`
}
