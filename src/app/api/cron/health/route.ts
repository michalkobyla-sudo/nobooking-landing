import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireCron } from '@/lib/cronAuth'
import { odnotujPrzebieg, milczaceCrony } from '@/lib/cronHeartbeat'
import { sendHealthReport } from '@/lib/email'
import { ocenStan, wymagaUwagi, raportHtml, tematRaportu, type StanSystemu } from '@/lib/health'
import { MARKER_PRZEGLADU, MAX_PROB_PROVISIONINGU } from '@/lib/provisionCheck'
import { DNI_RETENCJI } from '@/lib/checkin'
import { sprawdzNadawce } from '@/lib/sms'
import { parsujConfig } from '@/lib/configMerge'

export const runtime = 'nodejs'

/** Kolumny i tabele, bez których części systemu przestają działać.
 *  Sprawdzane wprost, bo nieuruchomiona migracja objawia się dopiero
 *  wtedy, gdy ktoś zapłaci i nie dostanie strony. */
/**
 * Kolumny i tabele, bez których jakaś funkcja przestaje działać — po cichu.
 *
 * Lista musi rosnąć razem z funkcjami. Do 2026-10-01 kończyła się na wpisach
 * z 25 września, więc agent zdrowia nie wyłapał ani brakujących kolumn poprawek
 * (cztery rundy reklamowane klientowi w mailu), ani znacznika prośby o opinię,
 * ani tabel SMS-ów. Wszystkie trzy trzeba było znaleźć ręcznie, porównując kod
 * z bazą.
 *
 * Tabele bota celowo pominięte: nie istnieją i mają nie istnieć do etapu 4,
 * a alarm powtarzany codziennie przestaje być czytany.
 */
const WYMAGANE: Array<[tabela: string, kolumna: string]> = [
  // Strony i odnowienia
  ['sites', 'expires_at'],
  ['sites', 'renewal_price_pln'],
  ['sites', 'sms_phone'],
  ['sites', 'sms_enabled'],

  // Zamówienia, provisioning i poprawki
  ['orders', 'provisioning_started_at'],
  ['orders', 'revision_token'],
  ['orders', 'revision_count'],
  ['orders', 'review_request_sent_at'],
  ['orders', 'utm_source'],
  ['orders', 'click_id'],

  // Płatności
  ['stripe_webhook_events', 'event_id'],
  ['discount_codes', 'uses_count'],

  // Funkcje pakietu Pro i obieg gościa
  ['sms_log', 'udane'],
  ['checkin_forms', 'guests_data'],
  ['guest_notifications', 'rodzaj'],
  ['reviews', 'published'],

  // Pozostałe
  ['bot_processed_messages', 'mid'],
  ['renewal_reminders', 'id'],
  // Bez tej tabeli limit żądań cicho przestaje być wspólny: proxy zawodzi
  // na otwarto i zostaje tylko licznik w pamięci instancji.
  ['rate_limits', 'koniec'],
  ['cron_runs', 'ostatni_przebieg'],
]

