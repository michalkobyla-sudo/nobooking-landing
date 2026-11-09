/**
 * Wersje dokumentów prawnych, które klient akceptuje przy zamówieniu.
 *
 * Wersja to data „Obowiązuje od” z nagłówka dokumentu. Trafia do metadanych
 * sesji płatności Stripe razem z zamówieniem — to jedyny trwały ślad tego,
 * **który** regulamin zaakceptował klient. Regulamin mówi, że do umowy stosuje
 * się wersję z dnia zakupu, więc bez tego śladu nie dałoby się ustalić, co
 * obowiązuje w sporze.
 *
 * Zmieniając treść `docs/PRAWNE-*.md`, zmień datę w dokumencie i tutaj —
 * `dokumentyPrawne.test.ts` nie przepuści rozjazdu.
 */
export const WERSJA_REGULAMINU = '2026-11-09'
export const WERSJA_POLITYKI = '2026-11-09'

const MIESIACE = ['stycznia', 'lutego', 'marca', 'kwietnia', 'maja', 'czerwca', 'lipca',
  'sierpnia', 'września', 'października', 'listopada', 'grudnia']

/** `2026-11-09` → `9 listopada 2026 r.` — tak, jak data stoi w dokumencie. */
export function dataSlownie(iso: string): string {
  const [r, m, d] = iso.split('-').map(Number)
  return `${d} ${MIESIACE[m - 1]} ${r} r.`
}
