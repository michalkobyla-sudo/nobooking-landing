'use client'

import { useState, useEffect, useCallback } from 'react'
import type { Booking, Review, BlockedDate } from '@/lib/types'
import { KalendarzView } from './KalendarzView'

// ─── Design tokens ────────────────────────────────────────────────
const PRIMARY = '#1A5276'
const GOLD    = '#D97706'
const SIDEBAR = '#111827'
const CARD_BD = '#E5E7EB'
const PAGE_BG = '#F3F4F6'

// ─── Mobile hook ─────────────────────────────────────────────────
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [breakpoint])
  return isMobile
}

// ─── Types ────────────────────────────────────────────────────────
type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed'
type Tab = 'dashboard' | 'bookings' | 'guests' | 'cennik' | 'kalendarz' | 'opinie' | 'analityka' | 'ustawienia'

const STATUS_CFG: Record<BookingStatus, { label: string; bg: string; color: string }> = {
  pending:   { label: 'Nowe zapytanie', bg: '#EFF6FF', color: '#1D4ED8' },
  confirmed: { label: 'Potwierdzona',   bg: '#F0FDF4', color: '#15803D' },
  cancelled: { label: 'Anulowana',      bg: '#FEF2F2', color: '#DC2626' },
  completed: { label: 'Zakończona',     bg: '#F3F4F6', color: '#374151' },
}

interface SiteSettings {
  name:          string
  location:      string
  owner_email:   string
  plan:          'basic' | 'pro'
  contact_email: string
  contact_phone: string
  pricing: {
    currency:    string
    cleaningFee: number
    tiers: {
      low:  { pricePerNight: number; minNights: number; label: { pl: string }; months: string }
      mid:  { pricePerNight: number; minNights: number; label: { pl: string }; months: string }
      high: { pricePerNight: number; minNights: number; label: { pl: string }; months: string }
    }
  } | null
  slug: string
}

interface Stats {
  bookings_this_month: number
  revenue_this_month:  number
  revenue_currency:    string
  avg_rating:          number | null
  upcoming_count:      number
}

// ─── Small components ─────────────────────────────────────────────
function StatusBadge({ status }: { status: BookingStatus }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.pending
  return (
    <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '0.22rem 0.6rem', borderRadius: 20, whiteSpace: 'nowrap', background: cfg.bg, color: cfg.color }}>
      {cfg.label}
    </span>
  )
}

function ProBadge() {
  return (
    <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '0.1rem 0.45rem', borderRadius: 20, background: GOLD, color: 'white', letterSpacing: '0.04em', marginLeft: '0.4rem' }}>
      PRO
    </span>
  )
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: 'white', border: `1px solid ${CARD_BD}`, borderRadius: 14, padding: '1.25rem 1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', ...style }}>
      {children}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#111827', marginBottom: '1rem', marginTop: 0 }}>{children}</h2>
}

// ─── Sidebar ──────────────────────────────────────────────────────
const NAV_ITEMS: Array<{ id: Tab; icon: string; label: string; pro?: boolean }> = [
  { id: 'dashboard',  icon: '🏠', label: 'Dashboard' },
  { id: 'bookings',   icon: '📅', label: 'Rezerwacje' },
  { id: 'guests',     icon: '👥', label: 'Goście' },
  { id: 'cennik',     icon: '💰', label: 'Cennik' },
  { id: 'kalendarz',  icon: '🗓️', label: 'Kalendarz' },
  { id: 'opinie',     icon: '⭐', label: 'Opinie' },
  { id: 'analityka',  icon: '📊', label: 'Analityka', pro: true },
  { id: 'ustawienia', icon: '⚙️', label: 'Ustawienia' },
]

