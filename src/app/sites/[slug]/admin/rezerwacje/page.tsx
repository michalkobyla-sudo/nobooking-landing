import { requireOwnerPage } from '@/lib/ownerAuth'
import { createServiceClient } from '@/lib/supabase'
import type { Booking } from '@/lib/types'

const STATUS_LABELS: Record<string, { label: string; bg: string; color: string }> = {
  pending:   { label: 'Oczekuje',     bg: '#FEF3C7', color: '#92400E' },
  confirmed: { label: 'Potwierdzona', bg: '#D1FAE5', color: '#065F46' },
  cancelled: { label: 'Anulowana',    bg: '#FEE2E2', color: '#991B1B' },
  completed: { label: 'Zakończona',   bg: '#F3F4F6', color: '#6B7280' },
}

interface Props {
  params: Promise<{ slug: string }>
}

export default async function OwnerBookingsPage({ params }: Props) {
  const { slug } = await params
  const site = await requireOwnerPage(slug)

  const supabase = createServiceClient()
  const { data: bookings } = await supabase
    .from('bookings')
    .select('id, guest_name, guest_email, check_in, check_out, nights, guests_count, total_price, currency, status, stripe_paid, created_at')
    .eq('site_id', site.id)
    .order('check_in', { ascending: true })

  const today = new Date().toISOString().slice(0, 10)
  const all = (bookings ?? []) as Booking[]
  const upcoming = all.filter(b => b.status !== 'cancelled' && b.check_out >= today)
  const past     = all.filter(b => b.status !== 'cancelled' && b.check_out < today)
  const cancelled = all.filter(b => b.status === 'cancelled')

  function BookingTable({ list, title }: { list: Booking[]; title: string }) {
    if (list.length === 0) return null
    return (
      <div style={{ marginBottom: '2rem' }}>
        <h2 style={{
          fontSize: '0.7rem', fontWeight: 700, color: '#9CA3AF',
          textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem',
        }}>
          {title} ({list.length})
        </h2>
        <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden' }}>
          {list.map((b, i) => {
            const st = STATUS_LABELS[b.status] ?? STATUS_LABELS.pending
            const checkIn  = new Date(b.check_in).toLocaleDateString('pl-PL',  { day: 'numeric', month: 'short' })
            const checkOut = new Date(b.check_out).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' })
            const price = `${b.total_price.toLocaleString('pl-PL')} ${(b.currency || 'EUR').toUpperCase()}`
            return (
              <a
                key={b.id}
                href={`/sites/${slug}/admin/rezerwacje/${b.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  padding: '0.875rem 1.25rem',
                  borderTop: i === 0 ? 'none' : '1px solid #F3F4F6',
                  textDecoration: 'none',
                  color: 'inherit',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#111827', marginBottom: '0.125rem' }}>
                    {b.guest_name}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                    {checkIn} → {checkOut} · {b.nights} {b.nights === 1 ? 'noc' : 'nocy'} · {b.guests_count} {b.guests_count === 1 ? 'osoba' : 'osób'}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827', marginBottom: '0.25rem' }}>{price}</div>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 700,
                    padding: '0.2rem 0.6rem', borderRadius: '999px',
                    background: st.bg, color: st.color,
                  }}>
                    {st.label}
                  </span>
                </div>
                <div style={{ color: '#D1D5DB', fontSize: '1rem', flexShrink: 0 }}>›</div>
              </a>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', marginBottom: '1.5rem' }}>
        Rezerwacje
      </h1>

      {all.length === 0 && (
        <div style={{
          background: 'white', border: '1px solid #E5E7EB', borderRadius: '12px',
          padding: '3rem', textAlign: 'center', color: '#9CA3AF', fontSize: '0.875rem',
        }}>
          Brak rezerwacji
        </div>
      )}

      <BookingTable list={upcoming}  title="Nadchodzące i aktywne" />
      <BookingTable list={past}      title="Zakończone" />
      <BookingTable list={cancelled} title="Anulowane" />
    </div>
  )
}
