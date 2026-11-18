import fs from 'fs'
import path from 'path'

/**
 * Treść regulaminu do maili — tylko po stronie serwera.
 *
 * Na Vercelu plik musi trafić do paczki funkcji: dopisany w
 * `outputFileTracingIncludes` (next.config.ts) dla każdej trasy, która tego
 * używa. Brak pliku nie może zatrzymać maila onboardingowego, więc zwracamy
 * null i krzyczymy w logu — a raport zdrowia sprawdza to codziennie.
 */
export function regulaminMarkdown(): string | null {
  try {
    return fs.readFileSync(path.join(process.cwd(), 'docs', 'PRAWNE-regulamin.md'), 'utf8')
  } catch (err) {
    console.error('[regulamin] nie udało się wczytać docs/PRAWNE-regulamin.md:', err)
    return null
  }
}
