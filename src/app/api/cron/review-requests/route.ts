import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireCron } from '@/lib/cronAuth'
import { odnotujPrzebieg } from '@/lib/cronHeartbeat'
import type { Order } from '@/lib/types'

/**
 * Prośba o opinię **o Nobookingu** — do właściciela apartamentu, czyli naszego
 * klienta. Nie mylić z opiniami gości o apartamencie: te zbiera cron
 * `guest-reminders` (`prosba_o_opinie`).
 *
 * Codziennie o 10:00 UTC. Wysyłka trzy dni po uruchomieniu strony.
 *
 * Do 2026-09-30 ten cron **nie wysłał ani jednej wiadomości**. Szukał zamówień
 * w statusie `completed`, a ten status ustawia wyłącznie człowiek w panelu
 * admina — nic w kodzie go nie nadaje. Do tego okno ±12 h wokół „trzy dni temu"
 * przy dziennym cyklu pozwalało trafić w to samo zamówienie dwa razy.
 *
 * Teraz rozstrzyga znacznik `orders.review_request_sent_at`: pusty znaczy
 * „jeszcze nie poszła". Niezależny od statusu i od szerokości okna.
 */
export async function GET(request: NextRequest) {
  const unauthorized = requireCron(request)
  if (unauthorized) return unauthorized

  const supabase = createServiceClient()

  // Slad po uruchomieniu: alarm o cichym zatrzymaniu crona opiera sie
  // na tym wpisie, bo brak uruchomienia nie zostawia zadnego innego sladu.
  await odnotujPrzebieg(supabase, request.nextUrl.pathname)

  // Trzy dni od uruchomienia strony, bez górnego ograniczenia: jeśli cron
  // nie zadziałał wczoraj, nadrobi dziś. Znacznik pilnuje jednokrotności.
  const trzyDniTemu = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()

  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .not('site_slug', 'is', null)
    .not('site_generated_at', 'is', null)
    .lte('site_generated_at', trzyDniTemu)
    .is('review_request_sent_at', null)
    .limit(20)

  if (error) {
    console.error('[cron/review-requests] db error:', error)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  if (!orders || orders.length === 0) {
    return NextResponse.json({ sent: 0, message: 'nic do wyslania' })
  }

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://nobooking.eu').trim().replace(/\/$/, '')
  const apiKey = process.env.BREVO_API_KEY

  let sent = 0
  const errors: string[] = []

  for (const order of orders as Order[]) {
    if (!apiKey) {
      errors.push(`${order.id}: no BREVO_API_KEY`)
      continue
    }

    const siteLink = order.site_slug ? `${siteUrl}/sites/${order.site_slug}` : siteUrl

    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'Michał · Nobooking', email: 'noreply@nobooking.eu' },
          to: [{ email: order.email }],
          subject: `Jak Ci idzie ze stroną? 😊`,
          htmlContent: `
            <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a1a;">
              <div style="background: #059669; padding: 1.5rem 2rem; border-radius: 12px 12px 0 0; text-align: center;">
                <div style="font-size: 1.5rem; font-weight: 900; color: white;">
                  <span style="color: rgba(255,255,255,0.6);">No</span>booking
                </div>
              </div>
              <div style="padding: 2rem; background: white; border-radius: 0 0 12px 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.08);">
                <p>Cześć <strong>${order.first_name}</strong>! 👋</p>
                <p style="color: #374151; line-height: 1.7;">
                  Minęły 3 dni od uruchomienia Twojej strony apartamentu.
                  Mam nadzieję, że wszystko działa świetnie!
                </p>
                <p style="color: #374151; line-height: 1.7;">
                  Jeśli masz jakieś uwagi lub chcesz coś zmienić — odpowiedz na tego maila.
                  Jestem do dyspozycji.
                </p>
                ${order.site_slug ? `
                <div style="text-align: center; margin: 2rem 0;">
                  <a href="${siteLink}" style="display: inline-block; background: #059669; color: white; padding: 0.875rem 2rem; border-radius: 8px; text-decoration: none; font-weight: 700;">
                    Zobacz swoją stronę →
                  </a>
                </div>
                ` : ''}
                <p style="color: #374151;">
                  Pozdrawiam,<br/>
                  <strong>Michał · Nobooking</strong>
                </p>
              </div>
            </div>
          `,
        }),
      })

      if (res.ok) {
        sent++
        // Znacznik dopiero po udanej wysyłce. Zapisany wcześniej odciąłby
        // ponowienie przy awarii poczty — a ta awaria była już tu w maju.
        const { error: bladZnacznika } = await supabase
          .from('orders')
          .update({ review_request_sent_at: new Date().toISOString() })
          .eq('id', order.id)

        if (bladZnacznika) {
          // Wiadomość poszła, znacznika nie ma — jutro pójdzie drugi raz.
          // Lepiej, żeby było to widać, niż żeby klient dostał duplikat
          // bez śladu dlaczego.
          console.error(`[cron/review-requests] brak znacznika dla ${order.id}:`, bladZnacznika.message)
          errors.push(`${order.id}: znacznik ${bladZnacznika.message}`)
        }
      } else {
        const err = await res.text()
        errors.push(`${order.id}: Brevo ${res.status} ${err}`)
      }
    } catch (err) {
      errors.push(`${order.id}: ${String(err)}`)
    }
  }

  console.log(`[cron/review-requests] sent=${sent} errors=${errors.length}`)
  return NextResponse.json({ sent, errors: errors.length > 0 ? errors : undefined })
}
