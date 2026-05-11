'use client'

import { useState, useEffect, useRef } from 'react'

// ─── Design tokens ────────────────────────────────────────────────
const PRIMARY  = '#1A5276'
const GOLD     = '#D97706'
const SIDEBAR  = '#111827'
const CARD_BG  = 'white'
const CARD_BD  = '#E5E7EB'
const PAGE_BG  = '#F3F4F6'

// ─── Types ────────────────────────────────────────────────────────
type BookingStatus = 'new' | 'confirmed' | 'awaiting_payment' | 'checked_in' | 'completed' | 'cancelled'
type Tab = 'dashboard' | 'bookings' | 'guests' | 'cennik' | 'opinie' | 'analityka' | 'ustawienia'

const STATUS_CFG: Record<BookingStatus, { label: string; bg: string; color: string }> = {
  new:              { label: 'Nowe zapytanie',      bg: '#EFF6FF', color: '#1D4ED8' },
  confirmed:        { label: 'Potwierdzona',         bg: '#F0FDF4', color: '#15803D' },
  awaiting_payment: { label: 'Czeka na płatność',    bg: '#FFF7ED', color: '#C2410C' },
  checked_in:       { label: 'Gość zameldowany',     bg: '#F5F3FF', color: '#6D28D9' },
  completed:        { label: 'Zakończona',            bg: '#F3F4F6', color: '#374151' },
  cancelled:        { label: 'Anulowana',             bg: '#FEF2F2', color: '#DC2626' },
}

// ─── Data ─────────────────────────────────────────────────────────
const BOOKINGS = [
  { id: 'b-1', status: 'new'              as BookingStatus, arrival: '2026-06-14', departure: '2026-06-21', nights: 7,  guests: 4, name: 'Katarzyna Malinowska',  email: 'k.malinowska@gmail.com',  phone: '+48 601 234 567',   country: '🇵🇱 Polska',     total: 2940, currency: 'zł', deposit: 0,    discount: '',      checkin_done: false, message: 'Czy możliwa jest dostawka dla dziecka?',   created_at: '2026-05-07T18:42:00Z' },
  { id: 'b-2', status: 'confirmed'        as BookingStatus, arrival: '2026-06-28', departure: '2026-07-05', nights: 7,  guests: 2, name: 'Thomas Müller',          email: 'thomas.m@gmail.de',       phone: '+49 151 9876543',    country: '🇩🇪 Niemcy',      total: 1155, currency: '€', deposit: 350,  discount: '',      checkin_done: false, message: '',                                          created_at: '2026-05-06T10:15:00Z' },
  { id: 'b-3', status: 'awaiting_payment' as BookingStatus, arrival: '2026-07-12', departure: '2026-07-19', nights: 7,  guests: 3, name: 'Joanna Wieczorek',       email: 'j.wieczorek@wp.pl',       phone: '+48 724 555 888',    country: '🇵🇱 Polska',     total: 2660, currency: 'zł', deposit: 0,    discount: 'PROMO10', checkin_done: false, message: 'Przyjeżdżamy z psem, czy to problem?',     created_at: '2026-05-06T14:30:00Z' },
  { id: 'b-4', status: 'checked_in'       as BookingStatus, arrival: '2026-05-03', departure: '2026-05-10', nights: 7,  guests: 2, name: 'Sophie Martin',          email: 'sophie.m@free.fr',        phone: '+33 6 12 34 56 78',  country: '🇫🇷 Francja',    total: 980,  currency: '€', deposit: 294,  discount: '',      checkin_done: true,  message: "Merci pour l'accueil chaleureux!",          created_at: '2026-04-28T09:00:00Z' },
  { id: 'b-5', status: 'completed'        as BookingStatus, arrival: '2026-04-19', departure: '2026-04-26', nights: 7,  guests: 4, name: 'Piotr i Anna Kamińscy',  email: 'p.kaminski@onet.pl',      phone: '+48 509 111 222',    country: '🇵🇱 Polska',     total: 2800, currency: 'zł', deposit: 840,  discount: '',      checkin_done: true,  message: '',                                          created_at: '2026-04-10T11:20:00Z' },
  { id: 'b-6', status: 'completed'        as BookingStatus, arrival: '2026-04-05', departure: '2026-04-12', nights: 7,  guests: 2, name: 'Carlos García',          email: 'c.garcia@gmail.es',       phone: '+34 612 345 678',    country: '🇪🇸 Hiszpania',  total: 910,  currency: '€', deposit: 273,  discount: '',      checkin_done: true,  message: 'Perfecto apartamento, volveremos!',          created_at: '2026-03-20T16:45:00Z' },
  { id: 'b-7', status: 'cancelled'        as BookingStatus, arrival: '2026-05-24', departure: '2026-05-31', nights: 7,  guests: 3, name: 'Marta Kowalczyk',        email: 'm.kowalczyk@gmail.com',   phone: '+48 789 000 123',    country: '🇵🇱 Polska',     total: 2380, currency: 'zł', deposit: 0,    discount: '',      checkin_done: false, message: 'Niestety zmiana planów, przepraszam.',       created_at: '2026-04-15T08:30:00Z' },
]

