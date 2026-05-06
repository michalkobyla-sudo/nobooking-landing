'use client'

import { useState } from 'react'
import { PRICE_LABELS } from '@/lib/prices'

interface Props {
  plan: 'basic' | 'pro'
  currency: 'pln' | 'eur'
}

interface FormData {
  first_name: string
  last_name: string
  email: string
  phone: string
  want_invoice: boolean
  invoice_company: string
  invoice_nip: string
  invoice_address: string
  apartment_name: string
  apartment_location: string
  notes: string
}

const INITIAL: FormData = {
  first_name: '', last_name: '', email: '', phone: '',
  want_invoice: false,
  invoice_company: '', invoice_nip: '', invoice_address: '',
  apartment_name: '', apartment_location: '', notes: '',
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>
        {label}{required && <span style={{ color: 'var(--color-pain)', marginLeft: '2px' }}>*</span>}
      </label>
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.65rem 0.875rem',
  border: '1.5px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  fontSize: '0.95rem', fontFamily: 'inherit',
  outline: 'none', boxSizing: 'border-box',
  background: 'white', color: 'var(--color-text)',
}

const textareaStyle: React.CSSProperties = {
  ...inputStyle, resize: 'vertical', minHeight: '80px',
}

export default function OrderForm({ plan, currency }: Props) {
  const [form, setForm] = useState<FormData>(INITIAL)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const planLabel = plan === 'pro' ? 'Pro' : 'Basic'
  const priceLabel = PRICE_LABELS[plan][currency]

  function set(field: keyof FormData, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Client-side validation
    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim() || !form.phone.trim()) {
      setError('Wypełnij wszystkie wymagane pola.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Podaj poprawny adres email.')
      return
    }
    if (!form.apartment_name.trim() || !form.apartment_location.trim()) {
      setError('Wypełnij dane apartamentu.')
      return
    }
    if (form.want_invoice && form.invoice_nip) {
      if (!/^\d{10}$/.test(form.invoice_nip.replace(/[-\s]/g, ''))) {
        setError('NIP musi zawierać 10 cyfr.')
        return
      }
    }

    setLoading(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan, currency,
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          invoice_company: form.want_invoice ? form.invoice_company.trim() || null : null,
          invoice_nip: form.want_invoice ? form.invoice_nip.trim() || null : null,
          invoice_address: form.want_invoice ? form.invoice_address.trim() || null : null,
          apartment_name: form.apartment_name.trim(),
          apartment_location: form.apartment_location.trim(),
          notes: form.notes.trim() || null,
        }),
      })

      const data = await res.json() as { stripe_url?: string; error?: string }

      if (data.stripe_url) {
        window.location.href = data.stripe_url
      } else {
        setError('Wystąpił błąd. Spróbuj ponownie lub napisz na kontakt@nobooking.eu')
      }
    } catch {
      setError('Błąd połączenia. Sprawdź internet i spróbuj ponownie.')
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', padding: '3rem 1rem' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        {/* Back link */}
        <a href="/#cennik" style={{ fontSize: '0.875rem', color: 'var(--color-accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginBottom: '2rem' }}>
          ← Zmień plan
        </a>

        {/* Plan badge */}
        <div style={{ background: 'white', border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: '1.25rem 1.5rem', marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
              Wybrany plan
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>Nobooking {planLabel}</div>
          </div>
          <div style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--color-accent)' }}>
            {priceLabel}
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* Contact data */}
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', color: '#111827' }}>
            Dane kontaktowe
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
            <Field label="Imię" required>
              <input style={inputStyle} type="text" value={form.first_name} onChange={e => set('first_name', e.target.value)} autoComplete="given-name" />
            </Field>
            <Field label="Nazwisko" required>
              <input style={inputStyle} type="text" value={form.last_name} onChange={e => set('last_name', e.target.value)} autoComplete="family-name" />
            </Field>
          </div>
          <Field label="Email" required>
            <input style={inputStyle} type="email" value={form.email} onChange={e => set('email', e.target.value)} autoComplete="email" />
          </Field>
          <Field label="Telefon" required>
            <input style={inputStyle} type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} autoComplete="tel" />
          </Field>

          {/* Invoice toggle */}
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, color: '#374151' }}>
              <input
                type="checkbox"
                checked={form.want_invoice}
                onChange={e => set('want_invoice', e.target.checked)}
                style={{ width: '18px', height: '18px', accentColor: 'var(--color-accent)', cursor: 'pointer' }}
              />
              Chcę fakturę na firmę
            </label>
          </div>

          {form.want_invoice && (
            <div style={{ background: '#F0FDF4', border: '1px solid var(--color-accent-border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', marginBottom: '1.5rem' }}>
              <Field label="Nazwa firmy">
                <input style={inputStyle} type="text" value={form.invoice_company} onChange={e => set('invoice_company', e.target.value)} />
              </Field>
              <Field label="NIP (10 cyfr)">
                <input style={inputStyle} type="text" value={form.invoice_nip} onChange={e => set('invoice_nip', e.target.value)} placeholder="1234567890" />
              </Field>
              <Field label="Adres">
                <textarea style={textareaStyle} value={form.invoice_address} onChange={e => set('invoice_address', e.target.value)} />
              </Field>
            </div>
          )}

          {/* Apartment */}
          <h2 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1.25rem', marginTop: '0.5rem', color: '#111827' }}>
            Informacje o apartamencie
          </h2>
          <Field label="Nazwa apartamentu" required>
            <input style={inputStyle} type="text" value={form.apartment_name} onChange={e => set('apartment_name', e.target.value)} placeholder="np. Apartament Słoneczny" />
          </Field>
          <Field label="Lokalizacja (miasto/region)" required>
            <input style={inputStyle} type="text" value={form.apartment_location} onChange={e => set('apartment_location', e.target.value)} placeholder="np. Torrevieja, Costa Blanca" />
          </Field>
          <Field label="Notatki / dodatkowe informacje">
            <textarea style={textareaStyle} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Cokolwiek chcesz nam powiedzieć..." />
          </Field>

          {/* Error */}
          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--radius-md)', padding: '0.875rem 1rem', marginBottom: '1.25rem', fontSize: '0.875rem', color: 'var(--color-pain)' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', fontSize: '1rem', padding: '1rem', opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Przekierowuję do płatności...' : 'Przejdź do płatności →'}
          </button>

          <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--color-text-faint)', marginTop: '1rem' }}>
            Płatność obsługiwana przez Stripe. Twoje dane są bezpieczne.
          </p>
        </form>
      </div>
    </div>
  )
}
