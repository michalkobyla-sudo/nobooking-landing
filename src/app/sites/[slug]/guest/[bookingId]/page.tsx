import Kafelek from '@/components/ui/Kafelek'
import { CaretRight, CheckCircle, EnvelopeSimple, IdentificationCard, MagnifyingGlass, MapPin, Phone, Star } from '@/components/ui/ikony'
import { createServiceClient } from '@/lib/supabase'
import type { ApartmentConfig } from '@/lib/apartmentTypes'
import type { Metadata } from 'next'
import { metadanePortaluGoscia } from '@/lib/metadanePrywatne'

interface Props {
  params: Promise<{ slug: string; bookingId: string }>
  searchParams: Promise<{ paid?: string }>
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params
  return metadanePortaluGoscia(slug, 'Twoja rezerwacja')
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
    .select('id, config, slug, plan')
    .eq('slug', slug)
    .single()

  // Rezerwacja musi należeć do strony z adresu (niezmiennik 3). Bez tego
  // sprawdzenia ten sam identyfikator otwierał się pod dowolnym slugiem:
  // gość widziałby swoją rezerwację z nazwą, adresem i kontaktem cudzego
  // apartamentu, a dane rezerwacji wyciekały poza najemcę, do którego należą.
  const nalezyDoStrony = booking?.site_id === site?.id

  if (!booking || !site || !nalezyDoStrony) {
    return (
      <div className="n-page" style={{ display: 'grid', placeItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <MagnifyingGlass weight="fill" size={64} color="var(--ios-graphite)" aria-hidden style={{ margin: '0 auto 16px', display: 'block' }} />
          <h1>Rezerwacja nie znaleziona</h1>
        </div>
      </div>
    )
  }

  const config = site.config as unknown as ApartmentConfig
  // Portal gościa nosi barwy apartamentu (kolor właściciela), układ — styl iOS Nobookingu.
  const primary = config.theme?.primary ?? '#059669'
  const nights = Math.round(
    (new Date(booking.check_out as string).getTime() - new Date(booking.check_in as string).getTime()) / (1000 * 60 * 60 * 24)
  )
  const isPaid = booking.stripe_paid === true
  const justPaid = paid === '1'
  const dzis = new Date().toISOString().slice(0, 10)
  const pokazCheckin = site.plan === 'pro' && (booking.check_out as string) >= dzis
  const pokazOpinie = (booking.check_out as string) <= dzis && booking.status !== 'cancelled'
  const linia = '1px solid rgba(60,60,67,0.12)'

  return (
    <div className="n-page">
      <div className="n-page__inner" style={{ maxWidth: 600 }}>
        <p className="n-hint" style={{ fontWeight: 600 }}>Portal gościa</p>
        <h1 style={{ marginTop: 4 }}>{config.name}</h1>
        <p className="n-page__lead" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <MapPin weight="fill" color={primary} aria-hidden />{config.location}
        </p>

        {justPaid && isPaid && (
          <div className="n-alert n-alert--ok" style={{ marginTop: 20 }}>
            <CheckCircle weight="fill" aria-hidden />
            <span><strong>Rezerwacja potwierdzona.</strong> Potwierdzenie wysłaliśmy na {booking.guest_email as string}.</span>
          </div>
        )}

        <p className="n-group-label" style={{ marginTop: 28 }}>Szczegóły rezerwacji</p>
        <div className="n-list">
          {([
            ['Gość', booking.guest_name as string],
            ['Przyjazd', formatDate(booking.check_in as string)],
            ['Wyjazd', formatDate(booking.check_out as string)],
            ['Liczba nocy', `${nights}`],
            ['Osoby', `${booking.guests_count as number}`],
            ['Kwota', `${booking.total_price as number} ${booking.currency as string}`],
          ] as [string, string][]).map(([label, value], i) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 16px', borderTop: i > 0 ? linia : 'none', fontSize: 15 }}>
              <span style={{ color: 'var(--muted)' }}>{label}</span>
              <span style={{ fontWeight: 600, textAlign: 'right' }}>{value}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, padding: '12px 16px', borderTop: linia, fontSize: 15 }}>
            <span style={{ color: 'var(--muted)' }}>Status</span>
            <span style={{ fontWeight: 600, color: isPaid ? 'var(--emerald-dark)' : 'var(--ios-orange)' }}>{isPaid ? 'Opłacona' : 'Oczekuje na płatność'}</span>
          </div>
        </div>

        {(pokazCheckin || pokazOpinie) && (
          <>
            <p className="n-group-label" style={{ marginTop: 28 }}>Do zrobienia</p>
            <div className="n-list">
              {/* Check-in online — pakiet Pro. Bez tego wejścia formularz byłby
                  niewidoczny: gość nie ma skąd znać jego adresu. Po wyjeździe link
                  znika, bo formularz i tak odmówi zapisu. */}
              {pokazCheckin && (
                <a href={`/sites/${site.slug as string}/guest/${bookingId}/checkin`} className="n-row" style={{ textDecoration: 'none' }}>
                  <Kafelek ikona={IdentificationCard} kolor="ink" rozmiar="sm" />
                  <span className="n-row__txt" style={{ flex: 1 }}><b>Check-in online</b><span>Podaj dane przed przyjazdem i skróć formalności na miejscu.</span></span>
                  <CaretRight weight="bold" color="#C7C7CC" aria-hidden />
                </a>
              )}
              {/* Opinia — dopiero po zakończeniu pobytu. */}
              {pokazOpinie && (
                <a href={`/sites/${site.slug as string}/guest/${bookingId}/opinia`} className="n-row" style={{ textDecoration: 'none' }}>
                  <Kafelek ikona={Star} kolor="yellow" rozmiar="sm" />
                  <span className="n-row__txt" style={{ flex: 1 }}><b>Napisz opinię</b><span>Kilka zdań pomoże kolejnym gościom przy wyborze.</span></span>
                  <CaretRight weight="bold" color="#C7C7CC" aria-hidden />
                </a>
              )}
            </div>
          </>
        )}

        <p className="n-group-label" style={{ marginTop: 28 }}>Kontakt z gospodarzem</p>
        <div className="n-list">
          {config.contact.email && (
            <a href={`mailto:${config.contact.email}`} className="n-row" style={{ textDecoration: 'none' }}>
              <Kafelek ikona={EnvelopeSimple} kolor="red" rozmiar="sm" />
              <span className="n-row__txt"><b>{config.contact.email}</b><span>Napisz e-mail</span></span>
            </a>
          )}
          {config.contact.phone && (
            <a href={`tel:${config.contact.phone}`} className="n-row" style={{ textDecoration: 'none' }}>
              <Kafelek ikona={Phone} kolor="emerald" rozmiar="sm" />
              <span className="n-row__txt"><b>{config.contact.phone}</b><span>Zadzwoń</span></span>
            </a>
          )}
        </div>

        <p className="n-group-label" style={{ marginTop: 28 }}>Adres</p>
        <div className="n-form-card">
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            <Kafelek ikona={MapPin} kolor="blue" rozmiar="sm" />
            <span style={{ fontSize: 16 }}>{config.address}</span>
          </div>
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(config.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="n-btn n-btn--sm"
            style={{ background: primary, color: '#fff', alignSelf: 'flex-start' }}
          >
            Otwórz w Mapach Google
          </a>
        </div>
      </div>
    </div>
  )
}
