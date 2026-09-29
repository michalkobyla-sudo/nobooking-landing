import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient, requireAdmin } from '@/lib/supabase'
import { generateSiteConfig } from '@/lib/generate-site'
import { slugZamowienia, zapiszConfigStrony } from '@/lib/provision-site'
import { parsujConfig } from '@/lib/configMerge'
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

  // Slug z zamówienia, nie z nazwy apartamentu — przy kolizji nazw `toSlug`
  // wskazuje stronę pierwszego klienta o tej samej nazwie apartamentu.
  const slug = slugZamowienia(order as Order)
  const configJson = JSON.stringify(config)

  const { error: updateError } = await supabase
    .from('orders')
    .update({
      site_slug: slug,
      generated_config: configJson,
      site_generated_at: new Date().toISOString(),
    })
    .eq('id', id)

  // Strona renderuje się z `sites.config`, nie z `orders.generated_config`.
  // Przy pierwszym generowaniu strony jeszcze nie ma i to jest w porządku —
  // wiersz w `sites` tworzy provisioning.
  if (!updateError) {
    const wynik = await zapiszConfigStrony(
      supabase,
      slug,
      config as unknown as Record<string, unknown>,
      parsujConfig((order as Order).generated_config),
    )
    if (wynik.zachowane.length > 0) {
      console.log(`[generate-site] ${slug}: zachowano zmiany właściciela w ${wynik.zachowane.join(', ')}`)
    }
  }

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