const DEMO_EMAILS: Record<string, Array<{ date: string; from: string; subject: string; body: string }>> = {
  'b-1': [
    { date: '2026-05-07 18:42', from: 'k.malinowska@gmail.com', subject: 'Zapytanie o rezerwację 14–21 czerwca', body: 'Dzień dobry, chciałabym zapytać o dostępność apartamentu w dniach 14–21 czerwca dla 4 osób. Czy możliwa jest dostawka dla dziecka 2-letniego? Pozdrawiam, Katarzyna' },
    { date: '2026-05-07 19:10', from: 'michal@casasol.eu', subject: 'Re: Zapytanie o rezerwację 14–21 czerwca', body: 'Dzień dobry Katarzyno, termin jest dostępny. Dostawka – oczywiście, bez dodatkowej opłaty. Łączna kwota: 2 940 zł (7 nocy × 420 zł + sprzątanie 60 €). Rezerwuję dla Pani?' },
  ],
  'b-2': [
    { date: '2026-05-06 10:15', from: 'thomas.m@gmail.de', subject: 'Booking request 28 Jun – 5 Jul', body: 'Hello, I would like to book the apartment from June 28 to July 5 for 2 adults. Please confirm availability. Best, Thomas' },
    { date: '2026-05-06 11:00', from: 'michal@casasol.eu', subject: 'Re: Booking request 28 Jun – 5 Jul', body: 'Dear Thomas, the apartment is available. Total: €1155 (7 nights × €150 + €105 cleaning). I sent you a payment link for a 30% deposit. Kind regards, Michał' },
    { date: '2026-05-06 14:22', from: 'noreply@stripe.com', subject: '✅ Płatność €350 otrzymana', body: 'Płatność zaliczkowa €350 od Thomas Müller została zaksięgowana. Rezerwacja b-2 potwierdzona.' },
  ],
  'b-4': [
    { date: '2026-04-28 09:00', from: 'sophie.m@free.fr', subject: 'Réservation du 3 au 10 mai', body: 'Bonjour, je souhaite réserver du 3 au 10 mai pour 2 personnes. Merci!' },
    { date: '2026-04-28 10:30', from: 'michal@casasol.eu', subject: 'Re: Réservation du 3 au 10 mai', body: 'Bonjour Sophie! Disponible. Total €980 (7 nuits × €130 + €70). Lien de paiement ci-joint. À bientôt!' },
    { date: '2026-05-02 20:15', from: 'noreply@nobooking.eu', subject: '📋 Sophie Martin wypełniła formularz online check-in', body: 'Gość Sophie Martin wypełniła formularz online check-in. Dane: paszport FR1234567, przylot godz. 15:30, lot FR2891. Kod dostępu wysłany SMS-em.' },
  ],
  'b-5': [
    { date: '2026-04-26 16:00', from: 'noreply@nobooking.eu', subject: '⭐ Nowa opinia od Piotr i Anna Kamińscy', body: 'Gość wystawił opinię 5/5: „Trzeci raz w tym apartamencie i jak zawsze – perfekcyjnie. Polecamy serdecznie!"' },
  ],
}

const DEMO_CHAT: Record<string, Array<{ side: 'host' | 'guest'; text: string; time: string }>> = {
  'b-1': [
    { side: 'guest', text: 'Dzień dobry, czy mogę zapytać o dostawkę dla dziecka?', time: '18:42' },
    { side: 'host', text: 'Oczywiście! Mamy łóżeczko turystyczne, bez dodatkowej opłaty 😊', time: '19:08' },
    { side: 'guest', text: 'Super, dziękuję bardzo! Czyli rezerwujemy?', time: '19:15' },
    { side: 'host', text: 'Tak, wyślę link do płatności zaliczki na Pani maila.', time: '19:18' },
  ],
  'b-4': [
    { side: 'guest', text: 'Bonjour! Nous arrivons à 15h30, est-ce possible?', time: '09:10' },
    { side: 'host', text: 'Bonjour Sophie! Bien sûr, le logement sera prêt. Bon voyage! 🌞', time: '09:25' },
    { side: 'guest', text: 'Merci beaucoup! À tout à l\'heure.', time: '09:27' },
  ],
  'b-3': [
    { side: 'guest', text: 'Witam, mamy 10-kg jamnika. Czy to nie jest problem?', time: '14:30' },
    { side: 'host', text: 'Nie ma żadnego problemu! Zwierzęta mile widziane 🐾', time: '14:45' },
    { side: 'guest', text: 'Świetnie! Kiedy mogę zapłacić zaliczkę?', time: '14:50' },
    { side: 'host', text: 'Wyślę link Stripe w ciągu godziny.', time: '15:02' },
  ],
}

const DEMO_CHECKIN: Record<string, { passport: string; arrival_time: string; flight: string; people: string; notes: string }> = {
  'b-4': { passport: 'FR1234567', arrival_time: '15:30', flight: 'FR2891', people: '2 dorosłych', notes: 'Alergiczna na koty – brak problemu' },
  'b-5': { passport: 'PL9876543', arrival_time: '12:00', flight: 'lot własny (samochód)', people: '2 dorosłych + 2 dzieci 8 i 11 lat', notes: 'Prośba o fotelik rowerowy' },
}

const REVIEWS = [
  { id: 'r-1', booking_id: 'b-5', author: 'Piotr i Anna Kamińscy', score: 5, date: '2026-04-27', text: 'Trzeci raz w tym apartamencie i jak zawsze – perfekcyjnie. Polecamy serdecznie!', published: true },
  { id: 'r-2', booking_id: 'b-6', author: 'Carlos García', score: 5, date: '2026-04-13', text: 'Perfecto apartamento, la ubicación es inmejorable y el anfitrión muy atento.', published: true },
  { id: 'r-3', booking_id: 'b-4', author: 'Sophie Martin', score: 5, date: '2026-05-11', text: 'Appartement magnifique avec une terrasse splendide. Nous reviendrons!', published: false },
]

const SEASONS = [
  { name: 'Wysoki sezon',  months: 'lip – wrz', pricePerNight: 150, minNights: 7,  currency: '€' },
  { name: 'Średni sezon',  months: 'maj – cze', pricePerNight: 110, minNights: 5,  currency: '€' },
  { name: 'Niski sezon',   months: 'paź – kwi', pricePerNight: 80,  minNights: 3,  currency: '€' },
]

// ─── Small components ─────────────────────────────────────────────
function StatusBadge({ status }: { status: BookingStatus }) {
  const { label, bg, color } = STATUS_CFG[status]
  return (
    <span style={{ fontSize: '0.73rem', fontWeight: 700, padding: '0.22rem 0.6rem', borderRadius: '20px', whiteSpace: 'nowrap', background: bg, color }}>
      {label}
    </span>
  )
}

