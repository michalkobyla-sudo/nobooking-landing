/**
 * Adres serwisu (`https://nobooking.eu`) — jedno miejsce zamiast 17 kopii.
 *
 * Produkcyjne `NEXT_PUBLIC_SITE_URL` kończyło się znakiem nowej linii
 * (sprawdzone 2026-11-20), a cztery z kopii go nie obcinały — przekierowanie
 * po błędzie podłączania Stripe dawało 500 zamiast komunikatu. Adres zawsze
 * bez `www`: przekierowanie 308 z `www` zabija webhooki (Stripe nie podąża).
 */
export function adresSerwisu(env: string | undefined = process.env.NEXT_PUBLIC_SITE_URL): string {
  return (env || 'https://nobooking.eu').trim().replace(/\/+$/, '')
}

/** Domena główna dla subdomen stron (`slug.nobooking.eu`). */
export function domenaGlowna(env: string | undefined = process.env.NEXT_PUBLIC_ROOT_DOMAIN): string {
  return (env || 'nobooking.eu').trim()
}
