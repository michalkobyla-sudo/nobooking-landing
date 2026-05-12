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
    name:              config.name                   ?? slug,
    location:          config.location               ?? '',
    owner_email:       site.owner_email,
    plan:              site.plan,
    contact_email:     config.contact?.email         ?? '',
    contact_phone:     config.contact?.phone         ?? '',
    currency:          config.pricing?.currency      ?? 'EUR',
    pricing:           config.pricing                ?? null,
    slug:              site.slug,
    stripe_account_id: site.stripe_account_id        ?? null,
    stripe_onboarded:  site.stripe_onboarded         ?? false,
  })
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { slug } = await params
  const site = await verifyOwnerSession(slug, request.headers.get('cookie'))
  if (!site) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const VALID_CURRENCIES = ['EUR', 'PLN', 'GBP', 'USD', 'CHF', 'CZK', 'SEK', 'NOK', 'DKK']

  interface TierPatch { pricePerNight?: number; minNights?: number }
  const body = await request.json().catch(() => ({})) as {
    owner_email?:   string
    contact_email?: string
    contact_phone?: string
    currency?:      string
    pricing?: {
      cleaningFee?: number
      tiers?: { high?: TierPatch; mid?: TierPatch; low?: TierPatch }
    }
  }

  const supabase = createServiceClient()
  const updates: Record<string, unknown> = {}

  if (body.owner_email) {
    updates.owner_email = body.owner_email
  }

  const configUpdates: Record<string, unknown> = {}

  if (body.contact_email !== undefined || body.contact_phone !== undefined) {
    const currentContact = ((site.config as Record<string, unknown>)?.contact ?? {}) as Record<string, unknown>
    configUpdates.contact = {
      ...currentContact,
      ...(body.contact_email !== undefined ? { email: body.contact_email } : {}),
      ...(body.contact_phone !== undefined ? { phone: body.contact_phone } : {}),
    }
  }

  if ((body.currency && VALID_CURRENCIES.includes(body.currency)) || body.pricing) {
    const currentPricing = ((site.config as Record<string, unknown>)?.pricing ?? {}) as Record<string, unknown>
    const currentTiers   = (currentPricing.tiers ?? {}) as Record<string, Record<string, unknown>>

    const mergedTiers = { ...currentTiers }
    if (body.pricing?.tiers) {
      for (const key of ['high', 'mid', 'low'] as const) {
        const patch = body.pricing.tiers[key]
        if (!patch) continue
        mergedTiers[key] = {
          ...currentTiers[key],
          ...(patch.pricePerNight !== undefined ? { pricePerNight: Number(patch.pricePerNight) } : {}),
          ...(patch.minNights     !== undefined ? { minNights:     Number(patch.minNights)     } : {}),
        }
      }
    }

    configUpdates.pricing = {
      ...currentPricing,
      tiers: mergedTiers,
      ...(body.currency                        ? { currency:    body.currency                        } : {}),
      ...(body.pricing?.cleaningFee !== undefined ? { cleaningFee: Number(body.pricing.cleaningFee) } : {}),
    }
  }

  if (Object.keys(configUpdates).length > 0) {
    updates.config = { ...(site.config as Record<string, unknown>), ...configUpdates }
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
