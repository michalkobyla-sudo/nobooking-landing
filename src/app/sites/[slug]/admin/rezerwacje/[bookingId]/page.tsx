'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import type { Booking, BookingStatus } from '@/lib/types'

const STATUS_OPTIONS: Array<{ value: BookingStatus; label: string }> = [
  { value: 'pending',   label: 'Oczekuje na potwierdzenie' },
  { value: 'confirmed', label: 'Potwierdzona' },
  { value: 'cancelled', label: 'Anulowana' },
  { value: 'completed', label: 'Zakończona' },
]

const STATUS_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  pending:   { bg: '#FEF3C7', color: '#92400E', border: '#FCD34D' },
  confirmed: { bg: '#D1FAE5', color: '#065F46', border: '#6EE7B7' },
  cancelled: { bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5' },
  completed: { bg: '#F3F4F6', color: '#6B7280', border: '#D1D5DB' },
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.625rem' }}>
      <span style={{ fontSize: '0.8rem', color: '#9CA3AF', minWidth: '140px', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: '0.875rem', color: '#111827', fontWeight: 500 }}>{value}</span>
    </div>
  )
}

export default function OwnerBookingDetailPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string
  const bookingId = params.bookingId as string

  const [booking, setBooking] = useState<Booking | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/sites/${slug}/owner/bookings/${bookingId}`)
      if (res.status === 401) { router.push(`/sites/${slug}/admin/login`); return }
      if (res.status === 404) { router.push(`/sites/${slug}/admin/rezerwacje`); return }
      const data = await res.json() as Booking
      setBooking(data)
      setLoading(false)
    }
    load()
  }, [slug, bookingId, router])

  async function handleStatusChange(status: BookingStatus) {
    if (!booking) return
    setSaving(true)
    setSaveMsg(null)
    const res = await fetch(`/api/sites/${slug}/owner/bookings/${bookingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    if (res.ok) {
      setBooking(prev => prev ? { ...prev, status } : prev)
      setSaveMsg('Zapisano ✓')
      setTimeout(() => setSaveMsg(null), 2500)
    } else {
      setSaveMsg('Błąd zapisu')
    }
    setSaving(false)
  }

  if (loading) {
    return <div style={{ padding: '4rem', textAlign: 'center', color: '#9CA3AF' }}>Ładowanie...</div>
  }
  if (!booking) return null

  const st = STATUS_STYLES[booking.status] ?? STATUS_STYLES.pending
  const checkIn  = new Date(booking.check_in).toLocaleDateString('pl-PL',  { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const checkOut = new Date(booking.check_out).toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const price    = `${booking.total_price.toLocaleString('pl-PL')} ${(booking.currency || 'EUR').toUpperCase()}`
  const createdAt = new Date(booking.created_at).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })

  const card: React.CSSProperties = {
    background: 'white', border: '1px solid #E5E7EB',
    borderRadius: '12px', padding: '1.25rem 1.5rem', marginBottom: '1rem',
  }
  const sectionTitle: React.CSSProperties = {
    fontSize: '0.7rem', fontWeight: 700, color: '#9CA3AF',
    textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.875rem',
  }

  return (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <button
          onClick={() => router.push(`/sites/${slug}/admin/rezerwacje`)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', color: '#6B7280', fontFamily: 'inherit', padding: 0 }}
        >
          ← Rezerwacje
        </button>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', marginBottom: '0.25rem' }}>
            {booking.guest_name}
          </h1>
          <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: 0 }}>
            Rezerwacja z {createdAt}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {saveMsg && (
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: saveMsg.startsWith('Błąd') ? '#DC2626' : '#059669' }}>
              {saveMsg}
            </span>
          )}
          <select
            value={booking.status}
            onChange={e => handleStatusChange(e.target.value as BookingStatus)}
            disabled={saving}
            style={{
              padding: '0.5rem 0.875rem',
              border: `1.5px solid ${st.border}`,
              borderRadius: '8px',
              fontSize: '0.875rem',
              fontFamily: 'inherit',
              cursor: saving ? 'not-allowed' : 'pointer',
              background: st.bg,
              color: st.color,
              fontWeight: 700,
              opacity: saving ? 0.7 : 1,
            }}
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Gość */}
      <div style={card}>
        <h3 style={sectionTitle}>Gość</h3>
        <Row label="Imię i nazwisko" value={booking.guest_name} />
        <Row label="Email" value={booking.guest_email} />
        <Row label="Telefon" value={booking.guest_phone} />
      </div>

      {/* Termin */}
      <div style={card}>
        <h3 style={sectionTitle}>Termin pobytu</h3>
        <Row label="Check-in"       value={checkIn} />
        <Row label="Check-out"      value={checkOut} />
        <Row label="Liczba nocy"    value={`${booking.nights} ${booking.nights === 1 ? 'noc' : 'nocy'}`} />
        <Row label="Liczba gości"   value={`${booking.guests_count} ${booking.guests_count === 1 ? 'osoba' : 'osób'}`} />
      </div>

      {/* Płatność */}
      <div style={card}>
        <h3 style={sectionTitle}>Płatność</h3>
        <Row label="Kwota"             value={price} />
        <Row label="Status płatności"  value={booking.stripe_paid ? '✅ Opłacone' : '⏳ Oczekuje na płatność'} />
        {booking.discount_code && (
          <Row label="Kod rabatowy" value={`${booking.discount_code} (${booking.discount_pct}%)`} />
        )}
        {booking.stripe_session_id && (
          <Row label="Stripe Session" value={booking.stripe_session_id} />
        )}
      </div>

      {/* Uwagi */}
      {booking.notes && (
        <div style={card}>
          <h3 style={sectionTitle}>Uwagi gościa</h3>
          <p style={{ fontSize: '0.875rem', color: '#374151', lineHeight: '1.6', margin: 0 }}>{booking.notes}</p>
        </div>
      )}
    </div>
  )
}
