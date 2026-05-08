'use client'

import { useRouter, useParams } from 'next/navigation'

type BookingStatus = 'new' | 'confirmed' | 'awaiting_payment' | 'checked_in' | 'completed' | 'cancelled'

const STATUS_OPTIONS: Array<{ value: BookingStatus; label: string }> = [
  { value: 'new',              label: 'Nowe zapytanie' },
  { value: 'confirmed',        label: 'Potwierdzona' },
  { value: 'awaiting_payment', label: 'Czeka na płatność' },
  { value: 'checked_in',       label: 'Gość zameldowany' },
  { value: 'completed',        label: 'Zakończona' },
  { value: 'cancelled',        label: 'Anulowana' },
]

const STATUS_COLORS: Record<BookingStatus, { bg: string; color: string }> = {
  new:              { bg: '#EFF6FF', color: '#1D4ED8' },
  confirmed:        { bg: '#F0FDF4', color: '#15803D' },
  awaiting_payment: { bg: '#FFF7ED', color: '#C2410C' },
  checked_in:       { bg: '#F5F3FF', color: '#6D28D9' },
  completed:        { bg: '#F3F4F6', color: '#374151' },
  cancelled:        { bg: '#FEF2F2', color: '#DC2626' },
}

const DEMO_BOOKINGS: Record<string, {
  id: string; status: BookingStatus
  arrival: string; departure: string; nights: number; guests: number
  name: string; email: string; phone: string; country: string
  total: number; currency: string; message: string; created_at: string
}> = {
  'b-1': { id: 'b-1', status: 'new',              arrival: '2026-06-14', departure: '2026-06-21', nights: 7,  guests: 4, name: 'Katarzyna Malinowska', email: 'k.malinowska@gmail.com', phone: '+48 601 234 567', country: '🇵🇱 Polska',    total: 2940, currency: 'zł', message: 'Czy możliwa jest dostawka dla dziecka?',      created_at: '2026-05-07T18:42:00Z' },
  'b-2': { id: 'b-2', status: 'confirmed',        arrival: '2026-06-28', departure: '2026-07-05', nights: 7,  guests: 2, name: 'Thomas Müller',         email: 'thomas.m@gmail.de',    phone: '+49 151 9876543',  country: '🇩🇪 Niemcy',    total: 1155, currency: '€', message: '',                                            created_at: '2026-05-06T10:15:00Z' },
  'b-3': { id: 'b-3', status: 'awaiting_payment', arrival: '2026-07-12', departure: '2026-07-19', nights: 7,  guests: 3, name: 'Joanna Wieczorek',      email: 'j.wieczorek@wp.pl',    phone: '+48 724 555 888',  country: '🇵🇱 Polska',    total: 2660, currency: 'zł', message: 'Przyjeżdżamy z psem, czy to problem?',       created_at: '2026-05-06T14:30:00Z' },
  'b-4': { id: 'b-4', status: 'checked_in',       arrival: '2026-05-03', departure: '2026-05-10', nights: 7,  guests: 2, name: 'Sophie Martin',         email: 'sophie.m@free.fr',     phone: '+33 6 12 34 56 78', country: '🇫🇷 Francja',   total: 980,  currency: '€', message: "Merci pour l'accueil chaleureux!",           created_at: '2026-04-28T09:00:00Z' },
  'b-5': { id: 'b-5', status: 'completed',        arrival: '2026-04-19', departure: '2026-04-26', nights: 7,  guests: 4, name: 'Piotr i Anna Kamińscy', email: 'p.kaminski@onet.pl',   phone: '+48 509 111 222',  country: '🇵🇱 Polska',    total: 2800, currency: 'zł', message: '',                                            created_at: '2026-04-10T11:20:00Z' },
  'b-6': { id: 'b-6', status: 'completed',        arrival: '2026-04-05', departure: '2026-04-12', nights: 7,  guests: 2, name: 'Carlos García',         email: 'c.garcia@gmail.es',    phone: '+34 612 345 678',  country: '🇪🇸 Hiszpania', total: 910,  currency: '€', message: 'Perfecto apartamento, volveremos!',           created_at: '2026-03-20T16:45:00Z' },
  'b-7': { id: 'b-7', status: 'cancelled',        arrival: '2026-05-24', departure: '2026-05-31', nights: 7,  guests: 3, name: 'Marta Kowalczyk',       email: 'm.kowalczyk@gmail.com',phone: '+48 789 000 123',  country: '🇵🇱 Polska',    total: 2380, currency: 'zł', message: 'Niestety zmiana planów, przepraszam.',       created_at: '2026-04-15T08:30:00Z' },
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '1.5rem', marginBottom: '1rem' }}>
      <h3 style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>
        {title}
      </h3>
      {children}
    </div>
  )
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.625rem', alignItems: 'flex-start' }}>
      <span style={{ fontSize: '0.8rem', color: '#9CA3AF', minWidth: '140px', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '0.875rem', color: '#111827', fontWeight: 500 }}>{value}</span>
    </div>
  )
}

