import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireCron } from '@/lib/cronAuth'

export const runtime = 'nodejs'

const BUCKET = 'app-data'
const LATEST = 'backups/nobooking_backup_latest.json'

interface BackupFile {
  exported_at: string
  bookings_count: number
  bookings: unknown[]
  [k: string]: unknown
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
  const today = new Date().toISOString().slice(0, 10)

  const [sitesRes, bookingsRes, blockedRes, ordersRes] = await Promise.all([
    db.from('sites').select('id, slug').order('created_at', { ascending: true }),
    db.from('bookings').select('*').order('check_in', { ascending: true }),
    db.from('blocked_dates').select('*').order('date', { ascending: true }),
    // Kolumny zgodne ze schematem. Wcześniej było tu customer_email
    // i customer_name — takie kolumny nie istnieją, więc zapytanie zawodziło,
    // a backup po cichu zapisywał zero zamówień.
    db.from('orders').select('id, first_name, last_name, email, status, created_at'),
  ])

  // Kopia niekompletna jest gorsza niż jej brak, bo daje fałszywe poczucie
  // zabezpieczenia. Każdy błąd odczytu przerywa całość PRZED zapisem.
  const bledy = [
    ['sites', sitesRes.error],
    ['bookings', bookingsRes.error],
    ['blocked_dates', blockedRes.error],
    ['orders', ordersRes.error],
  ].filter(([, e]) => e) as Array<[string, { message: string }]>

  if (bledy.length > 0) {
    const opis = bledy.map(([t, e]) => `${t}: ${e.message}`).join('; ')
    console.error('[backup-bookings] PRZERWANE — błąd odczytu:', opis)
    return NextResponse.json({ error: 'read_failed', details: opis }, { status: 500 })
  }

  const bookings = bookingsRes.data ?? []

  // Zabezpieczenie przed skasowaniem dobrej kopii. Gdyby odczyt zwrócił pusto
  // albo drastycznie mniej niż poprzednio — nie nadpisujemy niczego.
  // To dokładnie ten scenariusz, w którym poprzednio zniknęły rezerwacje.
  const poprzednio = await poprzedniaLiczbaRezerwacji(db)
  if (poprzednio !== null && poprzednio > 0 && bookings.length < poprzednio / 2) {
    console.error(
      `[backup-bookings] PRZERWANE — liczba rezerwacji spadła z ${poprzednio} do ` +
      `${bookings.length}. Nie nadpisuję kopii. Sprawdź bazę.`
    )
    return NextResponse.json(
      { error: 'suspicious_drop', previous: poprzednio, current: bookings.length },
      { status: 500 },
    )
  }

  const backup = {
    exported_at: new Date().toISOString(),
    sites: sitesRes.data ?? [],
    bookings_count: bookings.length,
    bookings,
    blocked_dates_count: blockedRes.data?.length ?? 0,
    blocked_dates: blockedRes.data ?? [],
    orders_count: ordersRes.data?.length ?? 0,
    orders: ordersRes.data ?? [],
  }

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

  console.log(
    `[backup-bookings] zapisano ${backup.bookings_count} rezerwacji, ` +
    `${backup.orders_count} zamówień, ${sitesRes.data?.length ?? 0} stron → ${filename}`
  )

  return NextResponse.json({
    ok: true,
    file: filename,
    sites: sitesRes.data?.length ?? 0,
    bookings: backup.bookings_count,
    orders: backup.orders_count,
    date: today,
  })
}
