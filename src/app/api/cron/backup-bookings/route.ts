import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireCron } from '@/lib/cronAuth'
import { odnotujPrzebieg } from '@/lib/cronHeartbeat'
import { KOPIOWANE, KLUCZ_GLOWNY, PORCJA, zbudujPlikKopii, type TabelaKopii } from '@/lib/kopiaZapasowa'

export const runtime = 'nodejs'

const BUCKET = 'app-data'
const LATEST = 'backups/nobooking_backup_latest.json'

interface BackupFile {
  bookings_count?: number
  [k: string]: unknown
}

/**
 * Cała tabela, porcjami. Bez stronicowania PostgREST ucina wynik na `max-rows`
 * (1000) — bez błędu, więc kopia byłaby po cichu niepełna, gdy tylko
 * zablokowanych dat przybędzie.
 */
async function calaTabela(
  db: ReturnType<typeof createServiceClient>,
  tabela: TabelaKopii,
): Promise<{ wiersze: unknown[]; blad: string | null }> {
  const klucz = KLUCZ_GLOWNY[tabela] ?? 'id'
  const wiersze: unknown[] = []
  for (let od = 0; ; od += PORCJA) {
    const { data, error } = await db
      .from(tabela)
      .select('*')
      .order(klucz, { ascending: true })
      .range(od, od + PORCJA - 1)
    if (error) return { wiersze, blad: error.message }
    wiersze.push(...(data ?? []))
    if (!data || data.length < PORCJA) return { wiersze, blad: null }
  }
}

/**
 * Ile rezerwacji miała ostatnia kopia. Służy do wykrycia sytuacji, w której
 * dzisiejszy odczyt zwrócił drastycznie mniej danych niż poprzedni.
 * Zwraca null, gdy kopii jeszcze nie ma albo nie da się jej odczytać.
 */
async function poprzedniaLiczbaRezerwacji(
  db: ReturnType<typeof createServiceClient>,
): Promise<number | null> {
  try {
    const { data, error } = await db.storage.from(BUCKET).download(LATEST)
    if (error || !data) return null
    const parsed = JSON.parse(await data.text()) as BackupFile
    return typeof parsed.bookings_count === 'number' ? parsed.bookings_count : null
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const unauthorized = requireCron(request)
  if (unauthorized) return unauthorized

  const db = createServiceClient()

  // Slad po uruchomieniu: alarm o cichym zatrzymaniu crona opiera sie
  // na tym wpisie, bo brak uruchomienia nie zostawia zadnego innego sladu.
  await odnotujPrzebieg(db, request.nextUrl.pathname)
  const today = new Date().toISOString().slice(0, 10)

  const odczyty = await Promise.all(KOPIOWANE.map(async t => [t, await calaTabela(db, t)] as const))

  // Kopia niekompletna jest gorsza niż jej brak, bo daje fałszywe poczucie
  // zabezpieczenia. Każdy błąd odczytu przerywa całość PRZED zapisem.
  const bledy = odczyty.filter(([, w]) => w.blad).map(([t, w]) => `${t}: ${w.blad}`)
  if (bledy.length > 0) {
    const opis = bledy.join('; ')
    console.error('[backup-bookings] PRZERWANE — błąd odczytu:', opis)
    return NextResponse.json({ error: 'read_failed', details: opis }, { status: 500 })
  }

  const tabele = Object.fromEntries(odczyty.map(([t, w]) => [t, w.wiersze])) as Record<TabelaKopii, unknown[]>
  const bookings = tabele.bookings

  // Zabezpieczenie przed skasowaniem dobrej kopii. Gdyby odczyt zwrócił pusto
  // albo drastycznie mniej niż poprzednio — nie nadpisujemy niczego.
  // To dokładnie ten scenariusz, w którym poprzednio zniknęły rezerwacje.
  //
  // Strażnik nie odróżnia utraty danych od świadomego usunięcia, więc po
  // zamierzonej kasacie (np. wyniesienie danych innego projektu) blokuje zapis
  // już na stałe: każdy kolejny przebieg widzi ten sam spadek. Wyjściem jest
  // jawne przebazowanie — `?rebaseline=1`, chronione tym samym `CRON_SECRET`
  // co reszta trasy. Bez niego alarm o nieaktualnej kopii powtarzałby się
  // codziennie i przestałby być czytany.
  const przebazowanie = request.nextUrl.searchParams.get('rebaseline') === '1'
  const poprzednio = await poprzedniaLiczbaRezerwacji(db)
  const spadek = poprzednio !== null && poprzednio > 0 && bookings.length < poprzednio / 2

  if (spadek && !przebazowanie) {
    console.error(
      `[backup-bookings] PRZERWANE — liczba rezerwacji spadła z ${poprzednio} do ` +
      `${bookings.length}. Nie nadpisuję kopii. Sprawdź bazę. Jeśli spadek jest ` +
      `zamierzony, uruchom ponownie z ?rebaseline=1.`
    )
    return NextResponse.json(
      { error: 'suspicious_drop', previous: poprzednio, current: bookings.length, hint: 'rebaseline=1' },
      { status: 500 },
    )
  }

  if (spadek && przebazowanie) {
    // Dotychczasowa kopia trafia pod własną nazwę, zanim cokolwiek nadpiszemy.
    // Dzienne pliki i tak zostają, ale jawny ślad ułatwia późniejsze czytanie
    // historii: widać, po czym nastąpiła zmiana punktu odniesienia.
    try {
      const { data } = await db.storage.from(BUCKET).download(LATEST)
      if (data) {
        await db.storage
          .from(BUCKET)
          .upload(`backups/nobooking_backup_przed_przebazowaniem_${today}.json`, await data.text(), {
            contentType: 'application/json',
            upsert: true,
          })
      }
    } catch (err) {
      console.error('[backup-bookings] nie udało się odłożyć kopii przed przebazowaniem:', err)
    }
    console.warn(
      `[backup-bookings] PRZEBAZOWANIE — akceptuję spadek z ${poprzednio} do ${bookings.length} ` +
      `na jawne żądanie. Poprzednia kopia odłożona pod nazwą z dopiskiem „przed_przebazowaniem".`
    )
  }

  const backup = zbudujPlikKopii(
    tabele,
    new Date(),
    spadek && przebazowanie ? { przebazowanie: true, poprzednia_liczba_rezerwacji: poprzednio } : {},
  )

  const json = JSON.stringify(backup, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const filename = `backups/nobooking_backup_${today}.json`

  // Kopia dzienna najpierw. Dopiero gdy się powiedzie, ruszamy "latest" —
  // inaczej nieudany zapis mógłby zostawić latest w gorszym stanie niż był.
  const { error: bladDaty } = await db.storage
    .from(BUCKET)
    .upload(filename, blob, { upsert: true, contentType: 'application/json' })

  if (bladDaty) {
    console.error('[backup-bookings] błąd zapisu kopii dziennej:', bladDaty.message)
    return NextResponse.json({ error: bladDaty.message }, { status: 500 })
  }

  const { error: bladLatest } = await db.storage
    .from(BUCKET)
    .upload(LATEST, blob, { upsert: true, contentType: 'application/json' })

  if (bladLatest) {
    console.error('[backup-bookings] błąd zapisu latest:', bladLatest.message)
    return NextResponse.json({ error: bladLatest.message }, { status: 500 })
  }

  console.log(`[backup-bookings] zapisano → ${filename}:`, JSON.stringify(backup.liczby))

  return NextResponse.json({ ok: true, file: filename, date: today, liczby: backup.liczby })
}
