import Link from 'next/link'
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
  const primary = config?.theme?.primary ?? '#1A5276'
  const dostepny = Boolean(site && booking && booking.site_id === site.id && site.plan === 'pro')

  if (!dostepny) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system, sans-serif' }}>
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827' }}>Formularz niedostępny</h1>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ background: primary, color: 'white', padding: '1.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8, marginBottom: '0.35rem' }}>
          Check-in online
        </div>
        <div style={{ fontSize: '1.4rem', fontWeight: 900 }}>{config?.name}</div>
        <div style={{ fontSize: '0.85rem', opacity: 0.85, marginTop: '0.25rem' }}>
          {booking!.check_in} → {booking!.check_out}
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '2rem 1.25rem' }}>
        <CheckinForm slug={slug} bookingId={bookingId} primary={primary} />

        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <Link href={`/sites/${slug}/guest/${bookingId}`} style={{ fontSize: '0.85rem', color: '#6B7280' }}>
            ← Wróć do rezerwacji
          </Link>
        </div>
      </div>
    </div>
  )
}
