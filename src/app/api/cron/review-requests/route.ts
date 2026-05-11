import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import type { Order } from '@/lib/types'

/**
 * Cron: runs daily at 10:00 UTC
 * Finds orders completed ~3 days ago (site_generated_at) and sends a review request email.
 *
 * Schedule: vercel.json → "0 10 * * *"
 * Auth: Vercel automatically sets Authorization: Bearer <CRON_SECRET>
 */
export async function GET(request: NextRequest) {
  // Verify cron secret (set CRON_SECRET in Vercel env vars)
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }
  }

  const supabase = createServiceClient()

  // Find orders where site was generated 3 days ago (±12h window)
  const threeDaysAgo = new Date()
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

  const windowStart = new Date(threeDaysAgo)
  windowStart.setHours(windowStart.getHours() - 12)
  const windowEnd = new Date(threeDaysAgo)
  windowEnd.setHours(windowEnd.getHours() + 12)

  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .eq('status', 'completed')
    .not('site_generated_at', 'is', null)
    .gte('site_generated_at', windowStart.toISOString())
    .lte('site_generated_at', windowEnd.toISOString())

  if (error) {
    console.error('[cron/review-requests] db error:', error)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  if (!orders || orders.length === 0) {
    return NextResponse.json({ sent: 0, message: 'no orders in window' })
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
