import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { generateSiteConfig, toSlug } from '@/lib/generate-site'
import { provisionSite } from '@/lib/provision-site'
import { createOnboardingLink } from '@/lib/stripe-connect'
import { sendOwnerWelcomeEmail, sendSiteReadyEmail } from '@/lib/email'
import type { Order } from '@/lib/types'

// Allow up to 300s on Vercel Pro, 60s on Hobby
export const maxDuration = 300

// GET /api/cron/provision-sites
// Runs every minute via Vercel Cron.
// Picks up any orders that have onboarding submitted but no site generated yet.
export async function GET(_request: NextRequest) {
  const supabase = createServiceClient()

  // Find orders: onboarding submitted but site not yet generated
  // Note: stripe_paid not required — onboarding token is only sent after payment
  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .eq('onboarding_submitted', true)
    .is('site_slug', null)
    .limit(3) // process up to 3 at a time to stay within timeout

  if (error) {
    console.error('[provision-cron] query error:', error)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  if (!orders || orders.length === 0) {
    return NextResponse.json({ processed: 0, message: 'nothing to do' })
  }

  const results: Array<{ id: string; status: string; error?: string }> = []

  for (const order of orders) {
    const typedOrder = order as Order
    console.log(`[provision-cron] processing order ${typedOrder.id} — ${typedOrder.apartment_name}`)

    try {
      // 1. Generate AI config
      const config = await generateSiteConfig(typedOrder)
      const slug = toSlug(typedOrder.apartment_name)
      const configJson = JSON.stringify(config)

      // 2. Update orders table with generated config
      await supabase
        .from('orders')
        .update({
          site_slug: slug,
          generated_config: configJson,
          site_generated_at: new Date().toISOString(),
        })
        .eq('id', typedOrder.id)

      // 3. Provision site (Auth user + Stripe Connect + sites record)
      const { tempPassword, stripeAccountId } = await provisionSite(typedOrder, slug, configJson)

      // 4. Build Stripe Connect onboarding URL
      const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://nobooking.eu').trim().replace(/\/$/, '')
      let stripeOnboardUrl = `${siteUrl}/api/connect/onboard?slug=${slug}`
      if (stripeAccountId) {
        try {
          stripeOnboardUrl = await createOnboardingLink(stripeAccountId, slug)
        } catch {
          // fallback to our redirect route
        }
      }

      // 5. Welcome email (credentials + Stripe Connect link)
      const ownerEmail = (typedOrder.ob_contact_email ?? typedOrder.email).toLowerCase().trim()
      await sendOwnerWelcomeEmail({
        email: ownerEmail,
        first_name: typedOrder.first_name,
        apartment_name: typedOrder.apartment_name,
        slug,
        temp_password: tempPassword,
        stripe_onboard_url: stripeOnboardUrl,
        plan: typedOrder.plan,
      })

      // 6. Site-ready email with revision link
      await sendSiteReadyEmail(typedOrder, slug, 0, 4)

      console.log(`[provision-cron] ✅ order ${typedOrder.id} — site "${slug}" provisioned`)
      results.push({ id: typedOrder.id, status: 'ok' })

    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      console.error(`[provision-cron] ❌ order ${typedOrder.id} error:`, message)
      results.push({ id: typedOrder.id, status: 'error', error: message })
    }
  }

  return NextResponse.json({ processed: results.length, results })
}
