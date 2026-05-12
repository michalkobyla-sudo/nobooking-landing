'use client'

import { useState, useCallback } from 'react'
import type { Booking, BlockedDate } from '@/lib/types'

type DayState = 'available' | 'blocked' | 'booked_confirmed' | 'booked_pending' | 'booked_other' | 'past'

interface DayInfo {
  state: DayState
  bookingName?: string
  blockedId?: string
}

function isoDate(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

function buildDayMap(
  bookings: Booking[],
  blocked: BlockedDate[],
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
            dayMap={buildDayMap(bookings, blocked, year, month)}
            onToggle={handleToggle}
            loadingDates={loadingDates}
          />
        ))}
      </div>
    </div>
  )
}