export async function GET(request: NextRequest) {
  const unauthorized = requireCron(request)
  if (unauthorized) return unauthorized

  const db = createServiceClient()

  // Slad po uruchomieniu: alarm o cichym zatrzymaniu crona opiera sie
  // na tym wpisie, bo brak uruchomienia nie zostawia zadnego innego sladu.
  await odnotujPrzebieg(db, request.nextUrl.pathname)
  const teraz = Date.now()
  const godzTemu = (h: number) => new Date(teraz - h * 3_600_000).toISOString()

  // ── Schemat ────────────────────────────────────────────────────────────────
  const brakiSchematu: string[] = []
  for (const [tabela, kolumna] of WYMAGANE) {
    const { error } = await db.from(tabela).select(kolumna).limit(1)
    if (error) brakiSchematu.push(`${tabela}.${kolumna}`)
  }

  // Zamowienia, ktorych cron juz nie wezmie: licznik prob dobil do limitu.
  // Prog jest wspolny z trasa provisioningu (MAX_PROB_PROVISIONINGU), zeby
  // nie zdarzylo sie, ze cron przestal probowac, a raport jeszcze milczy.
  const { data: poddane } = await db
    .from('orders')
    .select('id, provisioning_error')
    .eq('onboarding_submitted', true)
    .is('site_slug', null)
    .gte('provisioning_attempts', MAX_PROB_PROVISIONINGU)

  const zamowieniaPoddane = (poddane ?? []).map(o => ({
    id: String(o.id),
    powod: String(o.provisioning_error ?? ''),
  }))

  // Czy wszystkie crony w ogole chodza.
  const { data: przebiegi } = await db
    .from('cron_runs')
    .select('nazwa, ostatni_przebieg, przebiegi')

  // Licznik samego raportu mowi, czy mechanizm zdazyl sie zapelnic. Bez tego
  // pierwszy przebieg po migracji wypisalby alarm o kazdym cronie.
  const przebiegiRaportu = Number(
    (przebiegi ?? []).find(r => String(r.nazwa) === 'health')?.przebiegi ?? 0,
  )

  const cronyMilczace = milczaceCrony(
    (przebiegi ?? []).map(r => ({
      nazwa: String(r.nazwa),
      godzinTemu: (teraz - Date.parse(String(r.ostatni_przebieg))) / 3_600_000,
    })),
    przebiegiRaportu,
  )

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

  // ── SMS ────────────────────────────────────────────────────────────────────
  // Komplet zmiennych albo nic: brak konfiguracji to null, nie awaria, bo
  // SMS-y są funkcją pakietu Pro i dopóki nikt go nie ma, są zbędne.
  let smsDziala: boolean | null = null
  let smsNadawcaOk: boolean | null = null
  try {
    const sid = (process.env.TWILIO_ACCOUNT_SID ?? '').trim()
    const token = (process.env.TWILIO_AUTH_TOKEN ?? '').trim()
    const from = (process.env.TWILIO_FROM_NUMBER ?? '').trim()

    if (from) smsNadawcaOk = sprawdzNadawce(from).ok

    if (sid && token && from) {
      const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
        headers: { Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64') },
      })
      smsDziala = r.ok
    } else if (sid || token || from) {
      // Częściowa konfiguracja jest gorsza od żadnej: wygląda na włączoną,
      // a moduł i tak nie wyśle nic.
      console.error('[health] konfiguracja Twilio jest niekompletna')
      smsDziala = false
    }
  } catch (err) {
    console.error('[health] nie udało się sprawdzić Twilio:', err)
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

  // Strony wstrzymane przez sprawdzenie provisioningu. Marker w `notes` jest
  // jedynym śladem — zamówienie ma wypełniony `site_slug`, więc bez tego
  // wyglądałoby dokładnie jak udane.
  const { data: doPrzegladu } = await db
    .from('orders')
    .select('site_slug, notes')
    .not('site_slug', 'is', null)
    .like('notes', `%${MARKER_PRZEGLADU}%`)

  const stronyDoPrzegladu = (doPrzegladu ?? []).map((o) => {
    const linie = String(o.notes ?? '').split('\n').filter((l) => l.includes(MARKER_PRZEGLADU))
    return { slug: o.site_slug as string, powod: linie[linie.length - 1] ?? MARKER_PRZEGLADU }
  })

  // Nieudane SMS-y z ostatniej doby. Tabela może nie istnieć, dopóki migracja
  // 2026-09-29-sms.sql nie zostanie uruchomiona — brak tabeli to nie awaria SMS-ów,
  // tylko brak migracji, który i tak zgłasza kontrola schematu.
  const { data: smsBledy } = await db
    .from('sms_log')
    .select('blad')
    .eq('udane', false)
    .gte('created_at', godzTemu(24))

  const smsNieudane = Object.entries(
    (smsBledy ?? []).reduce<Record<string, number>>((acc, w) => {
      const powod = String(w.blad ?? 'nieznany').slice(0, 60)
      acc[powod] = (acc[powod] ?? 0) + 1
      return acc
    }, {}),
  ).map(([powod, ile]) => ({ powod, ile }))

  // ── Retencja danych check-in (RODO) ───────────────────────────────────────
  const granicaRetencji = new Date(teraz - (DNI_RETENCJI + 1) * 86_400_000)
    .toISOString().slice(0, 10)

  const { data: zakonczone } = await db
    .from('bookings')
    .select('id')
    .lt('check_out', granicaRetencji)

  let checkinyPoRetencji = 0
  if (zakonczone && zakonczone.length > 0) {
    const { count } = await db
      .from('checkin_forms')
      .select('id', { count: 'exact', head: true })
      .in('booking_id', zakonczone.map(b => b.id))
    checkinyPoRetencji = count ?? 0
  }

  // ── Zaległe przypomnienia przed przyjazdem ────────────────────────────────
  // Patrzymy na wczorajszy termin, nie dzisiejszy: cron przypomnień chodzi
  // o 08:00, a ten raport o 06:00 — dzisiejsze wysyłki jeszcze nie poszły.
  const wczorajszyTermin = new Date(teraz + (7 - 1) * 86_400_000).toISOString().slice(0, 10)

  const { data: doPrzypomnienia } = await db
    .from('bookings')
    .select('id')
    .eq('status', 'confirmed')
    .eq('check_in', wczorajszyTermin)

  let przypomnieniaZalegle = 0
  if (doPrzypomnienia && doPrzypomnienia.length > 0) {
    const { data: wyslane } = await db
      .from('guest_notifications')
      .select('booking_id')
      .eq('rodzaj', 'przed_przyjazdem')
      .in('booking_id', doPrzypomnienia.map(b => b.id))

    const maSlad = new Set((wyslane ?? []).map(w => w.booking_id as string))
    przypomnieniaZalegle = doPrzypomnienia.filter(b => !maSlad.has(b.id as string)).length
  }

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
    .select('slug, stripe_onboarded, expires_at, active, config')
    .eq('active', true)

  const stronyBezStripe = (strony ?? [])
    .filter(s => s.stripe_onboarded !== true)
    .map(s => s.slug as string)

  // Zdjecia zastepcze z generatora (`PLACEHOLDER_PHOTOS` w generate-site.ts)
  // poznaje sie po hoscie. Strona z nimi dziala, tylko pokazuje cudzy
  // apartament — stad `info`, a nie ostrzezenie.
  const stronyZeZdjeciamiZastepczymi = (strony ?? [])
    .filter(s => {
      const config = parsujConfig(s.config)
      const photos = Array.isArray(config?.photos) ? config.photos : []
      return photos.some(p =>
        typeof (p as { url?: unknown })?.url === 'string' &&
        (p as { url: string }).url.includes('images.unsplash.com'),
      )
    })
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
    zamowieniaPoddane,
    stronyDoPrzegladu,
    smsNieudane,
    smsDziala,
    smsNadawcaOk,
    checkinyPoRetencji,
    przypomnieniaZalegle,
    rezerwacjePendingStare: rezerwacjePendingStare ?? 0,
    stronyBezStripe,
    stronyZeZdjeciamiZastepczymi,
    wygasajaceSubskrypcje,
    zdarzeniaStripe7dni: zdarzeniaStripe7dni ?? 0,
    rezerwacje7dni: rezerwacje7dni ?? 0,
    brakiSchematu,
    cronyMilczace,
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
