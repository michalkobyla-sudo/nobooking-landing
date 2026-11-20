/**
 * Subdomena `slug.nobooking.eu` dla nowej strony klienta.
 *
 * **Dlaczego każda osobno.** Wpis DNS z gwiazdką (`*.nobooking.eu` → Vercel)
 * stoi u Porkbuna, a Vercel wystawia jeden certyfikat na wszystkie subdomeny
 * tylko przy własnych serwerach nazw. Przeniesienie DNS oznaczałoby odtwarzanie
 * poczty. Subdomena dodana do projektu z osobna dostaje własny certyfikat —
 * sprawdzone 2026-11-19 na `demo.nobooking.eu`: certyfikat po 10 sekundach.
 *
 * Nigdy nie rzuca. Brak subdomeny nie może zatrzymać provisioningu — strona
 * i tak działa pod `nobooking.eu/sites/<slug>`.
 */

// Identyfikatory projektu i zespołu nie są tajne (stoją w .vercel/project.json).
const PROJEKT = process.env.VERCEL_PROJECT_ID || 'prj_VyX0b86rAXDiucLH5B3yKBOvcmOG'
const ZESPOL = process.env.VERCEL_TEAM_ID || 'team_T3ET04nCtZDBadEbLlCgdhqW'
const DOMENA = 'nobooking.eu'

/** Adresy, które coś już znaczą albo mogą znaczyć. */
const ZAREZERWOWANE = new Set(['www', 'demo', 'api', 'admin', 'app', 'mail', 'poczta', 'panel', 'static', 'cdn'])

export type WynikSubdomeny = { ok: true } | { ok: false; powod: string }

type Pobieracz = (url: string, init: RequestInit) => Promise<Response>

export async function dodajSubdomene(slug: string, pobierz: Pobieracz = fetch): Promise<WynikSubdomeny> {
  if (!/^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/.test(slug)) return { ok: false, powod: 'zly_slug' }
  if (ZAREZERWOWANE.has(slug)) return { ok: false, powod: 'zarezerwowana' }

  const token = (process.env.VERCEL_API_TOKEN ?? '').trim()
  if (!token) return { ok: false, powod: 'brak_tokenu' }

  let odp: Response
  try {
    odp = await pobierz(`https://api.vercel.com/v10/projects/${PROJEKT}/domains?teamId=${ZESPOL}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `${slug}.${DOMENA}` }),
    })
  } catch {
    return { ok: false, powod: 'siec' }
  }
  if (odp.ok) return { ok: true }

  const blad = await odp.json().catch(() => ({})) as { error?: { code?: string; message?: string } }
  const powod = `http_${odp.status}_${blad.error?.code ?? 'nieznany'}`

  // „Already” znaczy dwie różne rzeczy: domena jest już w tym projekcie
  // (ponowiony provisioning — w porządku) albo w innym (awaria). Tekst błędu
  // tego nie rozstrzyga, więc pytamy o domenę wprost w naszym projekcie.
  if (/already/i.test(`${blad.error?.code ?? ''} ${blad.error?.message ?? ''}`)) {
    try {
      const czyNasza = await pobierz(
        `https://api.vercel.com/v9/projects/${PROJEKT}/domains/${slug}.${DOMENA}?teamId=${ZESPOL}`,
        { headers: { Authorization: `Bearer ${token}` } },
      )
      if (czyNasza.ok) return { ok: true }
    } catch {
      return { ok: false, powod: 'siec' }
    }
  }
  return { ok: false, powod }
}

export type StanTokenu = 'dziala' | 'nie_dziala' | 'brak' | 'nieznany'

/**
 * Czy token faktycznie pozwala czytać domeny projektu. Pytamy o
 * `demo.nobooking.eu`, które na pewno jest w projekcie (dodane 2026-11-19).
 */
export async function sprawdzTokenVercel(pobierz: Pobieracz = fetch): Promise<StanTokenu> {
  const token = (process.env.VERCEL_API_TOKEN ?? '').trim()
  if (!token) return 'brak'
  try {
    const odp = await pobierz(
      `https://api.vercel.com/v9/projects/${PROJEKT}/domains/demo.${DOMENA}?teamId=${ZESPOL}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    if (odp.ok) return 'dziala'
    return odp.status >= 500 ? 'nieznany' : 'nie_dziala'
  } catch {
    return 'nieznany'
  }
}
