import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireCron } from '@/lib/cronAuth'
import { odnotujPrzebieg } from '@/lib/cronHeartbeat'
import { sendPreArrivalReminder, sendReviewRequest, type BookingEmailData } from '@/lib/email'

export const maxDuration = 120

/** Ile dni przed przyjazdem idzie przypomnienie. */
const DNI_PRZED_PRZYJAZDEM = 7

/** Ile dni po wyjeździe pytamy o opinię. Za wcześnie — gość jeszcze w drodze. */
const DNI_PO_WYJEZDZIE = 2

type Rodzaj = 'przed_przyjazdem' | 'prosba_o_opinie'

function przesunDni(ile: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + ile)
  return d.toISOString().slice(0, 10)
}

/**
 * Powiadomienia do gości: przypomnienie przed przyjazdem i prośba o opinię.
 *
 * Jednokrotność wysyłki gwarantuje klucz unikalny `(booking_id, rodzaj)`
 * w `guest_notifications`, a nie sprawdzenie w kodzie. Ślad zapisujemy
 * **przed** wysyłką: przy powtórzonym wywołaniu crona drugi przebieg odbije
 * się o klucz i nie wyśle niczego. Ceną jest to, że nieudany mail nie zostanie
 * ponowiony automatycznie — świadomy wybór, bo gość woli nie dostać
 * przypomnienia niż dostać je pięć razy.
 */
export async function GET(request: NextRequest) {
  const unauthorized = requireCron(request)
  if (unauthorized) return unauthorized

  const db = createServiceClient()

  // Slad po uruchomieniu: alarm o cichym zatrzymaniu crona opiera sie
  // na tym wpisie, bo brak uruchomienia nie zostawia zadnego innego sladu.
  await odnotujPrzebieg(db, request.nextUrl.pathname)
  const wyniki = { przed_przyjazdem: 0, prosba_o_opinie: 0, bledy: [] as string[] }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://nobooking.eu').trim().replace(/\/$/, '')

  /** Zaklepuje wysyłkę. `false` oznacza, że ktoś już ją wykonał. */
  async function zaklep(bookingId: string, rodzaj: Rodzaj): Promise<boolean> {
    const { error } = await db.from('guest_notifications').insert({ booking_id: bookingId, rodzaj })
    if (!error) return true
    // 23505 = klucz unikalny, czyli powtórka. Wszystko inne to prawdziwy błąd.
    if (error.code !== '23505') {
      console.error(`[guest-reminders] zaklepanie ${rodzaj} dla ${bookingId} nie powiodło się:`, error.message)
      wyniki.bledy.push(`${rodzaj}:${bookingId}:${error.message}`)
    }
    return false
  }

  // ── Przypomnienie przed przyjazdem ──────────────────────────────────────────
  const zaTydzien = przesunDni(DNI_PRZED_PRZYJAZDEM)
  const { data: przyjazdy, error: bladPrzyjazdow } = await db
    .from('bookings')
    .select('id, site_id, guest_name, guest_email, check_in, check_out, total_price, currency, discount_code')
    .eq('status', 'confirmed')
    .eq('check_in', zaTydzien)

  if (bladPrzyjazdow) {
    console.error('[guest-reminders] odczyt przyjazdów nie powiódł się:', bladPrzyjazdow.message)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  for (const b of przyjazdy ?? []) {
    // Strona najpierw, zaklepanie potem. Odwrotna kolejność zostawiałaby ślad
    // wysyłki dla rezerwacji bez strony — wiadomość nie poszłaby nigdy,
    // a ponowienie byłoby już zablokowane.
    const { data: strona } = await db
      .from('sites')
      .select('slug, plan, config')
      .eq('id', b.site_id)
      .single()
    if (!strona) continue

    if (!(await zaklep(b.id as string, 'przed_przyjazdem'))) continue

    const nazwa = (strona.config as { name?: string } | null)?.name ?? (strona.slug as string)
    // Link do check-inu ma sens tylko tam, gdzie check-in w ogóle istnieje.
    const linkCheckin = strona.plan === 'pro'
      ? `${siteUrl}/sites/${strona.slug as string}/guest/${b.id as string}/checkin`
      : null

    try {
      await sendPreArrivalReminder({
        booking: b as unknown as BookingEmailData,
        slug: strona.slug as string,
        nazwaApartamentu: nazwa,
        linkCheckin,
      })
      wyniki.przed_przyjazdem += 1
    } catch (err) {
      const powod = err instanceof Error ? err.message : String(err)
      console.error(`[guest-reminders] przypomnienie dla ${b.id as string} nie wyszło:`, powod)
      wyniki.bledy.push(`przed_przyjazdem:${b.id as string}:${powod}`)
    }
  }

  // ── Prośba o opinię ─────────────────────────────────────────────────────────
  const poWyjezdzie = przesunDni(-DNI_PO_WYJEZDZIE)
  const { data: wyjazdy } = await db
    .from('bookings')
    .select('id, site_id, guest_name, guest_email, check_in, check_out, total_price, currency, discount_code')
    .in('status', ['confirmed', 'completed'])
    .eq('check_out', poWyjezdzie)

  for (const b of wyjazdy ?? []) {
    const { data: strona } = await db
      .from('sites')
      .select('slug, config')
      .eq('id', b.site_id)
      .single()
    if (!strona) continue

    if (!(await zaklep(b.id as string, 'prosba_o_opinie'))) continue

    try {
      await sendReviewRequest({
        booking: b as unknown as BookingEmailData,
        slug: strona.slug as string,
        nazwaApartamentu: (strona.config as { name?: string } | null)?.name ?? (strona.slug as string),
      })
      wyniki.prosba_o_opinie += 1
    } catch (err) {
      const powod = err instanceof Error ? err.message : String(err)
      console.error(`[guest-reminders] prośba o opinię dla ${b.id as string} nie wyszła:`, powod)
      wyniki.bledy.push(`prosba_o_opinie:${b.id as string}:${powod}`)
    }
  }

  return NextResponse.json(wyniki)
}
