import Link from 'next/link'
import { CaretLeft, MagnifyingGlass } from '@/components/ui/ikony'
import { createServiceClient } from '@/lib/supabase'
import type { ApartmentConfig } from '@/lib/apartmentTypes'
import OpiniaForm from '@/components/guest/OpiniaForm'
import type { Metadata } from 'next'
import { metadanePortaluGoscia } from '@/lib/metadanePrywatne'

interface Props {
  params: Promise<{ slug: string; bookingId: string }>
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params
  return metadanePortaluGoscia(slug, 'Opinia o pobycie')
}

/**
 * Formularz opinii gościa. Wejście prowadzi z maila wysyłanego dwa dni po
 * wyjeździe (cron `guest-reminders`) i z portalu gościa.
 *
 * Jak wszędzie w portalu: rezerwacja musi należeć do strony z adresu
 * (niezmiennik 3).
 */
export default async function OpiniaPage({ params }: Props) {
  const { slug, bookingId } = await params
  const supabase = createServiceClient()

  const { data: site } = await supabase
    .from('sites')
    .select('id, config')
    .eq('slug', slug)
    .eq('active', true)
    .single()

  const { data: booking } = await supabase
    .from('bookings')
    .select('id, site_id, check_in, check_out')
    .eq('id', bookingId)
    .single()

  const config = site?.config as unknown as ApartmentConfig | undefined
  const primary = config?.theme?.primary ?? '#059669'

  if (!site || !booking || booking.site_id !== site.id) {
    return (
      <div className="n-page" style={{ display: 'grid', placeItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <MagnifyingGlass weight="fill" size={64} color="var(--ios-graphite)" aria-hidden style={{ margin: '0 auto 16px', display: 'block' }} />
          <h1>Rezerwacja nie znaleziona</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="n-page">
      <div className="n-page__inner" style={{ maxWidth: 600 }}>
        <Link href={`/sites/${slug}/guest/${bookingId}`} className="n-back"><CaretLeft weight="bold" aria-hidden />Wróć do rezerwacji</Link>
        <p className="n-hint" style={{ fontWeight: 600 }}>Opinia o pobycie</p>
        <h1 style={{ marginTop: 4 }}>{config?.name}</h1>
        <p className="n-page__lead">{booking.check_in} → {booking.check_out}</p>
      </div>
      <div style={{ maxWidth: 600, margin: '24px auto 0' }}>
        <div className="n-form-card">
          <OpiniaForm slug={slug} bookingId={bookingId} primary={primary} />
        </div>
      </div>
    </div>
  )
}
