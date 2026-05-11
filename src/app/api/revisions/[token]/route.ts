import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { generateSiteConfig, toSlug } from '@/lib/generate-site'
import { sendSiteReadyEmail, sendRevisionCompleteEmail } from '@/lib/email'
import type { Order } from '@/lib/types'

const MAX_REVISIONS = 4

interface Params {
  params: Promise<{ token: string }>
}

export async function GET(_request: NextRequest, { params }: Params) {
  const { token } = await params
  const supabase = createServiceClient()

  const { data: order, error } = await supabase
    .from('orders')
    .select('id, first_name, apartment_name, plan, site_slug, revision_count, onboarding_submitted')
    .eq('revision_token', token)
    .single()

  if (error || !order) {
    return NextResponse.json({ found: false })
  }

  if (!order.onboarding_submitted) {
    return NextResponse.json({ found: false })
  }

  return NextResponse.json({
    found: true,
    first_name: order.first_name,
    apartment_name: order.apartment_name,
    plan: order.plan,
    site_slug: order.site_slug,
    revision_count: order.revision_count,
    revisions_left: Math.max(0, MAX_REVISIONS - order.revision_count),
  })
}

export async function POST(request: NextRequest, { params }: Params) {
  const { token } = await params
  const supabase = createServiceClient()

  const { data: order, error: findError } = await supabase
    .from('orders')
    .select('*')
    .eq('revision_token', token)
    .single()

  if (findError || !order) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  if (order.revision_count >= MAX_REVISIONS) {
    return NextResponse.json({ error: 'max_revisions_reached' }, { status: 409 })
  }

  const body = await request.json() as { notes?: string }
  const notes = body.notes?.trim() || ''

  if (!notes) {
    return NextResponse.json({ error: 'missing_notes' }, { status: 400 })
  }

  // Save revision notes & increment counter
  const newCount = order.revision_count + 1
  await supabase
    .from('orders')
    .update({ revision_notes: notes, revision_count: newCount })
    .eq('id', order.id)

  // Regenerate site in background
  ;(async () => {
    try {
      const orderWithNotes = { ...order, revision_notes: notes } as Order
      const config = await generateSiteConfig(orderWithNotes)
      const slug = toSlug(order.apartment_name)

      await supabase
        .from('orders')
        .update({
          site_slug: slug,
          generated_config: JSON.stringify(config),
          site_generated_at: new Date().toISOString(),
        })
        .eq('id', order.id)

      const revisionsLeft = MAX_REVISIONS - newCount

      if (revisionsLeft > 0) {
        // Send updated preview + new revision link
        await sendSiteReadyEmail(orderWithNotes, slug, newCount, revisionsLeft)
      } else {
        // Last revision done
        await sendRevisionCompleteEmail(orderWithNotes, slug)
      }
    } catch (err) {
      console.error('[revisions] generation error:', err)
    }
  })()

  return NextResponse.json({ success: true, revision_count: newCount })
}
