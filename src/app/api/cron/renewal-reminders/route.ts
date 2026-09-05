import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireCron } from '@/lib/cronAuth'
import { sendRenewalEmail } from '@/lib/sendRenewalEmail'

// Reminder thresholds in days before expiry.
// Negative = days after expiry (grace period management).
const REMINDER_THRESHOLDS = [90, 30, 14, 7, 1] as const
const GRACE_PERIOD_DAYS = 14

/**
 * GET /api/cron/renewal-reminders
 * Runs daily at 09:00 UTC via Vercel Cron.
 *
 * For each active site:
 *   1. Check if expires_at falls within a reminder window (D-90/30/14/7/1)
 *   2. If reminder not yet sent for that threshold → send email + record
 *   3. If site expired > GRACE_PERIOD_DAYS ago → deactivate site + notify owner
 */
export async function GET(request: NextRequest) {
  const unauthorized = requireCron(request)
  if (unauthorized) return unauthorized

  const supabase = createServiceClient()
  const now = new Date()
  const today = now.toISOString().slice(0, 10)

  // Fetch all sites with expires_at set (active and inactive — need to handle grace period)
  const { data: sites, error } = await supabase
    .from('sites')
    .select('id, slug, owner_email, plan, expires_at, active, renewal_price_pln, renewal_price_eur, renewal_currency')
    .not('expires_at', 'is', null)
    .order('expires_at', { ascending: true })

  if (error) {
    console.error('[renewal-reminders] DB error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!sites || sites.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, message: 'No sites with expiry dates' })
  }

  // Fetch already-sent reminders for all these sites
  const siteIds = sites.map(s => s.id as string)
  const { data: sentReminders } = await supabase
    .from('renewal_reminders')
    .select('site_id, days_before')
    .in('site_id', siteIds)

  // Build a Set for O(1) lookups: "siteId:daysBefore"
  const sentSet = new Set<string>(
    (sentReminders ?? []).map(r => `${r.site_id}:${r.days_before}`)
  )

  const results = {
    reminders_sent: 0,
    sites_deactivated: 0,
    errors: 0,
    skipped: 0,
  }

  for (const site of sites) {
    const expiresAt = new Date(site.expires_at as string)
    const daysUntilExpiry = Math.round(
      (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    )

    // ── Grace period deactivation ─────────────────────────────────────────────
    // Site expired and grace period is over → deactivate
    if (daysUntilExpiry < -GRACE_PERIOD_DAYS && site.active) {
      try {
        await supabase
          .from('sites')
          .update({ active: false })
          .eq('id', site.id)

        // Send "site deactivated" email if not already sent
        const deactivateKey = `${site.id}:-14`
        if (!sentSet.has(deactivateKey)) {
          await sendRenewalEmail({
            ownerEmail: site.owner_email as string,
            apartmentName: site.slug as string,
            slug: site.slug as string,
            expiresAt,
            renewalPricePln: site.renewal_price_pln as number | null,
            renewalPriceEur: site.renewal_price_eur as number | null,
            renewalCurrency: site.renewal_currency as string | null,
            daysBefore: -14,
          })

          await supabase.from('renewal_reminders').insert({
            site_id: site.id,
            days_before: -14,
          })

          sentSet.add(deactivateKey)
        }

        results.sites_deactivated++
        console.log(`[renewal-reminders] deactivated site ${site.slug} (expired ${Math.abs(daysUntilExpiry)} days ago)`)
      } catch (err) {
        console.error(`[renewal-reminders] deactivation error for ${site.slug}:`, err)
        results.errors++
      }
      continue
    }

    // ── Reminder emails ───────────────────────────────────────────────────────
    for (const threshold of REMINDER_THRESHOLDS) {
      // Send reminder when we're within 1 day of the threshold
      // e.g. threshold=90: send when daysUntilExpiry is between 89 and 90
      if (daysUntilExpiry > threshold || daysUntilExpiry < threshold - 1) continue

      const reminderKey = `${site.id}:${threshold}`
      if (sentSet.has(reminderKey)) {
        results.skipped++
        continue
      }

      try {
        await sendRenewalEmail({
          ownerEmail: site.owner_email as string,
          apartmentName: site.slug as string,
          slug: site.slug as string,
          expiresAt,
          renewalPricePln: site.renewal_price_pln as number | null,
          renewalPriceEur: site.renewal_price_eur as number | null,
          renewalCurrency: site.renewal_currency as string | null,
          daysBefore: threshold,
        })

        await supabase.from('renewal_reminders').insert({
          site_id: site.id,
          days_before: threshold,
        })

        sentSet.add(reminderKey)
        results.reminders_sent++
        console.log(`[renewal-reminders] sent D-${threshold} reminder to ${site.owner_email} for ${site.slug}`)
      } catch (err) {
        console.error(`[renewal-reminders] email error for ${site.slug} D-${threshold}:`, err)
        results.errors++
      }

      break // Only one reminder per site per run
    }
  }

  console.log(`[renewal-reminders] done. date=${today}`, results)
  return NextResponse.json({ ok: true, date: today, ...results })
}
