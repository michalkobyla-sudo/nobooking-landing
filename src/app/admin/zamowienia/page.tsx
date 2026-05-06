'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import type { OrderStatus } from '@/lib/types'
import { PRICE_LABELS } from '@/lib/prices'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface OrderRow {
  id: string
  created_at: string
  plan: 'basic' | 'pro'
  currency: 'pln' | 'eur'
  status: OrderStatus
  stripe_paid: boolean
  onboarding_submitted: boolean
  first_name: string
  last_name: string
  email: string
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'Nowe',
  contacted: 'W kontakcie',
  onboarding_sent: 'Formularz wysłany',
  building: 'W budowie',
  completed: 'Ukończone',
}

const STATUS_COLORS: Record<OrderStatus, { bg: string; color: string }> = {
  new: { bg: '#EFF6FF', color: '#1D4ED8' },
  contacted: { bg: '#FFF7ED', color: '#C2410C' },
  onboarding_sent: { bg: '#F5F3FF', color: '#6D28D9' },
  building: { bg: '#FEFCE8', color: '#92400E' },
  completed: { bg: '#F0FDF4', color: '#15803D' },
}

const FILTER_OPTIONS: Array<{ value: OrderStatus | 'all'; label: string }> = [
  { value: 'all', label: 'Wszystkie' },
  { value: 'new', label: 'Nowe' },
  { value: 'contacted', label: 'W kontakcie' },
  { value: 'onboarding_sent', label: 'Formularz wysłany' },
  { value: 'building', label: 'W budowie' },
  { value: 'completed', label: 'Ukończone' },
]

export default function AdminZamowieniaPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const res = await fetch('/api/admin/orders')
      if (res.status === 401) {
        router.push('/admin/login')
        return
      }
      const data = await res.json() as OrderRow[]
      setOrders(Array.isArray(data) ? data : [])
      setLoading(false)
    }
    load()
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/admin/login')
  }

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)

  return (
    <div>
      {/* Top nav */}
      <div style={{ background: 'white', borderBottom: '1px solid #E5E7EB', padding: '1rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
          <span style={{ color: 'var(--color-accent)' }}>No</span>booking Admin
        </div>
        <button
          onClick={handleLogout}
          style={{ background: 'none', border: '1px solid #D1D5DB', borderRadius: '8px', padding: '0.4rem 1rem', fontSize: '0.875rem', cursor: 'pointer', fontFamily: 'inherit', color: '#374151' }}
        >
          Wyloguj
        </button>
      </div>

      <div style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827' }}>Zamówienia</h1>
          <span style={{ fontSize: '0.875rem', color: '#6B7280' }}>{orders.length} łącznie</span>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
          {FILTER_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => setFilter(opt.value)}
              style={{
                padding: '0.4rem 1rem', borderRadius: '20px',
                border: '1px solid', fontFamily: 'inherit',
                fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                borderColor: filter === opt.value ? '#111827' : '#D1D5DB',
                background: filter === opt.value ? '#111827' : 'white',
                color: filter === opt.value ? 'white' : '#374151',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {loading ? (
          <p style={{ color: '#6B7280', textAlign: 'center', padding: '3rem' }}>Ładowanie...</p>
        ) : filtered.length === 0 ? (
          <p style={{ color: '#6B7280', textAlign: 'center', padding: '3rem' }}>Brak zamówień</p>
        ) : (
          <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E5E7EB', background: '#F9FAFB' }}>
                  {['Data', 'Klient', 'Plan', 'Status', 'Stripe', 'Onboarding'].map(h => (
                    <th key={h} style={{ padding: '0.875rem 1rem', textAlign: 'left', fontSize: '0.78rem', fontWeight: 700, color: '#6B7280', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((order, i) => (
                  <tr
                    key={order.id}
                    onClick={() => router.push(`/admin/zamowienia/${order.id}`)}
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid #F3F4F6' : 'none', cursor: 'pointer', transition: 'background 0.1s' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#F9FAFB' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'white' }}
                  >
                    <td style={{ padding: '0.875rem 1rem', fontSize: '0.8rem', color: '#6B7280', whiteSpace: 'nowrap' }}>
                      {new Date(order.created_at).toLocaleDateString('pl-PL')}
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>
                        {order.first_name} {order.last_name}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: '#6B7280' }}>{order.email}</div>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span style={{
                        fontSize: '0.78rem', fontWeight: 700, padding: '0.25rem 0.625rem', borderRadius: '20px',
                        background: order.plan === 'pro' ? '#111827' : '#F3F4F6',
                        color: order.plan === 'pro' ? 'white' : '#374151',
                      }}>
                        {order.plan === 'pro' ? 'Pro' : 'Basic'} · {PRICE_LABELS[order.plan][order.currency]}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem' }}>
                      <span style={{
                        fontSize: '0.78rem', fontWeight: 700, padding: '0.25rem 0.625rem', borderRadius: '20px',
                        ...STATUS_COLORS[order.status],
                      }}>
                        {STATUS_LABELS[order.status]}
                      </span>
                    </td>
                    <td style={{ padding: '0.875rem 1rem', fontSize: '1rem' }}>
                      {order.stripe_paid ? '✅' : '❌'}
                    </td>
                    <td style={{ padding: '0.875rem 1rem', fontSize: '0.8rem', color: order.onboarding_submitted ? '#15803D' : '#9CA3AF', fontWeight: 600 }}>
                      {order.onboarding_submitted ? 'Wypełniony' : 'Oczekuje'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
