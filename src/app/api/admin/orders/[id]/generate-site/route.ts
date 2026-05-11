import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, requireAdmin } from '@/lib/supabase'
import { generateSiteConfig, toSlug } from '@/lib/generate-site'
import { sendSiteReadyEmail } from '@/lib/email'
import type { Order } from '@/lib/types'

interface Params {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: Params) {
  const authError = await requireAdmin(request)
  if (authError) return authError

  const { id } = await params
  const body = await request.json().catch(() => ({})) as { sendEmail?: boolean }
  const shouldSendEmail = body.sendEmail ?? true

  const supabase = createServiceClient()

  const { data: order, error: findError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', id)
    .single()

  if (findError || !order) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  let config
  try {
    config = await generateSiteConfig(order as Order)
  } catch (err) {
    console.error('[generate-site] generation error:', err)
    return NextResponse.json(
      { error: 'generation_failed', detail: String(err) },
      { status: 500 }
    )
  }

  const slug = toSlug(order.apartment_name)

  const { error: updateError } = await supabase
    .from('orders')
    .update({
      site_slug: slug,
      generated_config: JSON.stringify(config),
      site_generated_at: new Date().toISOString(),
    })
    .eq('id', id)

  if (updateError) {
    console.error('[generate-site] db error:', updateError)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  if (shouldSendEmail) {
    try {
      await sendSiteReadyEmail(order as Order, slug)
    } catch (err) {
      console.error('[generate-site] email error:', err)
    }
  }

  return NextResponse.json({ success: true, slug })
}
