import Link from 'next/link'
import { CaretLeft, MagnifyingGlass } from '@/components/ui/ikony'
import { createServiceClient } from '@/lib/supabase'
import type { ApartmentConfig } from '@/lib/apartmentTypes'
import CheckinForm from '@/components/guest/CheckinForm'
import type { Metadata } from 'next'
import { metadanePortaluGoscia } from '@/lib/metadanePrywatne'

interface Props {
  params: Promise<{ slug: string; bookingId: string }>
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params
  return metadanePortaluGoscia(slug, 'Check-in online')
}

/**
 * Online check-in gościa (pakiet Pro).
 *
 * Strona sprawdza to samo, co portal gościa: rezerwacja musi należeć do strony
 * z adresu (niezmiennik 3). Sam formularz i zapis mają własne sprawdzenia
 * w `/api/sites/[slug]/guest/[bookingId]/checkin` — strona jedynie decyduje,
 * czy w ogóle jest co pokazywać.
 */
export default async function CheckinPage({ params }: Props) {
  const { slug, bookingId } = await params
  const supabase = createServiceClient()

  const { data: site } = await supabase
    .from('sites')
    .select('id, plan, config')
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
  const dostepny = Boolean(site && booking && booking.site_id === site.id && site.plan === 'pro')

  if (!dostepny) {
    return (
      <div className="n-page" style={{ display: 'grid', placeItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <MagnifyingGlass weight="fill" size={64} color="var(--ios-graphite)" aria-hidden style={{ margin: '0 auto 16px', display: 'block' }} />
          <h1>Formularz niedostępny</h1>
        </div>
      </div>
    )
  }

  return (
    <div className="n-page">
      <div className="n-page__inner" style={{ maxWidth: 600 }}>
        <Link href={`/sites/${slug}/guest/${bookingId}`} className="n-back"><CaretLeft weight="bold" aria-hidden />Wróć do rezerwacji</Link>
        <p className="n-hint" style={{ fontWeight: 600 }}>Check-in online</p>
        <h1 style={{ marginTop: 4 }}>{config?.name}</h1>
        <p className="n-page__lead">{booking!.check_in} → {booking!.check_out}</p>
      </div>
      <div style={{ maxWidth: 600, margin: '24px auto 0' }}>
        <CheckinForm slug={slug} bookingId={bookingId} primary={primary} />
      </div>
    </div>
  )
}