export default function DemoBookingDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string
  const booking = DEMO_BOOKINGS[id]

  function demoAlert() {
    alert('To jest wersja demo — ta akcja jest niedostępna.')
  }

  if (!booking) {
    return (
      <div style={{ padding: '4rem', textAlign: 'center', color: '#9CA3AF' }}>
        Nie znaleziono rezerwacji.
      </div>
    )
  }

  const statusColor = STATUS_COLORS[booking.status]
  const statusLabel = STATUS_OPTIONS.find(o => o.value === booking.status)?.label ?? booking.status

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })

  const fmtShort = (d: string) =>
    new Date(d).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })

  const guestWord = booking.guests === 1 ? 'osoba' : booking.guests < 5 ? 'osoby' : 'osób'

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB' }}>
      {/* Demo banner */}
      <div style={{ background: '#7C3AED', color: 'white', padding: '0.6rem 2rem', fontSize: '0.82rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <span>👁 Demo panelu właściciela — dane są przykładowe, przyciski nie wykonują akcji</span>
        <a href="/#cennik" style={{ color: 'white', fontWeight: 800, textDecoration: 'underline', whiteSpace: 'nowrap' }}>Zamów własny panel →</a>
      </div>

      {/* Top nav */}
      <div style={{ background: 'white', borderBottom: '1px solid #E5E7EB', padding: '0 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 60 }}>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={() => router.push('/admin/demo/zamowienia')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', color: '#6B7280', fontFamily: 'inherit', padding: 0 }}
          >
            ← Rezerwacje
          </button>
          <span style={{ color: '#D1D5DB' }}>·</span>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>
            {booking.name}
          </span>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <a href="/sites/apartament-sloneczny" target="_blank" rel="noopener noreferrer"
            style={{ fontSize: '0.8rem', color: '#059669', fontWeight: 600, textDecoration: 'none', border: '1px solid #bbf7d0', background: '#f0fdf4', borderRadius: '8px', padding: '0.35rem 0.75rem' }}>
            🌐 Moja strona ↗
          </a>
        </div>
      </div>

      <div style={{ padding: '2rem', maxWidth: 800, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', marginBottom: '0.25rem' }}>
              {booking.name}
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#6B7280' }}>
              {booking.country} · zapytanie z {fmtDate(booking.created_at)}
            </p>
          </div>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, padding: '0.35rem 0.875rem', borderRadius: '20px', ...statusColor }}>
            {statusLabel}
          </span>
        </div>

        {/* Dates & price summary */}
        <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '1.25rem 1.5rem', marginBottom: '1rem', display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.3rem' }}>Termin</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827' }}>
              {fmtShort(booking.arrival)} → {fmtShort(booking.departure)}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.3rem' }}>Czas pobytu</div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827' }}>
              {booking.nights} nocy · {booking.guests} {guestWord}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.3rem' }}>Kwota</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827' }}>
              {booking.total} {booking.currency}
            </div>
          </div>
        </div>

        {/* Guest contact */}
        <Section title="Dane gościa">
          <Row label="Imię i nazwisko" value={booking.name} />
          <Row label="Email" value={booking.email} />
          <Row label="Telefon" value={booking.phone} />
          <Row label="Kraj" value={booking.country} />
        </Section>

        {/* Message */}
        {booking.message ? (
          <Section title="Wiadomość od gościa">
            <p style={{ fontSize: '0.9rem', color: '#374151', lineHeight: 1.65, background: '#F9FAFB', borderRadius: '8px', padding: '0.875rem 1rem', margin: 0 }}>
              💬 &ldquo;{booking.message}&rdquo;
            </p>
          </Section>
        ) : null}

        {/* Booking details */}
        <Section title="Szczegóły rezerwacji">
          <Row label="Data przyjazdu"  value={fmtDate(booking.arrival)} />
          <Row label="Data wyjazdu"    value={fmtDate(booking.departure)} />
          <Row label="Liczba nocy"     value={`${booking.nights} nocy`} />
          <Row label="Liczba gości"    value={`${booking.guests} ${guestWord}`} />
          <Row label="Kwota"           value={`${booking.total} ${booking.currency}`} />
        </Section>

        {/* Actions */}
        <Section title="Akcje">
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            {booking.status === 'new' && (
              <button onClick={demoAlert} style={{ background: '#059669', color: 'white', border: 'none', borderRadius: '8px', padding: '0.7rem 1.5rem', fontSize: '0.875rem', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
                ✓ Potwierdź rezerwację
              </button>
            )}
            {(booking.status === 'confirmed' || booking.status === 'awaiting_payment') && (
              <button onClick={demoAlert} style={{ background: '#059669', color: 'white', border: 'none', borderRadius: '8px', padding: '0.7rem 1.5rem', fontSize: '0.875rem', fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
                💳 Wyślij link do płatności
              </button>
            )}
            <button onClick={demoAlert} style={{ background: 'white', color: '#374151', border: '1.5px solid #D1D5DB', borderRadius: '8px', padding: '0.7rem 1.5rem', fontSize: '0.875rem', fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>
              ✉️ Wyślij wiadomość
            </button>
            {booking.status !== 'cancelled' && booking.status !== 'completed' && (
              <button onClick={demoAlert} style={{ background: 'white', color: '#DC2626', border: '1.5px solid #FECACA', borderRadius: '8px', padding: '0.7rem 1.5rem', fontSize: '0.875rem', fontWeight: 600, fontFamily: 'inherit', cursor: 'pointer' }}>
                ✗ Anuluj
              </button>
            )}
          </div>
          <p style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '0.875rem' }}>
            Zmień status ręcznie:&nbsp;
            <select
              defaultValue={booking.status}
              onChange={demoAlert}
              style={{ padding: '0.3rem 0.6rem', border: '1.5px solid #D1D5DB', borderRadius: '6px', fontSize: '0.8rem', fontFamily: 'inherit', cursor: 'pointer', background: 'white', fontWeight: 600, color: '#374151' }}
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </p>
        </Section>

      </div>
    </div>
  )
}