function Sidebar({ activeTab, setTab, collapsed, setCollapsed, siteName, ownerEmail, slug }: {
  activeTab: Tab
  setTab: (t: Tab) => void
  collapsed: boolean
  setCollapsed: (v: boolean) => void
  siteName: string
  ownerEmail: string
  slug: string
}) {
  return (
    <div style={{
      width: collapsed ? 60 : 230,
      minHeight: '100%',
      background: SIDEBAR,
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      transition: 'width 0.2s',
      overflow: 'hidden',
    }}>
      <div style={{ padding: collapsed ? '1rem 0' : '1.25rem', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', borderBottom: '1px solid #1F2937' }}>
        {!collapsed && (
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'white', letterSpacing: '-0.01em' }}>{siteName}</div>
            <div style={{ fontSize: '0.65rem', color: '#6B7280', marginTop: 1 }}>Panel właściciela</div>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: '1.1rem', padding: '0.25rem', lineHeight: 1 }}>
          {collapsed ? '→' : '←'}
        </button>
      </div>

      <nav style={{ flex: 1, padding: '0.5rem 0' }}>
        {NAV_ITEMS.map(item => {
          const active = activeTab === item.id
          return (
            <button key={item.id} onClick={() => setTab(item.id)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: collapsed ? '0.7rem 0' : '0.7rem 1.25rem',
              justifyContent: collapsed ? 'center' : 'flex-start',
              background: active ? '#1F2937' : 'none',
              border: 'none', borderLeft: active ? `3px solid ${GOLD}` : '3px solid transparent',
              cursor: 'pointer', textAlign: 'left', transition: 'background 0.15s',
            }}>
              <span style={{ fontSize: '1rem', flexShrink: 0 }}>{item.icon}</span>
              {!collapsed && (
                <>
                  <span style={{ fontSize: '0.85rem', fontWeight: active ? 700 : 500, color: active ? 'white' : '#9CA3AF' }}>{item.label}</span>
                  {item.pro && <ProBadge />}
                </>
              )}
            </button>
          )
        })}
      </nav>

      {!collapsed && (
        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #1F2937' }}>
          <div style={{ fontSize: '0.7rem', color: '#4B5563', marginBottom: '0.3rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ownerEmail}</div>
          <form action={`/api/sites/${slug}/owner/logout`} method="POST">
            <button type="submit" style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', fontSize: '0.72rem', padding: 0, fontFamily: 'inherit', textDecoration: 'underline' }}>
              Wyloguj
            </button>
          </form>
          <div style={{ fontSize: '0.65rem', color: '#374151', marginTop: '0.3rem' }}>
            Powered by <span style={{ color: GOLD, fontWeight: 700 }}>Nobooking</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────
function DashboardView({
  bookings, stats, setTab, setBookingId,
}: {
  bookings: Booking[]
  stats: Stats | null
  setTab: (t: Tab) => void
  setBookingId: (id: string) => void
}) {
  const isMobile = useIsMobile()
  const now = new Date()
  const monthName = now.toLocaleDateString('pl-PL', { month: 'long' })

  const upcoming = bookings.filter(b => ['pending', 'confirmed'].includes(b.status) && b.check_in >= now.toISOString().slice(0, 10))

  const statCards = [
    { icon: '📅', label: `Rezerwacje (${monthName})`,    value: stats ? String(stats.bookings_this_month) : '…' },
    { icon: '💰', label: `Przychód (${monthName})`,       value: stats ? `${stats.revenue_this_month.toLocaleString('pl-PL')} ${stats.revenue_currency}` : '…' },
    { icon: '📊', label: 'Nadchodzące rezerwacje',         value: stats ? String(stats.upcoming_count) : '…' },
    { icon: '⭐', label: 'Średnia ocena',                 value: stats?.avg_rating != null ? `${stats.avg_rating} / 5` : '—' },
  ]

  return (
    <div>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111827', marginBottom: '1.5rem' }}>Dashboard</h1>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {statCards.map(s => (
          <Card key={s.label}>
            <div style={{ fontSize: '1.4rem', marginBottom: '0.3rem' }}>{s.icon}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.03em' }}>{s.value}</div>
            <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '0.2rem' }}>{s.label}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.5rem' }}>
        <Card>
          <SectionTitle>Nadchodzące pobyty</SectionTitle>
          {upcoming.length === 0 && <p style={{ color: '#9CA3AF', fontSize: '0.85rem', margin: 0 }}>Brak nadchodzących pobytów.</p>}
          {upcoming.slice(0, 5).map(b => (
            <div key={b.id} onClick={() => { setBookingId(b.id); setTab('bookings') }}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderBottom: `1px solid #F3F4F6`, cursor: 'pointer', gap: '0.5rem' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.guest_name}</div>
                <div style={{ fontSize: '0.73rem', color: '#9CA3AF' }}>{b.check_in} → {b.check_out}</div>
              </div>
              <StatusBadge status={b.status as BookingStatus} />
            </div>
          ))}
        </Card>

        <Card>
          <SectionTitle>Szybkie akcje</SectionTitle>
          {[
            { icon: '📅', label: 'Zarządzaj kalendarzem', href: '' as string | null, tab: 'cennik' as Tab | null },
            { icon: '📋', label: 'Lista rezerwacji',       href: null, tab: 'bookings' as Tab },
            { icon: '👥', label: 'Baza gości',             href: null, tab: 'guests' as Tab },
            { icon: '⭐', label: 'Moderuj opinie',         href: null, tab: 'opinie' as Tab },
          ].map(a => (
            <button key={a.label} onClick={() => a.tab && setTab(a.tab)} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '0.7rem',
              background: '#F9FAFB', border: `1px solid ${CARD_BD}`, borderRadius: 10,
              padding: '0.65rem 0.9rem', marginBottom: '0.5rem', cursor: 'pointer',
              fontFamily: 'inherit', textAlign: 'left',
            }}>
              <span style={{ fontSize: '1rem', flexShrink: 0 }}>{a.icon}</span>
              <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#374151', flex: 1 }}>{a.label}</span>
            </button>
          ))}
        </Card>
      </div>
    </div>
  )
}

// ─── Booking list ─────────────────────────────────────────────────
type FilterVal = BookingStatus | 'all'
const FILTERS: Array<{ value: FilterVal; label: string }> = [
  { value: 'all',       label: 'Wszystkie' },
  { value: 'pending',   label: 'Nowe' },
  { value: 'confirmed', label: 'Potwierdzone' },
  { value: 'completed', label: 'Zakończone' },
  { value: 'cancelled', label: 'Anulowane' },
]

