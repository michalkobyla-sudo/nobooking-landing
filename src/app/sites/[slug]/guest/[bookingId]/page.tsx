import { createServiceClient } from '@/lib/supabase'
import type { ApartmentConfig } from '@/lib/apartmentTypes'

interface Props {
  params: Promise<{ slug: string; bookingId: string }>
  searchParams: Promise<{ paid?: string }>
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default async function GuestPortalPage({ params, searchParams }: Props) {
  const { slug, bookingId } = await params
  const { paid } = await searchParams
  const supabase = createServiceClient()

  const { data: booking } = await supabase
    .from('bookings')
    .select('*')
    .eq('id', bookingId)
    .single()

  const { data: site } = await supabase
    .from('sites')
    .select('config, slug')
    .eq('slug', slug)
    .single()

  if (!booking || !site) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system, sans-serif' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827' }}>Rezerwacja nie znaleziona</h1>
        </div>
      </div>
    )
  }

  const config = site.config as unknown as ApartmentConfig
  const primary = config.theme?.primary ?? '#1A5276'
  const nights = Math.round(
    (new Date(booking.check_out as string).getTime() - new Date(booking.check_in as string).getTime()) / (1000 * 60 * 60 * 24)
  )
  const isPaid = booking.stripe_paid === true
  const justPaid = paid === '1'

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      {/* Header */}
      <div style={{ background: primary, color: 'white', padding: '1.5rem', textAlign: 'center' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8, marginBottom: '0.35rem' }}>Portal gościa</div>
        <div style={{ fontSize: '1.4rem', fontWeight: 900 }}>{config.name}</div>
        <div style={{ fontSize: '0.85rem', opacity: 0.85, marginTop: '0.25rem' }}>📍 {config.location}</div>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '2rem 1.25rem' }}>

        {/* Just paid banner */}
        {justPaid && isPaid && (
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 16, padding: '1.5rem', textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🎉</div>
            <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#15803D', marginBottom: '0.25rem' }}>Rezerwacja potwierdzona!</div>
            <div style={{ color: '#374151', fontSize: '0.875rem' }}>Email z potwierdzeniem został wysłany na {booking.guest_email as string}</div>
          </div>
        )}

        {/* Booking details */}
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', padding: '1.5rem', marginBottom: '1rem' }}>
          <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '1rem', color: '#111827' }}>📋 Szczegóły rezerwacji</div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {([
                ['👤 Gość', booking.guest_name as string],
                ['📅 Przyjazd', formatDate(booking.check_in as string)],
                ['📅 Wyjazd', formatDate(booking.check_out as string)],
                ['🌙 Liczba nocy', `${nights}`],
                ['👥 Osoby', `${booking.guests_count as number}`],
                ['💳 Kwota', `${booking.total_price as number} ${booking.currency as string}`],
                ['📌 Status', isPaid ? '✅ Opłacona' : '⏳ Oczekuje na płatność'],
              ] as [string, string][]).map(([label, value]) => (
                <tr key={label} style={{ borderBottom: '1px solid #F3F4F6' }}>
                  <td style={{ padding: '0.6rem 0', fontSize: '0.85rem', color: '#6B7280', width: '45%' }}>{label}</td>
                  <td style={{ padding: '0.6rem 0', fontSize: '0.85rem', fontWeight: 600, color: '#111827' }}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Contact */}
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', padding: '1.5rem', marginBottom: '1rem' }}>
          <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '1rem', color: '#111827' }}>📞 Kontakt z właścicielem</div>
          <div style={{ fontSize: '0.875rem', color: '#374151', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {config.contact.email && (
              <a href={`mailto:${config.contact.email}`} style={{ color: primary, fontWeight: 600 }}>✉️ {config.contact.email}</a>
            )}
            {config.contact.phone && (
              <a href={`tel:${config.contact.phone}`} style={{ color: primary, fontWeight: 600 }}>📱 {config.contact.phone}</a>
            )}
          </div>
        </div>

        {/* Address */}
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', padding: '1.5rem' }}>
          <div style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '0.75rem', color: '#111827' }}>📍 Adres</div>
          <div style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '1rem' }}>{config.address}</div>
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(config.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: 'inline-block', background: primary, color: 'white', padding: '0.6rem 1.25rem', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none' }}
          >
            Otwórz w Google Maps →
          </a>
        </div>

      </div>
    </div>
  )
}
