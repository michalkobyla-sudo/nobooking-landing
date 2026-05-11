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
  const [generating, setGenerating] = useState(false)
  const [generateMsg, setGenerateMsg] = useState<string | null>(null)

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

  async function handleGenerateSite(sendEmail: boolean) {
    setGenerating(true)
    setGenerateMsg(null)
    const res = await fetch(`/api/admin/orders/${id}/generate-site`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sendEmail }),
    })
    const data = await res.json() as { success?: boolean; slug?: string; error?: string; detail?: string }
    if (data.success && data.slug) {
      setGenerateMsg(`✅ Wygenerowano! /sites/${data.slug}`)
      setOrder(prev => prev ? { ...prev, site_slug: data.slug ?? null } : prev)
    } else {
      setGenerateMsg(`❌ Błąd: ${data.error ?? 'nieznany'}${data.detail ? ` — ${data.detail}` : ''}`)
    }
    setGenerating(false)
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
          {!order.onboarding_submitted && (
            <div>
              {!order.stripe_paid && (
                <p style={{ fontSize: '0.8rem', color: '#F59E0B', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: '8px', padding: '0.5rem 0.875rem', marginBottom: '1rem', fontWeight: 600 }}>
                  ⚠ Płatność Stripe nie potwierdzona — możesz mimo to wysłać formularz
                </p>
              )}
              {order.stripe_paid && (
                <p style={{ fontSize: '0.875rem', color: '#374151', marginBottom: '1rem' }}>
                  Formularz nie został jeszcze wypełniony.
                </p>
              )}
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
              <h4 style={{ fontSize: '0.7rem', fontWeight: 700, color: '#D1D5DB', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.75rem' }}>Opis i specyfikacja</h4>
              <Row label="Opis" value={order.ob_description} />
              <Row label="Tagline" value={order.ob_tagline} />
              <Row label="Adres" value={order.ob_address} />
              <Row label="Sypialnie" value={order.ob_bedrooms?.toString()} />
              <Row label="Łazienki" value={order.ob_bathrooms?.toString()} />
              <Row label="Powierzchnia" value={order.ob_sqm ? `${order.ob_sqm} m²` : null} />

              <h4 style={{ fontSize: '0.7rem', fontWeight: 700, color: '#D1D5DB', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '1rem 0 0.75rem' }}>Zdjęcia i media</h4>
              <Row label="Link do zdjęć" value={order.ob_photos_link} />
              <Row label="Link do wideo" value={order.ob_video_link} />

              <h4 style={{ fontSize: '0.7rem', fontWeight: 700, color: '#D1D5DB', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '1rem 0 0.75rem' }}>Cennik</h4>
              <Row label="Cena za noc" value={order.ob_price_per_night ? `${order.ob_price_per_night} ${(order.ob_currency ?? 'EUR').toUpperCase()}` : null} />
              <Row label="Maks. gości" value={order.ob_max_guests?.toString()} />
              {order.ob_seasons && (
                <div style={{ marginBottom: '0.625rem' }}>
                  <span style={{ fontSize: '0.8rem', color: '#9CA3AF', display: 'block', marginBottom: '0.25rem' }}>Sezony</span>
                  <pre style={{ fontSize: '0.8rem', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '0.75rem', overflow: 'auto', color: '#374151' }}>
                    {JSON.stringify(JSON.parse(order.ob_seasons), null, 2)}
                  </pre>
                </div>
              )}

              <h4 style={{ fontSize: '0.7rem', fontWeight: 700, color: '#D1D5DB', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '1rem 0 0.75rem' }}>Zasady i udogodnienia</h4>
              <Row label="Check-in" value={order.ob_checkin_time} />
              <Row label="Check-out" value={order.ob_checkout_time} />
              <Row label="Udogodnienia" value={order.ob_amenities} />
              <Row label="Zasady" value={order.ob_rules} />

              <h4 style={{ fontSize: '0.7rem', fontWeight: 700, color: '#D1D5DB', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '1rem 0 0.75rem' }}>Kontakt i domena</h4>
              <Row label="Email kontaktowy" value={order.ob_contact_email} />
              <Row label="Telefon kontaktowy" value={order.ob_contact_phone} />
              <Row label="Domena" value={order.ob_domain} />
              <Row label="Instagram" value={order.ob_instagram} />
              <Row label="Facebook" value={order.ob_facebook} />
              {order.ob_color && (
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.625rem', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.8rem', color: '#9CA3AF', minWidth: '140px' }}>Kolor</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '20px', height: '20px', borderRadius: '4px', background: order.ob_color, border: '1px solid #E5E7EB' }} />
                    <span style={{ fontSize: '0.875rem', color: '#111827', fontWeight: 500 }}>{order.ob_color}</span>
                  </div>
                </div>
              )}

              {(order.ob_sms_phone || order.ob_checkin_fields) && (
                <>
                  <h4 style={{ fontSize: '0.7rem', fontWeight: 700, color: '#D1D5DB', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '1rem 0 0.75rem' }}>Pro — dodatkowe</h4>
                  <Row label="SMS telefon" value={order.ob_sms_phone} />
                  {order.ob_checkin_fields && (
                    <div style={{ marginBottom: '0.625rem' }}>
                      <span style={{ fontSize: '0.8rem', color: '#9CA3AF', display: 'block', marginBottom: '0.25rem' }}>Pola online check-in</span>
                      <pre style={{ fontSize: '0.8rem', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: '8px', padding: '0.75rem', overflow: 'auto', color: '#374151', whiteSpace: 'pre-wrap' }}>
                        {order.ob_checkin_fields}
                      </pre>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </Section>
        {/* Site generation */}
        <Section title="Wygenerowana strona">
          {order.site_slug ? (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <a
                  href={`/sites/${order.site_slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', background: '#f0fdf4', border: '1.5px solid #bbf7d0', color: '#059669', borderRadius: '8px', padding: '0.5rem 1rem', fontSize: '0.875rem', fontWeight: 700, textDecoration: 'none' }}
                >
                  🌐 nobooking.eu/sites/{order.site_slug} ↗
                </a>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleGenerateSite(false)}
                  disabled={generating}
                  style={{ background: '#F3F4F6', color: '#374151', border: '1px solid #D1D5DB', borderRadius: '8px', padding: '0.6rem 1.25rem', fontSize: '0.875rem', fontWeight: 600, fontFamily: 'inherit', cursor: generating ? 'not-allowed' : 'pointer', opacity: generating ? 0.7 : 1 }}
                >
                  {generating ? '⏳ Generowanie...' : '🔄 Regeneruj (bez emaila)'}
                </button>
                <button
                  onClick={() => handleGenerateSite(true)}
                  disabled={generating}
                  style={{ background: '#059669', color: 'white', border: 'none', borderRadius: '8px', padding: '0.6rem 1.25rem', fontSize: '0.875rem', fontWeight: 700, fontFamily: 'inherit', cursor: generating ? 'not-allowed' : 'pointer', opacity: generating ? 0.7 : 1 }}
                >
                  {generating ? '⏳ Generowanie...' : '🔄 Regeneruj + wyślij email'}
                </button>
              </div>
            </div>
          ) : (
            <div>
              {!order.onboarding_submitted && (
                <p style={{ fontSize: '0.875rem', color: '#9CA3AF', marginBottom: '1rem' }}>
                  Formularz onboardingowy nie został jeszcze wypełniony.
                </p>
              )}
              <button
                onClick={() => handleGenerateSite(true)}
                disabled={generating}
                style={{ background: '#059669', color: 'white', border: 'none', borderRadius: '8px', padding: '0.7rem 1.5rem', fontSize: '0.875rem', fontWeight: 700, fontFamily: 'inherit', cursor: generating ? 'not-allowed' : 'pointer', opacity: generating ? 0.7 : 1 }}
              >
                {generating ? '⏳ Generuję stronę AI... (ok. 15 sek)' : '✨ Wygeneruj stronę AI →'}
              </button>
            </div>
          )}
          {generateMsg && (
            <p style={{ marginTop: '0.75rem', fontSize: '0.875rem', color: generateMsg.startsWith('✅') ? '#059669' : '#DC2626', fontWeight: 600 }}>
              {generateMsg}
            </p>
          )}
        </Section>
      </div>
    </div>
  )
}