function ProBadge() {
  return (
    <span style={{ fontSize: '0.62rem', fontWeight: 800, padding: '0.1rem 0.45rem', borderRadius: '20px', background: GOLD, color: 'white', letterSpacing: '0.04em', marginLeft: '0.4rem' }}>
      PRO
    </span>
  )
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: CARD_BG, border: `1px solid ${CARD_BD}`, borderRadius: 14, padding: '1.25rem 1.5rem', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', ...style }}>
      {children}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 style={{ fontSize: '1rem', fontWeight: 800, color: '#111827', marginBottom: '1rem' }}>{children}</h2>
}

function demoAlert(msg = 'To jest wersja demo — w prawdziwym panelu ta akcja działa!') {
  alert(`🔒 Demo\n\n${msg}`)
}

// ─── Sidebar ──────────────────────────────────────────────────────
const NAV_ITEMS: Array<{ id: Tab; icon: string; label: string; pro?: boolean }> = [
  { id: 'dashboard',   icon: '🏠', label: 'Dashboard' },
  { id: 'bookings',    icon: '📅', label: 'Rezerwacje' },
  { id: 'guests',      icon: '👥', label: 'Goście' },
  { id: 'cennik',      icon: '💰', label: 'Cennik' },
  { id: 'opinie',      icon: '⭐', label: 'Opinie' },
  { id: 'analityka',   icon: '📊', label: 'Analityka', pro: true },
  { id: 'ustawienia',  icon: '⚙️', label: 'Ustawienia' },
]

