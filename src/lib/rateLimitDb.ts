/**
 * Limit żądań na wspólnym magazynie.
 *
 * Licznik w pamięci (`rateLimit.ts`) liczy osobno na każdej instancji, a Vercel
 * uruchamia ich wiele — „10 prób logowania na 5 minut" znaczyło w praktyce
 * kilkadziesiąt. Tutaj zliczanie robi jedna funkcja w bazie, niepodzielnie.
 *
 * Czysty `fetch`, bez `supabase-js`: ten kod wykonuje się w warstwie brzegowej
 * przy każdym chronionym żądaniu, a cała potrzebna operacja to jedno wywołanie
 * RPC. Klucz anonimowy wystarcza, bo funkcja jest `security definer`.
 *
 * **Zawodzimy na otwarto.** Gdy baza nie odpowie, przepuszczamy żądanie.
 * Odwrotna decyzja oznaczałaby, że awaria Supabase zatrzymuje rezerwacje
 * i płatności — czyli drobna usterka staje się przestojem. Limit ma odcinać
 * automaty, a nie być kolejnym pojedynczym punktem awarii. Licznik w pamięci
 * zostaje jako druga linia i działa dalej, nawet gdy ta zawiedzie.
 */

/** Po tylu milisekundach odpuszczamy — limit nie może opóźniać rezerwacji. */
const LIMIT_CZASU_MS = 1200

export interface WynikLimitu {
  /** Czy odciąć żądanie. */
  przekroczono: boolean
  /** Czy odpowiedź pochodzi z bazy. `false` = zadziałał awaryjny licznik lokalny. */
  zBazy: boolean
}

function config(): { url: string; klucz: string } | null {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim()
  const klucz = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim()
  return url && klucz ? { url, klucz } : null
}

export async function czyPrzekroczonoWBazie(
  klucz: string,
  maks: number,
  oknoMs: number,
): Promise<WynikLimitu> {
  const c = config()
  if (!c) return { przekroczono: false, zBazy: false }

  const przerwij = AbortSignal.timeout(LIMIT_CZASU_MS)

  try {
    const odp = await fetch(`${c.url}/rest/v1/rpc/sprawdz_limit`, {
      method: 'POST',
      headers: {
        apikey: c.klucz,
        Authorization: `Bearer ${c.klucz}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        p_klucz: klucz,
        p_maks: maks,
        p_okno_s: Math.max(1, Math.round(oknoMs / 1000)),
      }),
      signal: przerwij,
    })

    if (!odp.ok) {
      // Najczęstszy powód: nieuruchomiona migracja. Raport stanu systemu
      // sprawdza obecność tabeli osobno, więc to nie zostanie niezauważone.
      console.error(`[rate-limit] baza odrzuciła zapytanie (${odp.status})`)
      return { przekroczono: false, zBazy: false }
    }

    const dane = await odp.json() as unknown
    return { przekroczono: dane === true, zBazy: true }

  } catch (err) {
    console.error('[rate-limit] baza nie odpowiedziała:', err instanceof Error ? err.message : String(err))
    return { przekroczono: false, zBazy: false }
  }
}
