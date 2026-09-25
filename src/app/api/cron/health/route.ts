import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireCron } from '@/lib/cronAuth'
import { sendHealthReport } from '@/lib/email'
import { ocenStan, wymagaUwagi, raportHtml, tematRaportu, type StanSystemu } from '@/lib/health'

export const runtime = 'nodejs'

/** Kolumny i tabele, bez których części systemu przestają działać.
 *  Sprawdzane wprost, bo nieuruchomiona migracja objawia się dopiero
 *  wtedy, gdy ktoś zapłaci i nie dostanie strony. */
const WYMAGANE: Array<[tabela: string, kolumna: string]> = [
  ['sites', 'expires_at'],
  ['sites', 'renewal_price_pln'],
  ['orders', 'provisioning_started_at'],
  ['stripe_webhook_events', 'event_id'],
  ['bot_processed_messages', 'mid'],
  ['renewal_reminders', 'id'],
]

export async function GET(request: NextRequest) {
  const unauthorized = requireCron(request)
  if (unauthorized) return unauthorized

  const db = createServiceClient()
  const teraz = Date.now()
  const godzTemu = (h: number) => new Date(teraz - h * 3_600_000).toISOString()

  // ── Schemat ────────────────────────────────────────────────────────────────
  const brakiSchematu: string[] = []
  for (const [tabela, kolumna] of WYMAGANE) {
    const { error } = await db.from(tabela).select(kolumna).limit(1)
    if (error) brakiSchematu.push(`${tabela}.${kolumna}`)
  }

  // ── Kopia zapasowa ─────────────────────────────────────────────────────────
  let ostatniaKopiaGodzinTemu: number | null = null
  const { data: pliki } = await db.storage
    .from('app-data')
    .list('backups', { limit: 100, sortBy: { column: 'created_at', order: 'desc' } })

  const najnowsza = (pliki ?? [])
    .map(f => Date.parse(f.created_at ?? ''))
    .filter(t => !Number.isNaN(t))
    .sort((a, b) => b - a)[0]

  if (najnowsza) ostatniaKopiaGodzinTemu = (teraz - najnowsza) / 3_600_000

  // ── Poczta ─────────────────────────────────────────────────────────────────
  // Każda wysyłka w aplikacji jest w try/catch, więc niedziałający klucz nie
  // przewraca niczego — po prostu maile cicho nie wychodzą.
  let mailDziala: boolean | null = null
  try {
    const klucz = (process.env.BREVO_API_KEY ?? '').trim()
    if (klucz) {
      const r = await fetch('https://api.brevo.com/v3/account', { headers: { 'api-key': klucz } })
      mailDziala = r.ok
    } else {
      mailDziala = false
    }
  } catch (err) {
    console.error('[health] nie udało się sprawdzić poczty:', err)
  }

  // ── Generowanie stron i bot ────────────────────────────────────────────────
  let modelDziala: boolean | null = null
  try {
    const klucz = (process.env.ANTHROPIC_API_KEY ?? '').trim()
    if (!klucz) modelDziala = false
    else {
      const r = await fetch('https://api.anthropic.com/v1/models?limit=1', {
        headers: { 'x-api-key': klucz, 'anthropic-version': '2023-06-01' },
      })
      modelDziala = r.ok
    }
  } catch (err) {
    console.error('[health] nie udało się sprawdzić klucza Anthropic:', err)
  }

  const { data: ustawieniaBota } = await db
    .from('bot_settings')
    .select('enabled')
    .eq('id', 'default')
    .maybeSingle()
  const botWlaczony = ustawieniaBota?.enabled === true

  let botToken: boolean | null = null
  if (botWlaczony) {
    try {
      const t = (process.env.FACEBOOK_PAGE_ACCESS_TOKEN ?? '').trim()
      if (!t) botToken = false
      else {
        const r = await fetch(`https://graph.facebook.com/v21.0/me?fields=id&access_token=${encodeURIComponent(t)}`)
        botToken = r.ok
      }
    } catch (err) {
      console.error('[health] nie udało się sprawdzić tokenu Facebooka:', err)
    }
  }

  // ── Zamówienia i rezerwacje ────────────────────────────────────────────────
  const { count: zamowieniaUtkniete } = await db
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .eq('onboarding_submitted', true)
    .is('site_slug', null)

  const { count: rezerwacjePendingStare } = await db
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending')
    .lt('created_at', godzTemu(3))

  const { count: rezerwacje7dni } = await db
    .from('bookings')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', godzTemu(24 * 7))

  const { count: zdarzeniaStripe7dni } = await db
    .from('stripe_webhook_events')
    .select('event_id', { count: 'exact', head: true })
    .gte('processed_at', godzTemu(24 * 7))

  // ── Strony ─────────────────────────────────────────────────────────────────
  const { data: strony } = await db
    .from('sites')
    .select('slug, stripe_onboarded, expires_at, active')
    .eq('active', true)

  const stronyBezStripe = (strony ?? [])
    .filter(s => s.stripe_onboarded !== true)
    .map(s => s.slug as string)

  const wygasajaceSubskrypcje = (strony ?? [])
    .flatMap(s => {
      if (!s.expires_at) return []
      const dni = Math.round((Date.parse(s.expires_at as string) - teraz) / 86_400_000)
      return dni <= 60 ? [{ slug: s.slug as string, dni }] : []
    })
    .sort((a, b) => a.dni - b.dni)

  const stan: StanSystemu = {
    ostatniaKopiaGodzinTemu,
    zamowieniaUtkniete: zamowieniaUtkniete ?? 0,
    rezerwacjePendingStare: rezerwacjePendingStare ?? 0,
    stronyBezStripe,
    wygasajaceSubskrypcje,
    zdarzeniaStripe7dni: zdarzeniaStripe7dni ?? 0,
    rezerwacje7dni: rezerwacje7dni ?? 0,
    brakiSchematu,
    mailDziala,
    modelDziala,
    botWlaczony,
    botToken,
  }

  const znaleziska = ocenStan(stan)
  const data = new Date(teraz).toISOString().slice(0, 10)

  // Mail tylko wtedy, gdy jest o czym pisać. Codzienny raport „wszystko OK"
  // przestaje się czytać po tygodniu, a wtedy nie zauważa się tego jednego,
  // który jest ważny.
  let wyslano = false
  if (wymagaUwagi(znaleziska)) {
    try {
      await sendHealthReport(tematRaportu(znaleziska), raportHtml(znaleziska, data))
      wyslano = true
    } catch (err) {
      console.error('[health] nie udało się wysłać raportu:', err)
    }
  }

  console.log(`[health] ${data}: znalezisk ${znaleziska.length}, mail wysłany: ${wyslano}`)

  return NextResponse.json({ ok: true, data, wyslano, znaleziska, stan })
}
