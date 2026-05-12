import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { verifyOwnerSession } from '@/lib/ownerAuth'
import type { ApartmentConfig } from '@/lib/apartmentTypes'

interface Params {
  params: Promise<{ slug: string }>
}

export async function GET(request: NextRequest, { params }: Params) {
  const { slug } = await params
  const site = await verifyOwnerSession(slug, request.headers.get('cookie'))
  if (!site) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const config = site.config as Partial<ApartmentConfig>

  return NextResponse.json({
    name:          config.name          ?? slug,
    location:      config.location      ?? '',
    owner_email:   site.owner_email,
    plan:          site.plan,
    contact_email: config.contact?.email ?? '',
    contact_phone: config.contact?.phone ?? '',
    pricing:       config.pricing        ?? null,
    slug:          site.slug,
  })
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { slug } = await params
  const site = await verifyOwnerSession(slug, request.headers.get('cookie'))
  if (!site) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as {
    owner_email?:   string
    contact_email?: string
    contact_phone?: string
  }

  const supabase = createServiceClient()
  const updates: Record<string, unknown> = {}

  if (body.owner_email) {
    updates.owner_email = body.owner_email
  }

  if (body.contact_email !== undefined || body.contact_phone !== undefined) {
    const currentConfig = (site.config ?? {}) as Record<string, unknown>
    const currentContact = (currentConfig.contact ?? {}) as Record<string, unknown>
    updates.config = {
      ...currentConfig,
      contact: {
        ...currentContact,
        ...(body.contact_email !== undefined ? { email: body.contact_email } : {}),
        ...(body.contact_phone !== undefined ? { phone: body.contact_phone } : {}),
      },
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ ok: true })
  }

  const { error } = await supabase
    .from('sites')
    .update(updates)
    .eq('id', site.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
