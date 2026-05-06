'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import type { Order, OrderStatus } from '@/lib/types'
import { PRICE_LABELS } from '@/lib/prices'

const STATUS_OPTIONS: Array<{ value: OrderStatus; label: string }> = [
  { value: 'new', label: 'Nowe' },
  { value: 'contacted', label: 'W kontakcie' },
  { value: 'onboarding_sent', label: 'Formularz wysłany' },
  { value: 'building', label: 'W budowie' },
  { value: 'completed', label: 'Ukończone' },
]

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: '12px', padding: '1.5rem', marginBottom: '1rem' }}>
      <h3 style={{ fontSize: '0.8rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '1rem' }}>
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

export default function OrderDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params.id as string

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusSaving, setStatusSaving] = useState(false)
  const [onboardingSending, setOnboardingSending] = useState(false)
  const [onboardingMsg, setOnboardingMsg] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/admin/orders/${id}`)
      if (res.status === 401) { router.push('/admin/login'); return }
      if (res.status === 404) { router.push('/admin/zamowienia'); return }
      const data = await res.json() as Order
      setOrder(data)
      setLoading(false)
    }
    load()
  }, [id, router])

  async function handleStatusChange(status: OrderStatus) {
    if (!order) return
    setStatusSaving(true)
    await fetch(`/api/admin/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
    setOrder(prev => prev ? { ...prev, status } : prev)
    setStatusSaving(false)
  }

  async function handleSendOnboarding() {
    setOnboardingSending(true)
    setOnboardingMsg(null)
    const res = await fetch(`/api/admin/orders/${id}/send-onboarding`, { method: 'POST' })
    const data = await res.json() as { success?: boolean; error?: string }
    if (data.success) {
      setOnboardingMsg('Email wysłany!')
      setOrder(prev => prev ? { ...prev, status: 'onboarding_sent' } : prev)
    } else {
      setOnboardingMsg(`Błąd: ${data.error ?? 'nieznany'}`)
    }
    setOnboardingSending(false)
  }

  if (loading) {
    return <div style={{ padding: '4rem', textAlign: 'center', color: '#9CA3AF' }}>Ładowanie...</div>
  }
  if (!order) return null

  const planLabel = order.plan === 'pro' ? 'Pro' : 'Basic'
  const priceLabel = PRICE_LABELS[order.plan][order.currency]

  return (
    <div>
      {/* Top nav */}
      <div style={{ background: 'white', borderBottom: '1px solid #E5E7EB', padding: '1rem 2rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
        <button
          onClick={() => router.push('/admin/zamowienia')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', color: '#6B7280', fontFamily: 'inherit', padding: 0 }}
        >
          ← Zamówienia
        </button>
        <span style={{ color: '#D1D5DB' }}>·</span>
        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>
          {order.first_name} {order.last_name}
        </span>
      </div>

      <div style={{ padding: '2rem', maxWidth: '800px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', marginBottom: '0.25rem' }}>
              {order.first_name} {order.last_name}
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#6B7280' }}>
              Nobooking {planLabel} · {priceLabel} · {new Date(order.created_at).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: '#9CA3AF' }}>Status:</span>
            <select
              value={order.status}
              onChange={e => handleStatusChange(e.target.value as OrderStatus)}
              disabled={statusSaving}
              style={{ padding: '0.4rem 0.75rem', border: '1.5px solid #D1D5DB', borderRadius: '8px', fontSize: '0.875rem', fontFamily: 'inherit', cursor: 'pointer', background: 'white', fontWeight: 600 }}
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Contact */}
        <Section title="Dane kontaktowe">
          <Row label="Imię i nazwisko" value={`${order.first_name} ${order.last_name}`} />
          <Row label="Email" value={order.email} />
          <Row label="Telefon" value={order.phone} />
        </Section>

        {/* Invoice */}
        {(order.invoice_company || order.invoice_nip || order.invoice_address) ? (
          <Section title="Dane do faktury">
            <Row label="Firma" value={order.invoice_company} />
            <Row label="NIP" value={order.invoice_nip} />
            <Row label="Adres" value={order.invoice_address} />
          </Section>
        ) : (
          <Section title="Dane do faktury">
            <p style={{ fontSize: '0.875rem', color: '#9CA3AF' }}>Brak danych do faktury</p>
          </Section>
        )}

        {/* Apartment */}
        <Section title="Informacje o apartamencie">
          <Row label="Nazwa" value={order.apartment_name} />
          <Row label="Lokalizacja" value={order.apartment_location} />
          <Row label="Notatki" value={order.notes} />
        </Section>

        {/* Payment */}
        <Section title="Płatność">
          <Row label="Plan" value={`Nobooking ${planLabel}`} />
          <Row label="Kwota" value={priceLabel} />
          <Row label="Waluta" value={order.currency.toUpperCase()} />
          <Row label="Stripe opłacony" value={order.stripe_paid ? '✅ Tak' : '❌ Nie'} />
          <Row label="Stripe Session ID" value={order.stripe_session_id} />
        </Section>

        {/* Onboarding */}
        <Section title="Formularz onboardingowy">
          {!order.stripe_paid && (
            <p style={{ fontSize: '0.875rem', color: '#9CA3AF' }}>Oczekiwanie na płatność</p>
          )}

          {order.stripe_paid && !order.onboarding_submitted && (
            <div>
              <p style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '1rem' }}>
                Formularz nie został jeszcze wypełniony.
              </p>
              <button
                onClick={handleSendOnboarding}
                disabled={onboardingSending}
                style={{
                  background: '#059669', color: 'white', border: 'none', borderRadius: '8px',
                  padding: '0.7rem 1.5rem', fontSize: '0.875rem', fontWeight: 700,
                  fontFamily: 'inherit', cursor: onboardingSending ? 'not-allowed' : 'pointer',
                  opacity: onboardingSending ? 0.7 : 1,
                }}
              >
                {onboardingSending ? 'Wysyłanie...' : 'Wyślij formularz onboardingowy →'}
              </button>
              {onboardingMsg && (
                <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: onboardingMsg.startsWith('Błąd') ? '#DC2626' : '#059669', fontWeight: 600 }}>
                  {onboardingMsg}
                </p>
              )}
            </div>
          )}

          {order.onboarding_submitted && (
            <div>
              <Row label="Opis" value={order.ob_description} />
              <Row label="Cena za noc" value={order.ob_price_per_night?.toString()} />
              <Row label="Maks. gości" value={order.ob_max_guests?.toString()} />
              <Row label="Check-in" value={order.ob_checkin_time} />
              <Row label="Check-out" value={order.ob_checkout_time} />
              <Row label="Udogodnienia" value={order.ob_amenities} />
              <Row label="Zasady" value={order.ob_rules} />
              <Row label="Zdjęcia" value={order.ob_photos_link} />
              {order.ob_seasons && (
                <div style={{ marginBottom: '0.625rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#9CA3AF', display: 'block', marginBottom: '0.25rem' }}>Sezony</span>
                  <pre style={{ fontSize: '0.8rem', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '0.75rem', overflow: 'auto', color: '#374151' }}>
                    {JSON.stringify(JSON.parse(order.ob_seasons), null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </Section>
      </div>
    </div>
  )
}
