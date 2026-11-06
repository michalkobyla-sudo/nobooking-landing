'use client'

import { useState, useCallback, useEffect } from 'react'
import type { Booking, BlockedDate, CalendarFeed, DzienZajetyNaPortalu, ZrodloKalendarza } from '@/lib/types'

type DayState = 'available' | 'blocked' | 'external' | 'booked_confirmed' | 'booked_pending' | 'booked_other' | 'past'

interface DayInfo {
  state: DayState
  bookingName?: string
  blockedId?: string
}

function isoDate(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

const NAZWA_ZRODLA: Record<ZrodloKalendarza, string> = {
  booking: 'Booking.com',
  airbnb:  'Airbnb',
  inne:    'inny portal',
}

function buildDayMap(
  bookings: Booking[],
  blocked: BlockedDate[],
  external: DzienZajetyNaPortalu[],
  year: number,
  month: number,
): Map<string, DayInfo> {
  const map = new Map<string, DayInfo>()
  const today = new Date().toISOString().slice(0, 10)
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  for (let d = 1; d <= daysInMonth; d++) {
    const key = isoDate(year, month, d)
    map.set(key, { state: key < today ? 'past' : 'available' })
  }

  for (const b of blocked) {
    if (map.has(b.date)) map.set(b.date, { state: 'blocked', blockedId: b.id })
  }

  // Zajęte na portalu — nie do odblokowania tutaj, zwalnia się na portalu.
  for (const e of external) {
    const cur = map.get(e.date)
    if (cur && cur.state !== 'past') map.set(e.date, { state: 'external', bookingName: `Zajęte na ${NAZWA_ZRODLA[e.source]}` })
  }

  for (const b of bookings) {
    if (b.status === 'cancelled') continue
    const cur = new Date(b.check_in)
    const end = new Date(b.check_out)
    while (cur < end) {
      const key = cur.toISOString().slice(0, 10)
      if (map.has(key)) {
        const state: DayState =
          b.status === 'confirmed' ? 'booked_confirmed' :
          b.status === 'pending'   ? 'booked_pending'   :
          'booked_other'
        map.set(key, { state, bookingName: b.guest_name })
      }
      cur.setDate(cur.getDate() + 1)
    }
  }

  return map
}

const MONTH_NAMES = ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień']
const DAY_NAMES   = ['Pn','Wt','Śr','Cz','Pt','Sb','Nd']

function MonthCalendar({ year, month, dayMap, onToggle, loadingDates }: {
  year: number
  month: number
  dayMap: Map<string, DayInfo>
  onToggle: (date: string, info: DayInfo) => void
  loadingDates: Set<string>
}) {
  const firstDow    = new Date(year, month, 1).getDay()
  const startOffset = firstDow === 0 ? 6 : firstDow - 1
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: Array<{ date: string; day: number } | null> = []
  for (let i = 0; i < startOffset; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push({ date: isoDate(year, month, d), day: d })

  function cellStyle(info: DayInfo | undefined): React.CSSProperties {
    const base: React.CSSProperties = {
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      borderRadius: '8px', fontWeight: 600, fontSize: '0.82rem',
      aspectRatio: '1',
    }
    if (!info) return base
    switch (info.state) {
      case 'past':             return { ...base, color: '#D1D5DB', cursor: 'default' }
      case 'available':        return { ...base, color: '#374151', background: '#F3F4F6', border: '1px solid #E5E7EB', cursor: 'pointer' }
      case 'blocked':          return { ...base, color: '#fff',    background: '#6B7280', cursor: 'pointer' }
      case 'external':         return { ...base, color: '#fff',    background: '#2563EB', cursor: 'default' }
      case 'booked_confirmed': return { ...base, color: '#fff',    background: '#059669', cursor: 'default' }
      case 'booked_pending':   return { ...base, color: '#92400E', background: '#FEF3C7', cursor: 'default' }
      case 'booked_other':     return { ...base, color: '#374151', background: '#E5E7EB', cursor: 'default' }
    }
  }

  return (
    <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '14px', padding: '1.25rem' }}>
      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111827', marginBottom: '0.75rem' }}>
        {MONTH_NAMES[month]} {year}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '4px' }}>
        {DAY_NAMES.map(d => (
          <div key={d} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.68rem', fontWeight: 700, color: '#9CA3AF', padding: '0.15rem 0' }}>
            {d}
          </div>
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
        {cells.map((cell, i) => {
          if (!cell) return <div key={`empty-${i}`} style={{ aspectRatio: '1' }} />
          const info      = dayMap.get(cell.date)
          const isLoading = loadingDates.has(cell.date)
          const canClick  = info && (info.state === 'available' || info.state === 'blocked')
          return (
            <div
              key={cell.date}
              style={{ ...cellStyle(info), opacity: isLoading ? 0.4 : 1, transition: 'opacity 0.1s' }}
              title={
                info?.bookingName           ? info.bookingName :
                info?.state === 'blocked'   ? 'Zablokowane — kliknij by odblokować' :
                info?.state === 'available' ? 'Kliknij by zablokować' : ''
              }
              onClick={() => canClick && !isLoading && info && onToggle(cell.date, info)}
            >
              {cell.day}
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface Props {
  slug:        string
  bookings:    Booking[]
  blocked:     BlockedDate[]
  setBlocked:  (fn: (prev: BlockedDate[]) => BlockedDate[]) => void
}

export function KalendarzView({ slug, bookings, blocked, setBlocked }: Props) {
  const now = new Date()
  const [viewYear,     setViewYear]     = useState(now.getFullYear())
  const [viewMonth,    setViewMonth]    = useState(now.getMonth())
  const [loadingDates, setLoadingDates] = useState<Set<string>>(new Set())
  const [feeds,        setFeeds]        = useState<CalendarFeed[]>([])
  const [external,     setExternal]     = useState<DzienZajetyNaPortalu[]>([])

  const wczytajPortale = useCallback(async () => {
    const res = await fetch(`/api/sites/${slug}/owner/calendars`)
    if (!res.ok) return
    const dane = await res.json() as { feeds: CalendarFeed[]; zajete: DzienZajetyNaPortalu[] }
    setFeeds(dane.feeds)
    setExternal(dane.zajete)
  }, [slug])

  useEffect(() => { wczytajPortale() }, [wczytajPortale])

  const handleToggle = useCallback(async (date: string, info: DayInfo) => {
    setLoadingDates(prev => new Set(prev).add(date))

    if (info.state === 'blocked' && info.blockedId) {
      const res = await fetch(`/api/sites/${slug}/owner/blocked/${info.blockedId}`, { method: 'DELETE' })
      if (res.ok) setBlocked(prev => prev.filter(b => b.id !== info.blockedId))
    } else if (info.state === 'available') {
      const res = await fetch(`/api/sites/${slug}/owner/blocked`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date }),
      })
      if (res.ok) {
        const newBlocked = await res.json() as BlockedDate
        setBlocked(prev => [...prev, newBlocked])
      }
    }

    setLoadingDates(prev => { const s = new Set(prev); s.delete(date); return s })
  }, [slug, setBlocked])

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11) }
    else setViewMonth(m => m - 1)
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0) }
    else setViewMonth(m => m + 1)
  }

  const months = [0, 1, 2].map(offset => {
    const totalMonth = viewMonth + offset
    return { year: viewYear + Math.floor(totalMonth / 12), month: totalMonth % 12 }
  })

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h1 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#111827', margin: 0 }}>Kalendarz</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={prevMonth} style={{ padding: '0.4rem 0.875rem', border: '1.5px solid #E5E7EB', borderRadius: '8px', background: 'white', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.875rem' }}>
            ← Wcześniej
          </button>
          <button onClick={nextMonth} style={{ padding: '0.4rem 0.875rem', border: '1.5px solid #E5E7EB', borderRadius: '8px', background: 'white', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.875rem' }}>
            Dalej →
          </button>
        </div>
      </div>

      {/* Legenda */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        {[
          { bg: '#059669', label: 'Potwierdzona' },
          { bg: '#FEF3C7', label: 'Oczekuje',    border: '1px solid #FDE68A' },
          { bg: '#6B7280', label: 'Zablokowane' },
          { bg: '#2563EB', label: 'Booking / Airbnb' },
          { bg: '#F3F4F6', label: 'Dostępne',    border: '1px solid #E5E7EB' },
        ].map(l => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div style={{ width: '14px', height: '14px', borderRadius: '4px', background: l.bg, border: l.border ?? 'none', flexShrink: 0 }} />
            <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>{l.label}</span>
          </div>
        ))}
        <span style={{ fontSize: '0.73rem', color: '#9CA3AF' }}>· Kliknij dostępny dzień by zablokować</span>
      </div>

      {/* 3 miesiące — 1 kolumna na mobile, 3 na desktop */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
        {months.map(({ year, month }) => (
          <MonthCalendar
            key={`${year}-${month}`}
            year={year}
            month={month}
            dayMap={buildDayMap(bookings, blocked, external, year, month)}
            onToggle={handleToggle}
            loadingDates={loadingDates}
          />
        ))}
      </div>

      <SynchronizacjaPortali slug={slug} feeds={feeds} odswiez={wczytajPortale} />
    </div>
  )
}

const KOMUNIKAT_BLEDU: Record<string, string> = {
  invalid_url:    'To nie wygląda na link. Skopiuj cały adres z panelu portalu.',
  not_https:      'Link musi zaczynać się od https://',
  private_host:   'Ten adres nie jest linkiem z portalu.',
  invalid_source: 'Wybierz portal.',
  already_added:  'Ten kalendarz jest już podpięty.',
  too_many_feeds: 'Można podpiąć najwyżej 5 kalendarzy.',
  not_ical:       'Pod linkiem nie ma kalendarza. Sprawdź, czy to link eksportu iCal.',
  network:        'Portal nie odpowiedział. Spróbujemy ponownie za 15 minut.',
  too_large:      'Plik pod linkiem jest za duży jak na kalendarz.',
}

function opisBledu(kod: string): string {
  if (KOMUNIKAT_BLEDU[kod]) return KOMUNIKAT_BLEDU[kod]
  if (kod.startsWith('http_')) return `Portal zwrócił błąd ${kod.slice(5)}. Sprawdź, czy link jest aktualny.`
  return 'Nie udało się pobrać kalendarza.'
}

function kiedy(iso: string): string {
  return new Date(iso).toLocaleString('pl-PL', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function SynchronizacjaPortali({ slug, feeds, odswiez }: {
  slug: string
  feeds: CalendarFeed[]
  odswiez: () => Promise<void>
}) {
  const [zrodlo,     setZrodlo]     = useState<ZrodloKalendarza>('booking')
  const [adres,      setAdres]      = useState('')
  const [blad,       setBlad]       = useState<string | null>(null)
  const [zapisuje,   setZapisuje]   = useState(false)
  const [skopiowany, setSkopiowany] = useState(false)
  const [linkEksportu, setLinkEksportu] = useState(`/api/sites/${slug}/calendar.ics`)

  // Pełny adres dopiero w przeglądarce: strona działa i na subdomenie,
  // i na własnej domenie właściciela.
  useEffect(() => { setLinkEksportu(`${window.location.origin}/api/sites/${slug}/calendar.ics`) }, [slug])

  async function kopiuj() {
    try {
      await navigator.clipboard.writeText(linkEksportu)
      setSkopiowany(true)
      setTimeout(() => setSkopiowany(false), 2000)
    } catch { /* przeglądarka bez dostępu do schowka — link i tak jest widoczny */ }
  }

  async function dodaj(e: React.FormEvent) {
    e.preventDefault()
    setBlad(null)
    setZapisuje(true)
    const res = await fetch(`/api/sites/${slug}/owner/calendars`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: zrodlo, url: adres.trim() }),
    })
    setZapisuje(false)
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: '' })) as { error: string }
      setBlad(opisBledu(error))
      return
    }
    setAdres('')
    await odswiez()
  }

  async function usun(id: string) {
    if (!confirm('Odpiąć ten kalendarz? Dni zajęte na tym portalu przestaną być blokowane na Twojej stronie.')) return
    const res = await fetch(`/api/sites/${slug}/owner/calendars/${id}`, { method: 'DELETE' })
    if (res.ok) await odswiez()
  }

  const karta: React.CSSProperties = { background: 'white', border: '1px solid #E5E7EB', borderRadius: '14px', padding: '1.25rem' }
  const pole: React.CSSProperties = { padding: '0.55rem 0.75rem', border: '1.5px solid #E5E7EB', borderRadius: '8px', fontFamily: 'inherit', fontSize: '0.875rem', minWidth: 0 }
  const przycisk: React.CSSProperties = { padding: '0.55rem 1rem', border: 'none', borderRadius: '8px', background: '#111827', color: 'white', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600, fontSize: '0.875rem' }

  return (
    <div style={{ marginTop: '2rem', display: 'grid', gap: '1rem' }}>
      <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#111827', margin: 0 }}>Synchronizacja z Booking.com i Airbnb</h2>

      <div style={karta}>
        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111827', marginBottom: '0.35rem' }}>1. Twój kalendarz dla portali</div>
        <p style={{ fontSize: '0.82rem', color: '#6B7280', margin: '0 0 0.75rem' }}>
          Wklej ten link w Booking.com (Ceny i dostępność → Synchronizacja kalendarzy → Importuj kalendarz)
          i w Airbnb (Kalendarz → Dostępność → Połącz kalendarze → Importuj kalendarz).
          Portale zablokują u siebie terminy zarezerwowane na Twojej stronie.
        </p>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <input readOnly value={linkEksportu} onFocus={e => e.target.select()} style={{ ...pole, flex: '1 1 260px', color: '#374151', background: '#F9FAFB' }} />
          <button type="button" onClick={kopiuj} style={przycisk}>{skopiowany ? 'Skopiowano' : 'Kopiuj link'}</button>
        </div>
      </div>

      <div style={karta}>
        <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#111827', marginBottom: '0.35rem' }}>2. Kalendarze z portali</div>
        <p style={{ fontSize: '0.82rem', color: '#6B7280', margin: '0 0 0.75rem' }}>
          Skopiuj z portalu link „eksportuj kalendarz” (w Booking.com: Synchronizacja kalendarzy → Eksportuj;
          w Airbnb: Połącz kalendarze → Eksportuj) i wklej go tutaj. Sprawdzamy go co 15 minut.
        </p>

        {feeds.length > 0 && (
          <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '1rem' }}>
            {feeds.map(f => (
              <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem', border: '1px solid #F3F4F6', borderRadius: '10px', flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0, flex: '1 1 220px' }}>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#111827' }}>{NAZWA_ZRODLA[f.source]}</div>
                  <div style={{ fontSize: '0.75rem', color: f.last_error ? '#B91C1C' : '#6B7280' }}>
                    {f.last_error
                      ? opisBledu(f.last_error)
                      : f.last_synced_at
                        ? `Sprawdzony ${kiedy(f.last_synced_at)} · zajętych dni: ${f.last_days_count ?? 0}`
                        : 'Czeka na pierwsze pobranie (do 15 minut)'}
                  </div>
                </div>
                <button type="button" onClick={() => usun(f.id)} style={{ ...przycisk, background: 'white', color: '#B91C1C', border: '1.5px solid #FECACA' }}>Odepnij</button>
              </div>
            ))}
          </div>
        )}

        <form onSubmit={dodaj} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <select value={zrodlo} onChange={e => setZrodlo(e.target.value as ZrodloKalendarza)} style={pole}>
            <option value="booking">Booking.com</option>
            <option value="airbnb">Airbnb</option>
            <option value="inne">Inny portal</option>
          </select>
          <input type="url" required placeholder="https://..." value={adres} onChange={e => setAdres(e.target.value)} style={{ ...pole, flex: '1 1 260px' }} />
          <button type="submit" disabled={zapisuje} style={{ ...przycisk, opacity: zapisuje ? 0.6 : 1 }}>{zapisuje ? 'Zapisuję…' : 'Podepnij'}</button>
        </form>
        {blad && <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#B91C1C' }}>{blad}</div>}
      </div>
    </div>
  )
}
