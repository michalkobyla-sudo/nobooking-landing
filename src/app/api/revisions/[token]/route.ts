import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { generateSiteConfig } from '@/lib/generate-site'
import { slugZamowienia, zapiszConfigStrony } from '@/lib/provision-site'
import { parsujConfig } from '@/lib/configMerge'
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

  // Zapis uwag i inkrementacja licznika.
  //
  // Warunek na starą wartość licznika (compare-and-swap) sprawia, że przy
  // równoległych żądaniach przejdzie dokładnie jedno. Wcześniej odczyt
  // i zapis były rozdzielone, więc kilka żądań naraz przekraczało limit
  // MAX_REVISIONS i uruchamiało tyle samo płatnych generowań przez Claude.
  const currentCount = order.revision_count as number
  const newCount = currentCount + 1

  const { data: updated } = await supabase
    .from('orders')
    .update({ revision_notes: notes, revision_count: newCount })
    .eq('id', order.id)
    .eq('revision_count', currentCount)
    .select('id')

  if (!updated || updated.length === 0) {
    return NextResponse.json({ error: 'revision_in_progress' }, { status: 409 })
  }

  // Regenerate site in background
  ;(async () => {
    try {
      const orderWithNotes = { ...order, revision_notes: notes } as Order
      const config = await generateSiteConfig(orderWithNotes)

      // Slug bierzemy z zamówienia, nie z nazwy apartamentu: przy kolizji nazw
      // drugi klient dostaje `nazwa-2`, a `toSlug` wskazałby stronę pierwszego.
      const slug = slugZamowienia(orderWithNotes)

      // Strona renderuje się z `sites.config`. Bez tego zapisu klient dostawał
      // mail „strona zaktualizowana", a strona zostawała bez zmian — runda
      // poprawek przepadała, rachunek za Claude i tak rósł.
      // Poprzednia wygenerowana wersja pozwala odróżnić zmiany właściciela
      // z panelu od tego, co model wygenerował ostatnio.
      const wynik = await zapiszConfigStrony(
        supabase,
        slug,
        config as unknown as Record<string, unknown>,
        parsujConfig(order.generated_config),
      )

      if (!wynik.zapisano) {
        console.error(`[revisions] brak strony o slugu "${slug}" — poprawka nie trafiła na stronę`)
      } else if (wynik.zachowane.length > 0) {
        console.log(`[revisions] ${slug}: zachowano zmiany właściciela w ${wynik.zachowane.join(', ')}`)
      }

      // Punktem odniesienia jest config **wygenerowany**, nie scalony. Gdyby
      // zapisać tu scalony, przy następnej rundzie zmiana właściciela zrównałaby
      // się z punktem odniesienia, wyglądała na brak zmiany i zostałaby cofnięta.
      await supabase
        .from('orders')
        .update({
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
