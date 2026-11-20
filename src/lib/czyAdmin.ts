/**
 * Czy zalogowany użytkownik Supabase Auth jest administratorem platformy.
 *
 * **Dlaczego to istnieje.** Do 2026-11-21 panel admina wpuszczał *każdego*
 * zalogowanego użytkownika Auth (`if (!user)`), a provisioning zakładał konto
 * Auth każdemu klientowi i wysyłał mu hasło mailem. Klient mógł więc wejść na
 * `/admin/login` i czytać dane wszystkich klientów. Do tego publiczna rejestracja
 * w Supabase była włączona — konto mógł założyć każdy z kluczem anon ze strony.
 *
 * Sprawdzamy tożsamość, nie samo zalogowanie. Lista po identyfikatorach kont,
 * nie po e-mailach: identyfikator nadaje Supabase i nikt go sobie nie wybierze.
 * `ADMIN_USER_IDS` (po przecinku) nadpisuje listę domyślną. Bez dopasowania —
 * odmowa. Czyste, bez importów: działa w `proxy.ts` i w trasach API.
 */

/** Konto administratora (Michał), utworzone 2026-05-22. Identyfikator nie jest tajny. */
const DOMYSLNI_ADMINI = ['74a4858d-e785-463c-9669-9c23c144e8d3']

export function identyfikatoryAdminow(env: string | undefined = process.env.ADMIN_USER_IDS): string[] {
  const z = (env ?? '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
  return z.length > 0 ? z : DOMYSLNI_ADMINI
}

export function czyAdmin(
  user: { id?: string | null } | null | undefined,
  dozwoleni: string[] = identyfikatoryAdminow(),
): boolean {
  const id = user?.id?.trim().toLowerCase()
  return Boolean(id) && dozwoleni.includes(id!)
}