function Sidebar({ activeTab, setTab, collapsed, setCollapsed }: {
  activeTab: Tab
  setTab: (t: Tab) => void
  collapsed: boolean
  setCollapsed: (v: boolean) => void
}) {
  return (
    <div style={{
      width: collapsed ? 60 : 230,
      minHeight: '100vh',
      background: SIDEBAR,
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      transition: 'width 0.2s',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{ padding: collapsed ? '1rem 0' : '1.25rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'space-between', borderBottom: '1px solid #1F2937' }}>
        {!collapsed && (
          <div>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: 'white', letterSpacing: '-0.01em' }}>Casa Sol</div>
            <div style={{ fontSize: '0.65rem', color: '#6B7280', marginTop: 1 }}>Torrevieja</div>
          </div>
        )}
        <button onClick={() => setCollapsed(!collapsed)} style={{ background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: '1.1rem', padding: '0.25rem', lineHeight: 1 }}>
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {/* Nav */}
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

      {/* Footer */}
      {!collapsed && (
        <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #1F2937' }}>
          <div style={{ fontSize: '0.7rem', color: '#4B5563', marginBottom: '0.3rem' }}>michal@casasol.eu</div>
          <div style={{ fontSize: '0.65rem', color: '#374151' }}>Powered by <span style={{ color: GOLD, fontWeight: 700 }}>Nobooking</span></div>
        </div>
      )}
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────
function DashboardView({ setTab, setBookingId }: { setTab: (t: Tab) => void; setBookingId: (id: string) => void }) {
  const stats = [
    { icon: '📅', label: 'Rezerwacje w maju',    value: '5' },
    { icon: '💰', label: 'Przychód (maj)',         value: '8 645 zł' },
    { icon: '📊', label: 'Obłożenie (czerwiec)',   value: '68%' },
    { icon: '⭐', label: 'Średnia ocena',          value: '4.9 / 5' },
  ]
  const upcoming = BOOKINGS.filter(b => b.status === 'confirmed' || b.status === 'awaiting_payment' || b.status === 'checked_in')

  return (
    <div>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111827', marginBottom: '1.5rem' }}>Dashboard</h1>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        {stats.map(s => (
          <Card key={s.label}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>{s.icon}</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', letterSpacing: '-0.03em' }}>{s.value}</div>
            <div style={{ fontSize: '0.76rem', color: '#9CA3AF', marginTop: '0.2rem' }}>{s.label}</div>
          </Card>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Upcoming */}
        <Card>
          <SectionTitle>Nadchodzące pobyty</SectionTitle>
          {upcoming.length === 0 && <p style={{ color: '#9CA3AF', fontSize: '0.85rem' }}>Brak nadchodzących pobytów.</p>}
          {upcoming.map(b => (
            <div key={b.id} onClick={() => { setBookingId(b.id); setTab('bookings') }} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderBottom: '1px solid #F3F4F6', cursor: 'pointer' }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827' }}>{b.name}</div>
                <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{b.arrival} → {b.departure}</div>
              </div>
              <StatusBadge status={b.status} />
            </div>
          ))}
        </Card>

        {/* Quick actions */}
        <Card>
          <SectionTitle>Szybkie akcje</SectionTitle>
          {[
            { icon: '📤', label: 'Wyślij kod dostępu SMS', pro: false },
            { icon: '📋', label: 'Online check-in gościa',  pro: false },
            { icon: '💌', label: 'Email z przypomnieniem',  pro: false },
            { icon: '📈', label: 'Raport miesięczny',       pro: true  },
          ].map(a => (
            <button key={a.label} onClick={() => demoAlert()} style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '0.7rem',
              background: '#F9FAFB', border: `1px solid ${CARD_BD}`, borderRadius: 10,
              padding: '0.65rem 0.9rem', marginBottom: '0.5rem', cursor: 'pointer',
              fontFamily: 'inherit', textAlign: 'left',
            }}>
              <span style={{ fontSize: '1.1rem' }}>{a.icon}</span>
              <span style={{ fontSize: '0.84rem', fontWeight: 600, color: '#374151', flex: 1 }}>{a.label}</span>
              {a.pro && <ProBadge />}
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
  { value: 'all',              label: 'Wszystkie' },
  { value: 'new',              label: 'Nowe' },
  { value: 'confirmed',        label: 'Potwierdzone' },
  { value: 'awaiting_payment', label: 'Czeka na płatność' },
  { value: 'checked_in',       label: 'Zameldowani' },
  { value: 'completed',        label: 'Zakończone' },
  { value: 'cancelled',        label: 'Anulowane' },
]

function BookingListView({ onSelect }: { onSelect: (id: string) => void }) {
  const [filter, setFilter] = useState<FilterVal>('all')
  const [search, setSearch] = useState('')

  const list = BOOKINGS.filter(b => {
    if (filter !== 'all' && b.status !== filter) return false
    if (search && !b.name.toLowerCase().includes(search.toLowerCase()) && !b.email.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111827' }}>Rezerwacje i zapytania</h1>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Szukaj gościa, email…" style={{
          border: `1px solid ${CARD_BD}`, borderRadius: 10, padding: '0.45rem 0.9rem',
          fontSize: '0.84rem', fontFamily: 'inherit', outline: 'none', width: 230,
        }} />
      </div>

      {/* Filter pills */}
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
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${CARD_BD}`, background: '#F9FAFB' }}>
                {['Gość', 'Termin', 'Noce', 'Kwota', 'Zaliczka', 'Check-in', 'Status', ''].map(h => (
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
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827' }}>{b.name}</div>
                    <div style={{ fontSize: '0.73rem', color: '#9CA3AF' }}>{b.country}</div>
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontSize: '0.83rem', color: '#374151', whiteSpace: 'nowrap' }}>
                    {new Date(b.arrival).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}
                    {' → '}
                    {new Date(b.departure).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short' })}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontSize: '0.83rem', color: '#374151', textAlign: 'center' }}>
                    {b.nights}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontSize: '0.88rem', fontWeight: 700, color: '#111827', whiteSpace: 'nowrap' }}>
                    {b.total} {b.currency}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontSize: '0.83rem', color: b.deposit > 0 ? '#15803D' : '#9CA3AF' }}>
                    {b.deposit > 0 ? `${b.deposit} ${b.currency} ✓` : '—'}
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontSize: '0.83rem', textAlign: 'center' }}>
                    {b.checkin_done ? '✅' : '—'}
                  </td>
                  <td style={{ padding: '0.85rem 1rem' }}>
                    <StatusBadge status={b.status} />
                  </td>
                  <td style={{ padding: '0.85rem 1rem', fontSize: '0.8rem', color: '#9CA3AF' }}>
                    {b.message ? '💬' : ''}
                    {b.discount ? ' 🏷️' : ''}
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr><td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: '#9CA3AF', fontSize: '0.85rem' }}>Brak rezerwacji spełniających kryteria.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// ─── Booking detail ───────────────────────────────────────────────
function BookingDetailView({ bookingId, onBack }: { bookingId: string; onBack: () => void }) {
  const b = BOOKINGS.find(x => x.id === bookingId)!
  const emails = DEMO_EMAILS[bookingId] ?? []
  const chat = DEMO_CHAT[bookingId] ?? []
  const checkin = DEMO_CHECKIN[bookingId]
  const [chatMsg, setChatMsg] = useState('')
  const [messages, setMessages] = useState(chat)
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null)

  function sendMsg() {
    if (!chatMsg.trim()) return
    setMessages(prev => [...prev, { side: 'host', text: chatMsg, time: new Date().toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' }) }])
    setChatMsg('')
  }

  return (
    <div>
      {/* Back + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button onClick={onBack} style={{ background: 'none', border: `1px solid ${CARD_BD}`, borderRadius: 8, padding: '0.35rem 0.75rem', cursor: 'pointer', fontSize: '0.82rem', color: '#374151', fontFamily: 'inherit' }}>
          ← Wróć
        </button>
        <div>
          <h1 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#111827' }}>{b.name}</h1>
          <div style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>Rezerwacja {b.id} · dodana {new Date(b.created_at).toLocaleDateString('pl-PL')}</div>
        </div>
        <div style={{ marginLeft: 'auto' }}><StatusBadge status={b.status} /></div>
      </div>

      {/* Top 3 cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Booking details */}
        <Card>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Szczegóły rezerwacji</div>
          {[
            ['Przyjazd', b.arrival],
            ['Wyjazd', b.departure],
            ['Noce', `${b.nights}`],
            ['Goście', `${b.guests}`],
            ['Kwota', `${b.total} ${b.currency}`],
            ['Zaliczka', b.deposit > 0 ? `${b.deposit} ${b.currency} ✓` : 'Brak'],
            ['Kod rabatowy', b.discount || '—'],
          ].map(([label, val]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.83rem', marginBottom: '0.4rem' }}>
              <span style={{ color: '#9CA3AF' }}>{label}</span>
              <span style={{ fontWeight: 600, color: '#111827' }}>{val}</span>
            </div>
          ))}
        </Card>

        {/* Guest data */}
        <Card>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Dane gościa</div>
          {[
            ['Imię i nazwisko', b.name],
            ['Email', b.email],
            ['Telefon', b.phone ?? '—'],
            ['Kraj', b.country],
          ].map(([label, val]) => (
            <div key={label} style={{ marginBottom: '0.6rem' }}>
              <div style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>{label}</div>
              <div style={{ fontSize: '0.84rem', fontWeight: 600, color: '#111827', wordBreak: 'break-all' }}>{val}</div>
            </div>
          ))}
          <button onClick={() => demoAlert('SMS zostałby wysłany do gościa.')} style={{ marginTop: '0.5rem', width: '100%', background: PRIMARY, color: 'white', border: 'none', borderRadius: 8, padding: '0.5rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            📱 Wyślij SMS
          </button>
        </Card>

        {/* Management */}
        <Card>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Zarządzanie</div>
          <div style={{ marginBottom: '0.5rem' }}>
            <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginBottom: '0.3rem' }}>Status</div>
            <select style={{ width: '100%', border: `1px solid ${CARD_BD}`, borderRadius: 8, padding: '0.4rem 0.5rem', fontSize: '0.83rem', fontFamily: 'inherit', color: '#374151' }} defaultValue={b.status} onChange={() => demoAlert()}>
              {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          {[
            { label: '✉️ Wyślij wiadomość email', fn: () => demoAlert('Email do gościa zostałby wysłany.') },
            { label: '💳 Link do płatności Stripe', fn: () => demoAlert('Link Stripe zostałby wygenerowany i wysłany.') },
            { label: '✅ Potwierdź rezerwację',     fn: () => demoAlert('Rezerwacja zostałaby potwierdzona.') },
            { label: '❌ Anuluj rezerwację',        fn: () => demoAlert('Rezerwacja zostałaby anulowana.') },
          ].map(a => (
            <button key={a.label} onClick={a.fn} style={{ width: '100%', display: 'block', background: '#F9FAFB', border: `1px solid ${CARD_BD}`, borderRadius: 8, padding: '0.45rem 0.75rem', marginBottom: '0.4rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', color: '#374151' }}>
              {a.label}
            </button>
          ))}
        </Card>
      </div>

      {/* Online check-in */}
      {checkin ? (
        <Card style={{ marginBottom: '1.5rem', borderLeft: `4px solid #15803D` }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#15803D', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>✅ Online Check-in wypełniony</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.5rem' }}>
            {[
              ['Paszport/PESEL', checkin.passport],
              ['Godzina przyjazdu', checkin.arrival_time],
              ['Lot/transport', checkin.flight],
              ['Liczba osób', checkin.people],
              ['Uwagi', checkin.notes],
            ].map(([l, v]) => (
              <div key={l}>
                <div style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>{l}</div>
                <div style={{ fontSize: '0.83rem', fontWeight: 600, color: '#111827' }}>{v}</div>
              </div>
            ))}
          </div>
        </Card>
      ) : (
        <Card style={{ marginBottom: '1.5rem', borderLeft: `4px solid #E5E7EB` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#374151' }}>📋 Online Check-in</div>
              <div style={{ fontSize: '0.78rem', color: '#9CA3AF', marginTop: '0.15rem' }}>Gość jeszcze nie wypełnił formularza przed przyjazdem.</div>
            </div>
            <button onClick={() => demoAlert('Link do formularza check-in zostałby wysłany.')} style={{ background: PRIMARY, color: 'white', border: 'none', borderRadius: 8, padding: '0.45rem 0.9rem', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Wyślij link
            </button>
          </div>
        </Card>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Chat */}
        <Card>
          <SectionTitle>💬 Wiadomości</SectionTitle>
          <div style={{ height: 280, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '0.75rem', paddingRight: '0.25rem' }}>
            {messages.length === 0 && <p style={{ color: '#9CA3AF', fontSize: '0.82rem' }}>Brak wiadomości.</p>}
            {messages.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.side === 'host' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '78%', padding: '0.5rem 0.75rem', borderRadius: m.side === 'host' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  background: m.side === 'host' ? PRIMARY : '#F3F4F6',
                  color: m.side === 'host' ? 'white' : '#111827',
                  fontSize: '0.82rem',
                }}>
                  <div>{m.text}</div>
                  <div style={{ fontSize: '0.67rem', opacity: 0.6, marginTop: '0.15rem', textAlign: 'right' }}>{m.time}</div>
                </div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input value={chatMsg} onChange={e => setChatMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMsg()}
              placeholder="Napisz wiadomość…"
              style={{ flex: 1, border: `1px solid ${CARD_BD}`, borderRadius: 8, padding: '0.45rem 0.7rem', fontSize: '0.83rem', fontFamily: 'inherit', outline: 'none' }}
            />
            <button onClick={sendMsg} style={{ background: PRIMARY, color: 'white', border: 'none', borderRadius: 8, padding: '0.45rem 0.9rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Wyślij
            </button>
          </div>
        </Card>

        {/* Email log */}
        <Card>
          <SectionTitle>📧 Historia emaili</SectionTitle>
          {emails.length === 0 && <p style={{ color: '#9CA3AF', fontSize: '0.82rem' }}>Brak emaili.</p>}
          {emails.map((em, i) => (
            <div key={i} style={{ borderBottom: i < emails.length - 1 ? `1px solid #F3F4F6` : 'none', paddingBottom: '0.6rem', marginBottom: '0.6rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#111827' }}>{em.subject}</div>
                  <div style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>{em.from} · {em.date}</div>
                </div>
                <button onClick={() => setExpandedEmail(expandedEmail === `${i}` ? null : `${i}`)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: PRIMARY, fontFamily: 'inherit', whiteSpace: 'nowrap', padding: 0 }}>
                  {expandedEmail === `${i}` ? 'Zwiń ▲' : 'Rozwiń ▼'}
                </button>
              </div>
              {expandedEmail === `${i}` && (
                <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#374151', background: '#F9FAFB', borderRadius: 8, padding: '0.6rem 0.75rem', lineHeight: 1.5 }}>
                  {em.body}
                </div>
              )}
            </div>
          ))}
        </Card>
      </div>
    </div>
  )
}

// ─── Guests ───────────────────────────────────────────────────────
function GuestsView() {
  return (
    <div>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111827', marginBottom: '1.5rem' }}>Goście</h1>
      <Card style={{ padding: 0 }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${CARD_BD}`, background: '#F9FAFB' }}>
                {['Gość', 'Email', 'Telefon', 'Kraj', 'Rezerwacji', 'Ostatni pobyt'].map(h => (
                  <th key={h} style={{ padding: '0.7rem 1rem', textAlign: 'left', fontSize: '0.72rem', fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {BOOKINGS.map((b, i) => (
                <tr key={b.id}
                  style={{ borderBottom: i < BOOKINGS.length - 1 ? `1px solid #F3F4F6` : 'none' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#F9FAFB' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'white' }}
                >
                  <td style={{ padding: '0.85rem 1rem', fontSize: '0.85rem', fontWeight: 600, color: '#111827' }}>{b.name}</td>
                  <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', color: '#374151' }}>{b.email}</td>
                  <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', color: '#374151' }}>{b.phone ?? '—'}</td>
                  <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', color: '#374151' }}>{b.country}</td>
                  <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', color: '#374151', textAlign: 'center' }}>1</td>
                  <td style={{ padding: '0.85rem 1rem', fontSize: '0.82rem', color: '#374151' }}>{b.departure}</td>
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
function CennikView() {
  const [blockedDates, setBlockedDates] = useState('')
  const [discountCode, setDiscountCode] = useState('')
  const [discountPct, setDiscountPct]   = useState('10')

  return (
    <div>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111827', marginBottom: '1.5rem' }}>Cennik i dostępność</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        {/* Seasons */}
        <Card>
          <SectionTitle>Sezony cenowe</SectionTitle>
          {SEASONS.map(s => (
            <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderBottom: `1px solid #F3F4F6` }}>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827' }}>{s.name}</div>
                <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{s.months} · min. {s.minNights} noce</div>
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 800, color: PRIMARY }}>{s.pricePerNight} {s.currency}<span style={{ fontSize: '0.72rem', fontWeight: 400, color: '#9CA3AF' }}>/noc</span></div>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.6rem' }}>
            <div style={{ fontSize: '0.85rem', color: '#374151' }}>Sprzątanie końcowe</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#374151' }}>60 €</div>
          </div>
          <button onClick={() => demoAlert('Zmiany cen zostałyby zapisane.')} style={{ marginTop: '0.75rem', width: '100%', background: PRIMARY, color: 'white', border: 'none', borderRadius: 8, padding: '0.5rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Edytuj sezony
          </button>
        </Card>

        {/* Blocked dates */}
        <Card>
          <SectionTitle>Zablokowane daty</SectionTitle>
          <p style={{ fontSize: '0.82rem', color: '#9CA3AF', marginBottom: '0.75rem' }}>Podaj daty (RRRR-MM-DD), kiedy apartament jest niedostępny (np. własne pobyty).</p>
          <textarea value={blockedDates} onChange={e => setBlockedDates(e.target.value)}
            placeholder={'2026-08-01\n2026-08-02\n2026-08-03'}
            rows={5}
            style={{ width: '100%', border: `1px solid ${CARD_BD}`, borderRadius: 8, padding: '0.5rem 0.7rem', fontSize: '0.82rem', fontFamily: 'inherit', resize: 'vertical', outline: 'none', boxSizing: 'border-box' }}
          />
          <button onClick={() => demoAlert('Zablokowane daty zostałyby zapisane.')} style={{ marginTop: '0.5rem', width: '100%', background: '#374151', color: 'white', border: 'none', borderRadius: 8, padding: '0.5rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Zapisz blokadę
          </button>
        </Card>
      </div>

      {/* Discount codes — PRO */}
      <Card style={{ position: 'relative', overflow: 'hidden' }}>
        <div style={{ filter: 'blur(3px)', pointerEvents: 'none' }}>
          <SectionTitle>Kody rabatowe</SectionTitle>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
            <input value={discountCode} onChange={e => setDiscountCode(e.target.value)} placeholder="Kod (np. LATO10)" style={{ border: `1px solid ${CARD_BD}`, borderRadius: 8, padding: '0.45rem 0.7rem', fontSize: '0.83rem', fontFamily: 'inherit', outline: 'none', width: 160 }} />
            <input value={discountPct} onChange={e => setDiscountPct(e.target.value)} placeholder="%" style={{ border: `1px solid ${CARD_BD}`, borderRadius: 8, padding: '0.45rem 0.7rem', fontSize: '0.83rem', fontFamily: 'inherit', outline: 'none', width: 80 }} />
            <button style={{ background: PRIMARY, color: 'white', border: 'none', borderRadius: 8, padding: '0.45rem 1rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Dodaj kod</button>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {['LATO10 (-10%)', 'VIP20 (-20%)', 'POWROT15 (-15%)'].map(c => (
              <span key={c} style={{ background: '#FEF3C7', color: GOLD, fontSize: '0.78rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: 20 }}>{c}</span>
            ))}
          </div>
        </div>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(2px)' }}>
          <ProBadge />
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#111827', marginTop: '0.5rem' }}>Kody rabatowe dostępne w planie PRO</div>
          <button onClick={() => demoAlert('Przekierowanie do strony nobooking.eu/cennik')} style={{ marginTop: '0.75rem', background: GOLD, color: 'white', border: 'none', borderRadius: 8, padding: '0.5rem 1.25rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Przejdź na PRO →
          </button>
        </div>
      </Card>
    </div>
  )
}

// ─── Opinie ───────────────────────────────────────────────────────
function OpinieView() {
  const [reviews, setReviews] = useState(REVIEWS)

  function toggle(id: string) {
    setReviews(prev => prev.map(r => r.id === id ? { ...r, published: !r.published } : r))
  }

  return (
    <div>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111827', marginBottom: '0.5rem' }}>Opinie gości</h1>
      <p style={{ fontSize: '0.83rem', color: '#9CA3AF', marginBottom: '1.5rem' }}>Po wyjeździe gość otrzymuje automatyczny email z prośbą o opinię. Możesz publikować lub ukrywać opinie na swojej stronie.</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {reviews.map(r => (
          <Card key={r.id} style={{ borderLeft: r.published ? `4px solid #15803D` : `4px solid #E5E7EB` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '0.3rem', marginBottom: '0.4rem' }}>
                  {'★★★★★'.split('').slice(0, r.score).map((s, i) => <span key={i} style={{ color: GOLD, fontSize: '0.9rem' }}>★</span>)}
                </div>
                <p style={{ fontSize: '0.85rem', color: '#374151', margin: 0, marginBottom: '0.5rem', fontStyle: 'italic' }}>„{r.text}"</p>
                <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{r.author} · {r.date}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flexShrink: 0 }}>
                <button onClick={() => toggle(r.id)} style={{
                  padding: '0.35rem 0.8rem', borderRadius: 8, border: 'none', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  background: r.published ? '#FEF2F2' : '#F0FDF4', color: r.published ? '#DC2626' : '#15803D',
                }}>
                  {r.published ? '🙈 Ukryj' : '👁 Publikuj'}
                </button>
              </div>
            </div>
            <div style={{ marginTop: '0.5rem' }}>
              <span style={{ fontSize: '0.73rem', fontWeight: 700, padding: '0.18rem 0.5rem', borderRadius: 20, background: r.published ? '#F0FDF4' : '#F3F4F6', color: r.published ? '#15803D' : '#9CA3AF' }}>
                {r.published ? '✓ Opublikowana na stronie' : 'Ukryta'}
              </span>
            </div>
          </Card>
        ))}
      </div>

      {/* Info banner */}
      <Card style={{ marginTop: '1.5rem', background: '#EFF6FF', border: `1px solid #BFDBFE` }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, color: PRIMARY, marginBottom: '0.3rem' }}>ℹ️ System automatycznych opinii Nobooking</div>
        <p style={{ fontSize: '0.82rem', color: '#374151', margin: 0 }}>
          Po zakończeniu każdego pobytu Nobooking wysyła gościowi automatyczny email z prośbą o opinię. Opinie trafiają tutaj i możesz je moderować przed wyświetleniem na stronie.
        </p>
      </Card>
    </div>
  )
}

// ─── Analityka (PRO locked) ────────────────────────────────────────
function AnalitykaView() {
  return (
    <div style={{ position: 'relative' }}>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111827', marginBottom: '1.5rem' }}>Analityka</h1>

      {/* Blurred preview */}
      <div style={{ filter: 'blur(6px)', pointerEvents: 'none', userSelect: 'none' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {['Odwiedziny strony', 'Konwersja', 'Przychód YTD', 'Śr. długość pobytu'].map((l, i) => (
            <Card key={l}>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827' }}>{['1 248', '3.4%', '12 400 €', '6.8 nocy'][i]}</div>
              <div style={{ fontSize: '0.76rem', color: '#9CA3AF' }}>{l}</div>
            </Card>
          ))}
        </div>
        <Card>
          <SectionTitle>Obłożenie miesięczne (%)</SectionTitle>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: 120 }}>
            {[40, 55, 60, 80, 95, 100, 98, 70, 45, 30, 35, 50].map((h, i) => (
              <div key={i} style={{ flex: 1, background: PRIMARY, height: `${h}%`, borderRadius: '4px 4px 0 0', opacity: 0.8 }} />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.3rem' }}>
            {['S', 'L', 'M', 'K', 'M', 'C', 'L', 'S', 'W', 'P', 'G', 'G'].map((m, i) => (
              <div key={i} style={{ flex: 1, textAlign: 'center', fontSize: '0.65rem', color: '#9CA3AF' }}>{m}</div>
            ))}
          </div>
        </Card>
      </div>

      {/* Overlay */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: 'white', border: `1px solid ${CARD_BD}`, borderRadius: 16, padding: '2rem 2.5rem', textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.12)', maxWidth: 360 }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📊</div>
          <ProBadge />
          <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#111827', marginTop: '0.75rem', marginBottom: '0.5rem' }}>Analityka dostępna w planie PRO</h3>
          <p style={{ fontSize: '0.82rem', color: '#9CA3AF', marginBottom: '1.25rem' }}>
            Śledź obłożenie, przychody, źródła ruchu i konwersję. Raporty miesięczne i roczne.
          </p>
          <button onClick={() => demoAlert('Przekierowanie do nobooking.eu/cennik')} style={{ background: GOLD, color: 'white', border: 'none', borderRadius: 10, padding: '0.6rem 1.5rem', fontSize: '0.85rem', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
            Przejdź na PRO →
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Ustawienia ───────────────────────────────────────────────────
function UstawieniaView() {
  const [smsEnabled, setSmsEnabled]    = useState(true)
  const [emailEnabled, setEmailEnabled] = useState(true)

  return (
    <div>
      <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111827', marginBottom: '1.5rem' }}>Ustawienia</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
        {/* Apartment settings */}
        <Card>
          <SectionTitle>Dane apartamentu</SectionTitle>
          {[
            { label: 'Nazwa apartamentu', value: 'Casa Sol Torrevieja', type: 'text' },
            { label: 'Adres', value: 'Calle del Mar 15, 03181 Torrevieja', type: 'text' },
            { label: 'Email kontaktowy', value: 'michal@casasol.eu', type: 'email' },
            { label: 'Telefon', value: '+48 600 123 456', type: 'tel' },
          ].map(f => (
            <div key={f.label} style={{ marginBottom: '0.9rem' }}>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#9CA3AF', marginBottom: '0.3rem', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{f.label}</label>
              <input type={f.type} defaultValue={f.value} style={{ width: '100%', border: `1px solid ${CARD_BD}`, borderRadius: 8, padding: '0.45rem 0.7rem', fontSize: '0.83rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box' }} />
            </div>
          ))}
          <button onClick={() => demoAlert('Dane zostałyby zapisane.')} style={{ background: PRIMARY, color: 'white', border: 'none', borderRadius: 8, padding: '0.5rem 1.25rem', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
            Zapisz zmiany
          </button>
        </Card>

        {/* Notifications */}
        <Card>
          <SectionTitle>Powiadomienia</SectionTitle>

          {/* Email toggle */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: `1px solid #F3F4F6` }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827' }}>📧 Powiadomienia email</div>
              <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Nowa rezerwacja, płatność, check-in</div>
            </div>
            <button onClick={() => setEmailEnabled(v => !v)} style={{
              width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', padding: 0,
              background: emailEnabled ? '#15803D' : '#D1D5DB', position: 'relative', transition: 'background 0.2s',
            }}>
              <div style={{ width: 18, height: 18, background: 'white', borderRadius: '50%', position: 'absolute', top: 3, left: emailEnabled ? 23 : 3, transition: 'left 0.2s' }} />
            </button>
          </div>

          {/* SMS toggle — PRO */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 0', borderBottom: `1px solid #F3F4F6`, position: 'relative' }}>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#111827' }}>📱 SMS do gości <ProBadge /></div>
              <div style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Potwierdzenie, kod dostępu, przypomnienie</div>
            </div>
            <button onClick={() => demoAlert('Powiadomienia SMS dostępne w planie PRO.')} style={{
              width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer', padding: 0,
              background: smsEnabled ? '#15803D' : '#D1D5DB', position: 'relative', transition: 'background 0.2s',
              opacity: 0.5,
            }}>
              <div style={{ width: 18, height: 18, background: 'white', borderRadius: '50%', position: 'absolute', top: 3, left: smsEnabled ? 23 : 3 }} />
            </button>
          </div>

          {/* Portal gościa */}
          <div style={{ padding: '0.75rem 0' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#111827', marginBottom: '0.25rem' }}>🔐 Portal gościa</div>
            <div style={{ fontSize: '0.78rem', color: '#9CA3AF', marginBottom: '0.5rem' }}>Goście otrzymują indywidualny link z informacjami o pobycie, kodem Wi-Fi i przewodnikiem lokalu.</div>
            <button onClick={() => demoAlert('Podgląd portalu gościa.')} style={{ background: '#F3F4F6', color: '#374151', border: `1px solid ${CARD_BD}`, borderRadius: 8, padding: '0.4rem 0.9rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              Podgląd portalu →
            </button>
          </div>

          <div style={{ background: '#FFF7ED', border: `1px solid #FED7AA`, borderRadius: 10, padding: '0.75rem', marginTop: '0.5rem' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#C2410C', marginBottom: '0.25rem' }}>Integracja z Stripe</div>
            <div style={{ fontSize: '0.75rem', color: '#374151' }}>Połącz konto Stripe, aby przyjmować zaliczki i pełne płatności online bezpośrednio na Twój rachunek.</div>
            <button onClick={() => demoAlert('Konfiguracja Stripe w prawdziwym panelu.')} style={{ marginTop: '0.5rem', background: GOLD, color: 'white', border: 'none', borderRadius: 7, padding: '0.35rem 0.75rem', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Połącz Stripe
            </button>
          </div>
        </Card>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────
export default function AdminDemoPage() {
  const [tab, setTab]             = useState<Tab>('dashboard')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)
  const [isMobile, setIsMobile]   = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  function handleSetTab(t: Tab) {
    setTab(t)
    setSelectedBookingId(null)
    setMobileMenuOpen(false)
  }

  function handleSelectBooking(id: string) {
    setSelectedBookingId(id)
    setTab('bookings')
  }

  const showDetail = tab === 'bookings' && selectedBookingId !== null

  return (
    <div style={{ minHeight: '100vh', background: PAGE_BG, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* Demo banner */}
      <div style={{ background: '#7C3AED', color: 'white', padding: '0.55rem 1.5rem', fontSize: '0.8rem', fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', position: 'sticky', top: 0, zIndex: 100 }}>
        <span>👁 Demo panelu właściciela — dane przykładowe, przyciski nie wykonują akcji</span>
        <a href="https://www.nobooking.eu/#cennik" target="_blank" rel="noopener noreferrer" style={{ color: 'white', fontWeight: 800, textDecoration: 'underline', whiteSpace: 'nowrap' }}>
          Zamów własny panel →
        </a>
      </div>

      <div style={{ display: 'flex' }}>
        {/* Sidebar — desktop */}
        {!isMobile && (
          <Sidebar activeTab={tab} setTab={handleSetTab} collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />
        )}

        {/* Mobile overlay */}
        {isMobile && mobileMenuOpen && (
          <>
            <div onClick={() => setMobileMenuOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200 }} />
            <div style={{ position: 'fixed', left: 0, top: 0, bottom: 0, width: 240, zIndex: 201 }}>
              <Sidebar activeTab={tab} setTab={handleSetTab} collapsed={false} setCollapsed={() => setMobileMenuOpen(false)} />
            </div>
          </>
        )}

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {/* Top bar */}
          <div style={{ background: 'white', borderBottom: `1px solid ${CARD_BD}`, padding: '0 1.5rem', height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', position: 'sticky', top: 38, zIndex: 50 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              {isMobile && (
                <button onClick={() => setMobileMenuOpen(v => !v)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.25rem', color: '#374151', padding: 0 }}>☰</button>
              )}
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#111827' }}>🏠 Casa Sol Torrevieja</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <a href="/demo" target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.78rem', color: '#059669', fontWeight: 700, textDecoration: 'none', border: '1px solid #BBF7D0', background: '#F0FDF4', borderRadius: 8, padding: '0.3rem 0.7rem' }}>
                🌐 Moja strona ↗
              </a>
              <span style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>michal@casasol.eu</span>
            </div>
          </div>

          {/* Content */}
          <div style={{ flex: 1, padding: isMobile ? '1.25rem' : '2rem', maxWidth: 1080, width: '100%', margin: '0 auto', boxSizing: 'border-box' }}>
            {tab === 'dashboard' && <DashboardView setTab={handleSetTab} setBookingId={handleSelectBooking} />}
            {tab === 'bookings' && !showDetail && <BookingListView onSelect={id => setSelectedBookingId(id)} />}
            {tab === 'bookings' && showDetail && <BookingDetailView bookingId={selectedBookingId!} onBack={() => setSelectedBookingId(null)} />}
            {tab === 'guests'    && <GuestsView />}
            {tab === 'cennik'    && <CennikView />}
            {tab === 'opinie'    && <OpinieView />}
            {tab === 'analityka' && <AnalitykaView />}
            {tab === 'ustawienia'&& <UstawieniaView />}
          </div>
        </div>
      </div>
    </div>
  )
}