function BookingListView({ bookings, onSelect }: { bookings: Booking[]; onSelect: (id: string) => void }) {
  const isMobile = useIsMobile()
  const [filter, setFilter] = useState<FilterVal>('all')
  const [search, setSearch] = useState('')

  const list = bookings.filter(b => {
    if (filter !== 'all' && b.status !== filter) return false
    const q = search.toLowerCase()
    if (q && !b.guest_name.toLowerCase().includes(q) && !b.guest_email.toLowerCase().includes(q)) return false
    return true
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111827', margin: 0 }}>Rezerwacje i zapytania</h1>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Szukaj gościa, email…" style={{
          border: `1px solid ${CARD_BD}`, borderRadius: 10, padding: '0.45rem 0.9rem',
          fontSize: '0.84rem', fontFamily: 'inherit', outline: 'none',
          width: isMobile ? '100%' : 220, boxSizing: 'border-box',
        }} />
      </div>

      <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {FILTERS.map(f => (
          <button key={f.value} onClick={() => setFilter(f.value)} style={{
            padding: '0.3rem 0.8rem', borderRadius: 20, border: '1px solid',
            fontFamily: 'inherit', fontSize: '0.77rem', fontWeight: 600, cursor: 'pointer',
            borderColor: filter === f.value ? PRIMARY : CARD_BD,
            background: filter === f.value ? PRIMARY : 'white',
            color: filter === f.value ? 'white' : '#374151',
          }}>
            {f.label}
          </button>
        ))}
      </div>

      <Card style={{ padding: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${CARD_BD}`, background: '#F9FAFB' }}>
                {['Gość', 'Termin', 'Noce', 'Kwota', 'Zaliczka', 'Status', ''].map(h => (
                  <th key={h} style={{ padding: '0.7rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((b, i) => (
                <tr key={b.id} onClick={() => onSelect(b.id)}
                  style={{ borderBottom: i < list.length - 1 ? `1px solid #F3F4F6` : 'none', cursor: 'pointer' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F9FAFB' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'white' }}
                >
                  <td style={{ padding: '0.85rem 1rem', maxWidth: 160 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.guest_name}</div>
                    <div style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>{b.guest_email}</div>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontSize: '0.83rem', color: '#374151', whiteSpace: 'nowrap' }}>
                    {new Date(b.check_in).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}
                    {' → '}
                    {new Date(b.check_out).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontSize: '0.83rem', color: '#374151', textAlign: 'center' }}>
                    {b.nights}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontSize: '0.88rem', fontWeight: 700, color: '#111827', whiteSpace: 'nowrap' }}>
                    {b.total_price} {b.currency}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontSize: '0.83rem', color: b.stripe_paid ? '#15803D' : '#9CA3AF', whiteSpace: 'nowrap' }}>
                    {b.stripe_paid ? '✓ Zapłacona' : '—'}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <StatusBadge status={b.status as BookingStatus} />
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: '#9CA3AF', whiteSpace: 'nowrap' }}>
                    {b.notes ? '💬' : ''}
                    {b.discount_code ? ' 🏷️' : ''}
                    {b.checkin_submitted ? ' ✅' : ''}
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#9CA3AF', fontSize: '0.85rem' }}>Brak rezerwacji spełniających kryteria.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// ─── Booking detail ───────────────────────────────────────────────
function BookingDetailView({
  booking,
  slug,
  onBack,
  onStatusChange,
}: {
  booking: Booking
  slug: string
  onBack: () => void
  onStatusChange: (id: string, status: BookingStatus) => void
}) {
  const isMobile = useIsMobile()
  const [saving, setSaving] = useState(false)
  const [currentStatus, setCurrentStatus] = useState<BookingStatus>(booking.status as BookingStatus)

  async function handleStatusChange(newStatus: BookingStatus) {
    setSaving(true)
    try {
      const res = await fetch(`/api/sites/${slug}/owner/bookings/${booking.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (res.ok) {
        setCurrentStatus(newStatus)
        onStatusChange(booking.id, newStatus)
      } else {
        alert('Nie udało się zmienić statusu. Spróbuj ponownie.')
      }
    } finally {
      setSaving(false)
    }
  }

  const b = booking

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button onClick={onBack} style={{ background: 'none', border: `1px solid ${CARD_BD}`, borderRadius: 8, padding: '0.35rem 0.75rem', cursor: 'pointer', fontSize: '0.82rem', color: '#374151', fontFamily: 'inherit', flexShrink: 0 }}>
          ← Wróć
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.guest_name}</h1>
          <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: 2 }}>
            Rezerwacja #{b.id.slice(0, 8)} · {new Date(b.created_at).toLocaleDateString('pl-PL')}
          </div>
        </div>
        <StatusBadge status={currentStatus} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <Card>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Szczegóły rezerwacji</div>
          {([
            ['Przyjazd',     b.check_in],
            ['Wyjazd',       b.check_out],
            ['Noce',         String(b.nights)],
            ['Goście',       String(b.guests_count)],
            ['Kwota',        `${b.total_price} ${b.currency}`],
            ['Płatność',     b.stripe_paid ? '✓ Zapłacona' : 'Brak'],
            ['Kod rabatowy', b.discount_code ? `${b.discount_code} (${b.discount_pct}%)` : '—'],
          ] as [string, string][]).map(([label, val]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.83rem', marginBottom: '0.4rem', gap: '0.5rem' }}>
              <span style={{ color: '#9CA3AF', flexShrink: 0 }}>{label}</span>
              <span style={{ fontWeight: 600, color: '#111827', textAlign: 'right' }}>{val}</span>
            </div>
          ))}
          {b.notes && (
            <div style={{ marginTop: '0.75rem', background: '#F9FAFB', borderRadius: 8, padding: '0.6rem 0.75rem', fontSize: '0.8rem', color: '#374151', lineHeight: 1.5 }}>
              💬 {b.notes}
            </div>
          )}
        </Card>

        <Card>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Dane gościa</div>
          {([
            ['Imię i nazwisko', b.guest_name],
            ['Email',           b.guest_email],
            ['Telefon',         b.guest_phone || '—'],
          ] as [string, string][]).map(([label, val]) => (
            <div key={label} style={{ marginBottom: '0.6rem' }}>
              <div style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>{label}</div>
              <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#111827', wordBreak: 'break-all' }}>{val}</div>
            </div>
          ))}
          {b.guest_phone && (
            <a
              href={`sms:${b.guest_phone}`}
              style={{ display: 'block', marginTop: '0.5rem', width: '100%', background: PRIMARY, color: 'white', border: 'none', borderRadius: 8, padding: '0.5rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}
            >
              📱 Wyślij SMS
            </a>
          )}
          <a
            href={`mailto:${b.guest_email}`}
            style={{ display: 'block', marginTop: '0.5rem', width: '100%', background: '#F3F4F6', color: '#374151', border: `1px solid ${CARD_BD}`, borderRadius: 8, padding: '0.5rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}
          >
            ✉️ Wyślij email
          </a>
        </Card>

        <Card>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Zarządzanie</div>
          <div style={{ marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginBottom: '0.3rem' }}>Status rezerwacji</div>
            <select
              value={currentStatus}
              disabled={saving}
              onChange={e => handleStatusChange(e.target.value as BookingStatus)}
              style={{ width: '100%', border: `1px solid ${CARD_BD}`, borderRadius: 8, padding: '0.4rem 0.5rem', fontSize: '0.83rem', fontFamily: 'inherit', color: '#374151', opacity: saving ? 0.5 : 1 }}
            >
              {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            {saving && <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: '0.3rem' }}>Zapisywanie…</div>}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginBottom: '0.3rem' }}>Token gościa</div>
          <div style={{ fontSize: '0.72rem', color: '#374151', background: '#F9FAFB', borderRadius: 6, padding: '0.4rem 0.5rem', wordBreak: 'break-all', fontFamily: 'monospace' }}>
            {b.token}
          </div>
        </Card>
      </div>

      {/* Check-in status */}
      {b.checkin_submitted ? (
        <Card style={{ marginBottom: '1.5rem', borderLeft: '4px solid #15803D' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#15803D', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.5rem' }}>✅ Online Check-in wypełniony</div>
          <div style={{ fontSize: '0.83rem', color: '#374151' }}>Gość wypełnił formularz online przed przyjazdem.</div>
        </Card>
      ) : (
        <Card style={{ marginBottom: '1.5rem', borderLeft: '4px solid #E5E7EB' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#374151' }}>📋 Online Check-in</div>
              <div style={{ fontSize: '0.78rem', color: '#9CA3AF', marginTop: '0.15rem' }}>
                {b.checkin_sent ? 'Link wysłany — gość jeszcze nie wypełnił formularza.' : 'Gość nie otrzymał jeszcze linku do check-in.'}
              </div>
            </div>
            <a
              href={`/checkin/${b.token}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ background: PRIMARY, color: 'white', border: 'none', borderRadius: 8, padding: '0.45rem 0.9rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0, textDecoration: 'none' }}
            >
              Link check-in ↗
            </a>
          </div>
        </Card>
      )}

      {/* Wiadomości placeholder */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.5rem' }}>
        <Card>
          <SectionTitle>💬 Notatki</SectionTitle>
          <p style={{ fontSize: '0.83rem', color: '#9CA3AF', margin: 0 }}>
            {b.notes || 'Brak notatek do tej rezerwacji.'}
          </p>
        </Card>

        <Card>
          <SectionTitle>📧 Kontakt</SectionTitle>
          <div style={{ fontSize: '0.83rem', color: '#374151' }}>
            <div style={{ marginBottom: '0.5rem' }}>
              <span style={{ color: '#9CA3AF' }}>Email: </span>
              <a href={`mailto:${b.guest_email}`} style={{ color: PRIMARY, fontWeight: 600 }}>{b.guest_email}</a>
            </div>
            {b.guest_phone && (
              <div>
                <span style={{ color: '#9CA3AF' }}>Telefon: </span>
                <a href={`tel:${b.guest_phone}`} style={{ color: PRIMARY, fontWeight: 600 }}>{b.guest_phone}</a>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}

// ─── Guests ───────────────────────────────────────────────────────
function GuestsView({ bookings }: { bookings: Booking[] }) {
  const byEmail = new Map<string, Booking[]>()
  for (const b of bookings) {
    const arr = byEmail.get(b.guest_email) ?? []
    arr.push(b)
    byEmail.set(b.guest_email, arr)
  }
  const guests = Array.from(byEmail.values()).map(arr => ({
    ...arr[0],
    count:    arr.length,
    lastStay: arr.sort((a, b) => b.check_out.localeCompare(a.check_out))[0].check_out,
  }))

  return (
    <div>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111827', marginBottom: '1.5rem' }}>Goście</h1>
      <Card style={{ padding: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${CARD_BD}`, background: '#F9FAFB' }}>
                {['Gość', 'Email', 'Telefon', 'Rezerwacji', 'Ostatni pobyt'].map(h => (
                  <th key={h} style={{ padding: '0.7rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.05em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {guests.length === 0 && (
                <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#9CA3AF' }}>Brak gości.</td></tr>
              )}
              {guests.map((g, i) => (
                <tr key={g.guest_email}
                  style={{ borderBottom: i < guests.length - 1 ? `1px solid #F3F4F6` : 'none' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F9FAFB' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'white' }}
                >
                  <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', fontWeight: 600, color: '#111827', whiteSpace: 'nowrap' }}>{g.guest_name}</td>
                  <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', color: '#374151' }}>
                    <a href={`mailto:${g.guest_email}`} style={{ color: PRIMARY }}>{g.guest_email}</a>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', color: '#374151', whiteSpace: 'nowrap' }}>{g.guest_phone || '—'}</td>
                  <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', color: '#374151', textAlign: 'center' }}>{g.count}</td>
                  <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', color: '#374151', whiteSpace: 'nowrap' }}>{g.lastStay}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// ─── Cennik ───────────────────────────────────────────────────────
function CennikView({ settings, slug, plan, setTab }: { settings: SiteSettings | null; slug: string; plan: 'basic' | 'pro'; setTab: (t: Tab) => void }) {
  const isMobile = useIsMobile()
  const pricing = settings?.pricing
  const tiers = pricing?.tiers
    ? [
        { name: tiers_label(pricing.tiers.high?.label?.pl, 'Wysoki sezon'), months: pricing.tiers.high?.months ?? '', pricePerNight: pricing.tiers.high?.pricePerNight ?? 0, minNights: pricing.tiers.high?.minNights ?? 1, currency: pricing.currency },
        { name: tiers_label(pricing.tiers.mid?.label?.pl,  'Średni sezon'), months: pricing.tiers.mid?.months  ?? '', pricePerNight: pricing.tiers.mid?.pricePerNight  ?? 0, minNights: pricing.tiers.mid?.minNights  ?? 1, currency: pricing.currency },
        { name: tiers_label(pricing.tiers.low?.label?.pl,  'Niski sezon'),  months: pricing.tiers.low?.months  ?? '', pricePerNight: pricing.tiers.low?.pricePerNight  ?? 0, minNights: pricing.tiers.low?.minNights  ?? 1, currency: pricing.currency },
      ]
    : []

  function tiers_label(v: string | undefined, fallback: string): string {
    return v || fallback
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111827', marginBottom: '1.5rem' }}>Cennik i dostępność</h1>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <Card>
          <SectionTitle>Sezony cenowe</SectionTitle>
          {tiers.length === 0 && <p style={{ fontSize: '0.83rem', color: '#9CA3AF' }}>Brak danych cennika.</p>}
          {tiers.map(s => (
            <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderBottom: `1px solid #F3F4F6`, gap: '0.5rem' }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827' }}>{s.name}</div>
                <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{s.months} · min. {s.minNights} nocy</div>
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: PRIMARY, flexShrink: 0 }}>
                {s.pricePerNight} {s.currency}<span style={{ fontSize: '0.72rem', fontWeight: 400, color: '#9CA3AF' }}>/noc</span>
              </div>
            </div>
          ))}
          {pricing?.cleaningFee != null && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.6rem' }}>
              <div style={{ fontSize: '0.85rem', color: '#374151' }}>Sprzątanie końcowe</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#374151' }}>{pricing.cleaningFee} {pricing.currency}</div>
            </div>
          )}
          <div style={{ marginTop: '1rem', background: '#EFF6FF', borderRadius: 10, padding: '0.75rem', fontSize: '0.78rem', color: '#1D4ED8' }}>
            ℹ️ Aby zmienić cennik, skontaktuj się z Nobooking.
          </div>
        </Card>

        <Card>
          <SectionTitle>Dostępność kalendarza</SectionTitle>
          <p style={{ fontSize: '0.82rem', color: '#9CA3AF', marginBottom: '1rem', marginTop: 0 }}>
            Blokuj daty kiedy apartament jest niedostępny (własne pobyty, remonty itp.).
          </p>
          <button
            onClick={() => setTab('kalendarz')}
            style={{ display: 'block', width: '100%', textAlign: 'center', background: '#374151', color: 'white', borderRadius: 10, padding: '0.65rem', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', border: 'none', boxSizing: 'border-box' }}
          >
            🗓️ Otwórz kalendarz →
          </button>
        </Card>
      </div>

      {/* Discount codes PRO locked */}
      <Card style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ filter: plan === 'pro' ? 'none' : 'blur(3px)', pointerEvents: plan === 'pro' ? 'auto' : 'none' }}>
          <SectionTitle>Kody rabatowe</SectionTitle>
          <p style={{ fontSize: '0.82rem', color: '#9CA3AF' }}>Twórz kody rabatowe dla stałych gości.</p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <input placeholder="Kod (np. LATO10)" style={{ border: `1px solid ${CARD_BD}`, borderRadius: 8, padding: '0.45rem 0.7rem', fontSize: '0.83rem', fontFamily: 'inherit', outline: 'none', width: 160 }} />
            <input placeholder="%" style={{ border: `1px solid ${CARD_BD}`, borderRadius: 8, padding: '0.45rem 0.7rem', fontSize: '0.83rem', fontFamily: 'inherit', outline: 'none', width: 80 }} />
            <button style={{ background: PRIMARY, color: 'white', border: 'none', borderRadius: 8, padding: '0.45rem 1rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Dodaj kod</button>
          </div>
        </div>
        {plan !== 'pro' && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.65)', backdropFilter: 'blur(2px)' }}>
            <ProBadge />
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#111827', marginTop: '0.5rem', textAlign: 'center' }}>Kody rabatowe dostępne w planie PRO</div>
            <a href="https://www.nobooking.eu/#cennik" target="_blank" rel="noopener noreferrer" style={{ marginTop: '0.75rem', background: GOLD, color: 'white', border: 'none', borderRadius: 8, padding: '0.5rem 1.25rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none' }}>
              Przejdź na PRO →
            </a>
          </div>
        )}
      </Card>
    </div>
  )
}

// ─── Opinie ───────────────────────────────────────────────────────
function OpinieView({ reviews, slug, onToggle }: { reviews: Review[]; slug: string; onToggle: (id: string) => void }) {
  return (
    <div>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111827', marginBottom: '0.5rem' }}>Opinie gości</h1>
      <p style={{ fontSize: '0.83rem', color: '#9CA3AF', marginBottom: '1.5rem' }}>Po wyjeździe gość otrzymuje automatyczny email z prośbą o opinię.</p>

      {reviews.length === 0 && (
        <Card>
          <p style={{ fontSize: '0.85rem', color: '#9CA3AF', margin: 0, textAlign: 'center' }}>Brak opinii. Pojawią się tutaj po zakończeniu pierwszego pobytu.</p>
        </Card>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {reviews.map(r => (
          <Card key={r.id} style={{ borderLeft: r.published ? '4px solid #15803D' : '4px solid #E5E7EB' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: '0.2rem', marginBottom: '0.4rem' }}>
                  {Array.from({ length: r.score }).map((_, i) => <span key={i} style={{ color: GOLD, fontSize: '0.9rem' }}>★</span>)}
                </div>
                <p style={{ fontSize: '0.85rem', color: '#374151', margin: 0, marginBottom: '0.5rem', fontStyle: 'italic' }}>„{r.text}"</p>
                <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>
                  {r.guest_name} · {new Date(r.created_at).toLocaleDateString('pl-PL')}
                </div>
              </div>
              <button onClick={() => onToggle(r.id)} style={{
                padding: '0.35rem 0.8rem', borderRadius: 8, border: 'none', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
                background: r.published ? '#FEF2F2' : '#F0FDF4', color: r.published ? '#DC2626' : '#15803D',
              }}>
                {r.published ? '🙈 Ukryj' : '👁 Publikuj'}
              </button>
            </div>
            <div style={{ marginTop: '0.5rem' }}>
              <span style={{ fontSize: '0.73rem', fontWeight: 700, padding: '0.18rem 0.5rem', borderRadius: 20, background: r.published ? '#F0FDF4' : '#F3F4F6', color: r.published ? '#15803D' : '#9CA3AF' }}>
                {r.published ? '✓ Opublikowana na stronie' : 'Ukryta'}
              </span>
            </div>
          </Card>
        ))}
      </div>

      <Card style={{ marginTop: '1.5rem', background: '#EFF6FF', border: '1px solid #BFDBFE' }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: PRIMARY, marginBottom: '0.3rem' }}>ℹ️ System automatycznych opinii Nobooking</div>
        <p style={{ fontSize: '0.82rem', color: '#374151', margin: 0 }}>
          Po zakończeniu pobytu Nobooking wysyła gościowi automatyczny email z prośbą o opinię. Możesz moderować opinie przed wyświetleniem na stronie.
        </p>
      </Card>
    </div>
  )
}

// ─── Analityka (PRO locked) ───────────────────────────────────────
function AnalitykaView() {
  const isMobile = useIsMobile()

  return (
    <div style={{ position: 'relative' }}>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111827', marginBottom: '1.5rem' }}>Analityka</h1>
      <div style={{ filter: 'blur(6px)', pointerEvents: 'none', userSelect: 'none' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {['Odwiedziny strony', 'Konwersja', 'Przychód YTD', 'Śr. długość pobytu'].map((l, i) => (
            <Card key={l}>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111827' }}>{['1 248', '3.4%', '12 400 €', '6.8 nocy'][i]}</div>
              <div style={{ fontSize: '0.76rem', color: '#9CA3AF' }}>{l}</div>
            </Card>
          ))}
        </div>
        <Card>
          <SectionTitle>Obłożenie miesięczne (%)</SectionTitle>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.4rem', height: 100 }}>
            {[40, 55, 60, 80, 95, 100, 98, 70, 45, 30, 35, 50].map((h, i) => (
              <div key={i} style={{ flex: 1, background: PRIMARY, height: `${h}%`, borderRadius: '3px 3px 0 0', opacity: 0.8 }} />
            ))}
          </div>
        </Card>
      </div>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: 'white', border: `1px solid ${CARD_BD}`, borderRadius: 16, padding: '1.75rem 2rem', textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', maxWidth: 340, width: '90%' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📊</div>
          <ProBadge />
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#111827', marginTop: '0.75rem', marginBottom: '0.5rem' }}>Analityka dostępna w planie PRO</h3>
          <p style={{ fontSize: '0.82rem', color: '#9CA3AF', marginBottom: '1.25rem' }}>
            Śledź obłożenie, przychody, źródła ruchu i konwersję. Raporty miesięczne i roczne.
          </p>
          <a href="https://www.nobooking.eu/#cennik" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', background: GOLD, color: 'white', border: 'none', borderRadius: 10, padding: '0.6rem 1.5rem', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none' }}>
            Przejdź na PRO →
          </a>
        </div>
      </div>
    </div>
  )
}

// ─── Ustawienia ───────────────────────────────────────────────────
function UstawieniaView({ settings, slug, onSaved }: { settings: SiteSettings | null; slug: string; onSaved: (s: Partial<SiteSettings>) => void }) {
  const isMobile = useIsMobile()
  const [email, setEmail]   = useState(settings?.owner_email ?? '')
  const [phone, setPhone]   = useState(settings?.contact_phone ?? '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const res = await fetch(`/api/sites/${slug}/owner/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ owner_email: email, contact_phone: phone }),
      })
      if (res.ok) {
        onSaved({ owner_email: email, contact_phone: phone })
        setSaved(true)
        setTimeout(() => setSaved(false), 3000)
      } else {
        alert('Nie udało się zapisać ustawień.')
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111827', marginBottom: '1.5rem' }}>Ustawienia</h1>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1.5rem' }}>
        <Card>
          <SectionTitle>Dane apartamentu</SectionTitle>
          <form onSubmit={handleSave}>
            {[
              { label: 'Nazwa apartamentu', value: settings?.name ?? slug, readOnly: true, type: 'text' },
              { label: 'Lokalizacja',        value: settings?.location ?? '', readOnly: true, type: 'text' },
            ].map(f => (
              <div key={f.label} style={{ marginBottom: '0.9rem' }}>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#9CA3AF', marginBottom: '0.3rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{f.label}</label>
                <input type={f.type} defaultValue={f.value} readOnly={f.readOnly} style={{ width: '100%', border: `1px solid ${CARD_BD}`, borderRadius: 8, padding: '0.45rem 0.7rem', fontSize: '0.83rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', background: f.readOnly ? '#F9FAFB' : 'white', color: f.readOnly ? '#9CA3AF' : '#111827' }} />
              </div>
            ))}
            <div style={{ marginBottom: '0.9rem' }}>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#9CA3AF', marginBottom: '0.3rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Email kontaktowy</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: '100%', border: `1px solid ${CARD_BD}`, borderRadius: 8, padding: '0.45rem 0.7rem', fontSize: '0.83rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: '0.9rem' }}>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#9CA3AF', marginBottom: '0.3rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Telefon</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} style={{ width: '100%', border: `1px solid ${CARD_BD}`, borderRadius: 8, padding: '0.45rem 0.7rem', fontSize: '0.83rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
            </div>
            <button type="submit" disabled={saving} style={{ background: PRIMARY, color: 'white', border: 'none', borderRadius: 8, padding: '0.5rem 1.25rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Zapisywanie…' : saved ? '✓ Zapisano!' : 'Zapisz zmiany'}
            </button>
          </form>
        </Card>

        <Card>
          <SectionTitle>Powiadomienia i integracje</SectionTitle>

          <div style={{ padding: '0.75rem 0', borderBottom: `1px solid #F3F4F6` }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827', marginBottom: '0.2rem' }}>📧 Powiadomienia email</div>
            <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Nowa rezerwacja, zmiana statusu — aktywne domyślnie.</div>
          </div>

          <div style={{ padding: '0.75rem 0', borderBottom: `1px solid #F3F4F6` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827' }}>📱 SMS do gości <ProBadge /></div>
                <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Potwierdzenie, kod dostępu, przypomnienie</div>
              </div>
            </div>
          </div>

          <div style={{ padding: '0.75rem 0', borderBottom: `1px solid #F3F4F6` }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827', marginBottom: '0.25rem' }}>🔐 Portal gościa</div>
            <div style={{ fontSize: '0.78rem', color: '#9CA3AF', marginBottom: '0.5rem' }}>Goście otrzymują indywidualny link z informacjami o pobycie, kodem Wi-Fi i przewodnikiem lokalu.</div>
          </div>

          <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 10, padding: '0.75rem', marginTop: '0.75rem' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#C2410C', marginBottom: '0.25rem' }}>Integracja z Stripe</div>
            <div style={{ fontSize: '0.75rem', color: '#374151', marginBottom: '0.5rem' }}>Połącz konto Stripe, aby przyjmować zaliczki i pełne płatności online bezpośrednio na Twój rachunek.</div>
            <a href="https://www.nobooking.eu" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', background: GOLD, color: 'white', border: 'none', borderRadius: 7, padding: '0.35rem 0.75rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'none' }}>
              Skonfiguruj Stripe
            </a>
          </div>

          <div style={{ marginTop: '1rem', borderTop: `1px solid #F3F4F6`, paddingTop: '1rem' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '0.3rem' }}>Plan: <span style={{ color: PRIMARY }}>{settings?.plan === 'pro' ? 'PRO' : 'Basic'}</span></div>
            <a href="https://www.nobooking.eu/#cennik" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.78rem', color: GOLD, fontWeight: 700 }}>
              {settings?.plan !== 'pro' ? 'Przejdź na PRO →' : 'Zarządzaj subskrypcją →'}
            </a>
          </div>
        </Card>
      </div>

      <Card style={{ marginTop: '1.5rem' }}>
        <SectionTitle>Hasło i bezpieczeństwo</SectionTitle>
        <p style={{ fontSize: '0.83rem', color: '#9CA3AF', margin: 0 }}>
          Aby zmienić hasło do panelu, skontaktuj się z <a href="mailto:hello@nobooking.eu" style={{ color: PRIMARY }}>hello@nobooking.eu</a>.
        </p>
      </Card>
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────
interface Props {
  slug:            string
  initialSiteName: string
  initialPlan:     'basic' | 'pro'
}

export function OwnerAdminApp({ slug, initialSiteName, initialPlan }: Props) {
  const isMobile = useIsMobile()

  const [tab,               setTabState]          = useState<Tab>('dashboard')
  const [sidebarCollapsed,  setSidebarCollapsed]   = useState(false)
  const [mobileMenuOpen,    setMobileMenuOpen]     = useState(false)
  const [selectedBookingId, setSelectedBookingId]  = useState<string | null>(null)

  const [bookings,  setBookings]  = useState<Booking[]>([])
  const [blocked,   setBlocked]   = useState<BlockedDate[]>([])
  const [reviews,   setReviews]   = useState<Review[]>([])
  const [settings,  setSettings]  = useState<SiteSettings | null>(null)
  const [stats,     setStats]     = useState<Stats | null>(null)
  const [loading,   setLoading]   = useState(true)

  useEffect(() => {
    async function load() {
      const [bRes, blRes, rRes, sRes, stRes] = await Promise.all([
        fetch(`/api/sites/${slug}/owner/bookings`),
        fetch(`/api/sites/${slug}/owner/blocked`),
        fetch(`/api/sites/${slug}/owner/reviews`),
        fetch(`/api/sites/${slug}/owner/settings`),
        fetch(`/api/sites/${slug}/owner/stats`),
      ])

      if (bRes.status === 401) {
        window.location.href = `/sites/${slug}/admin/login`
        return
      }

      const [bData, blData, rData, sData, stData] = await Promise.all([
        bRes.ok  ? bRes.json()  : [],
        blRes.ok ? blRes.json() : [],
        rRes.ok  ? rRes.json()  : [],
        sRes.ok  ? sRes.json()  : null,
        stRes.ok ? stRes.json() : null,
      ])

      setBookings(bData  as Booking[])
      setBlocked(blData  as BlockedDate[])
      setReviews(rData   as Review[])
      setSettings(sData  as SiteSettings | null)
      setStats(stData    as Stats | null)
      setLoading(false)
    }
    load()
  }, [slug])

  function setTab(t: Tab) {
    setTabState(t)
    setSelectedBookingId(null)
    setMobileMenuOpen(false)
  }

  function handleSelectBooking(id: string) {
    setSelectedBookingId(id)
    setTabState('bookings')
  }

  const handleStatusChange = useCallback((id: string, newStatus: BookingStatus) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: newStatus } : b))
  }, [])

  const handleReviewToggle = useCallback(async (reviewId: string) => {
    const review = reviews.find(r => r.id === reviewId)
    if (!review) return
    const newPublished = !review.published
    setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, published: newPublished } : r))
    const res = await fetch(`/api/sites/${slug}/owner/reviews/${reviewId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ published: newPublished }),
    })
    if (!res.ok) {
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, published: !newPublished } : r))
      alert('Nie udało się zmienić statusu opinii.')
    }
  }, [reviews, slug])

  const handleSettingsSaved = useCallback((updates: Partial<SiteSettings>) => {
    setSettings(prev => prev ? { ...prev, ...updates } : prev)
  }, [])

  const siteName = settings?.name ?? initialSiteName
  const plan     = settings?.plan ?? initialPlan
  const ownerEmail = settings?.owner_email ?? ''

  const showDetail = tab === 'bookings' && selectedBookingId !== null
  const selectedBooking = showDetail ? bookings.find(b => b.id === selectedBookingId) ?? null : null

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: PAGE_BG, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        <div style={{ textAlign: 'center', color: '#9CA3AF' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🏠</div>
          <div style={{ fontSize: '0.9rem' }}>Ładowanie panelu…</div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: PAGE_BG, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ display: 'flex', minHeight: '100vh' }}>

        {/* Sidebar — desktop */}
        {!isMobile && (
          <div style={{ position: 'sticky', top: 0, height: '100vh', flexShrink: 0 }}>
            <Sidebar
              activeTab={tab}
              setTab={setTab}
              collapsed={sidebarCollapsed}
              setCollapsed={setSidebarCollapsed}
              siteName={siteName}
              ownerEmail={ownerEmail}
              slug={slug}
            />
          </div>
        )}

        {/* Mobile drawer */}
        {isMobile && mobileMenuOpen && (
          <>
            <div onClick={() => setMobileMenuOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200 }} />
            <div style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: 240, zIndex: 201, overflowY: 'auto' }}>
              <Sidebar
                activeTab={tab}
                setTab={setTab}
                collapsed={false}
                setCollapsed={() => setMobileMenuOpen(false)}
                siteName={siteName}
                ownerEmail={ownerEmail}
                slug={slug}
              />
            </div>
          </>
        )}

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* Top bar */}
          <div style={{
            background: 'white', borderBottom: `1px solid ${CARD_BD}`,
            padding: '0 1rem', height: 52,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem',
            position: 'sticky', top: 0, zIndex: 50,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
              {isMobile && (
                <button onClick={() => setMobileMenuOpen(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: '#374151', padding: 0, flexShrink: 0 }}>☰</button>
              )}
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🏠 {siteName}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexShrink: 0 }}>
              <a href={`/sites/${slug}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.76rem', color: '#059669', fontWeight: 700, textDecoration: 'none', border: '1px solid #BBF7D0', background: '#F0FDF4', borderRadius: 8, padding: '0.28rem 0.6rem', whiteSpace: 'nowrap' }}>
                🌐 {isMobile ? 'Strona' : 'Moja strona ↗'}
              </a>
              {!isMobile && (
                <form action={`/api/sites/${slug}/owner/logout`} method="POST" style={{ display: 'inline' }}>
                  <button type="submit" style={{ background: 'none', border: `1px solid ${CARD_BD}`, borderRadius: 8, padding: '0.28rem 0.6rem', fontSize: '0.76rem', color: '#6B7280', cursor: 'pointer', fontFamily: 'inherit' }}>
                    Wyloguj
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* Content */}
          <div style={{ flex: 1, padding: isMobile ? '1rem' : '2rem', maxWidth: 1080, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
            {tab === 'dashboard'  && (
              <DashboardView
                bookings={bookings}
                stats={stats}
                setTab={setTab}
                setBookingId={handleSelectBooking}
              />
            )}
            {tab === 'bookings' && !showDetail && (
              <BookingListView bookings={bookings} onSelect={id => setSelectedBookingId(id)} />
            )}
            {tab === 'bookings' && showDetail && selectedBooking && (
              <BookingDetailView
                booking={selectedBooking}
                slug={slug}
                onBack={() => setSelectedBookingId(null)}
                onStatusChange={handleStatusChange}
              />
            )}
            {tab === 'guests'     && <GuestsView bookings={bookings} />}
            {tab === 'cennik'     && <CennikView settings={settings} slug={slug} plan={plan} setTab={setTab} />}
            {tab === 'kalendarz'  && (
              <KalendarzView
                slug={slug}
                bookings={bookings}
                blocked={blocked}
                setBlocked={fn => setBlocked(fn)}
              />
            )}
            {tab === 'opinie'     && <OpinieView reviews={reviews} slug={slug} onToggle={handleReviewToggle} />}
            {tab === 'analityka'  && <AnalitykaView />}
            {tab === 'ustawienia' && <UstawieniaView settings={settings} slug={slug} onSaved={handleSettingsSaved} />}
          </div>
        </div>
      </div>
    </div>
  )
}
