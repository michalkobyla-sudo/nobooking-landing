'use client'

import { useState } from 'react'
import { useLang } from '@/context/LangContext'
import { TR } from '@/lib/translations'

export default function PricingCards() {
  const { lang, currency } = useLang()
  const t = TR[lang]
  const [loading, setLoading] = useState<string | null>(null)

  async function handleCheckout(plan: 'basic' | 'pro') {
    setLoading(plan)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, currency }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        alert('Błąd płatności. Spróbuj ponownie.')
      }
    } catch {
      alert('Błąd płatności. Spróbuj ponownie.')
    }
    setLoading(null)
  }

  const basicPrice = currency === 'eur' ? '199 €' : '799 zł'
  const proPrice = currency === 'eur' ? '299 €' : '1 199 zł'

  function Card({ plan, price, features, recommended }: {
    plan: 'basic' | 'pro'
    price: string
    features: string[]
    recommended?: boolean
  }) {
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '20px',
        padding: '2rem',
        border: recommended ? '2px solid #2B7A78' : '1px solid #E5E7EB',
        boxShadow: recommended ? '0 8px 32px rgba(43,122,120,0.12)' : '0 2px 12px rgba(0,0,0,0.05)',
        position: 'relative',
        flex: '1',
        minWidth: '280px',
        maxWidth: '420px',
      }}>
        {recommended && (
          <div style={{
            position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)',
            backgroundColor: '#2B7A78', color: 'white',
            fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em',
            padding: '0.3rem 1rem', borderRadius: '100px',
            whiteSpace: 'nowrap',
          }}>
            {t.pricingRecommended}
          </div>
        )}

        <div style={{ marginBottom: '1.5rem' }}>
          <h3 style={{
            fontFamily: 'var(--font-cormorant), serif',
            fontSize: '1.4rem', fontWeight: 700,
            color: recommended ? '#2B7A78' : '#1A1A2E',
            marginBottom: '0.5rem',
          }}>
            Nobooking {plan === 'basic' ? 'Basic' : 'Pro'}
          </h3>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
            <span style={{ fontSize: '2.4rem', fontWeight: 800, color: '#1A1A2E', fontFamily: 'var(--font-cormorant), serif' }}>
              {price}
            </span>
            <span style={{ fontSize: '0.85rem', color: '#9CA3AF' }}>{t.pricingPeriod}</span>
          </div>
        </div>

        <p style={{ fontSize: '0.82rem', fontWeight: 600, color: '#6B7280', marginBottom: '0.75rem' }}>
          {t.pricingIncludes}
        </p>
        <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '2rem' }}>
          {features.map(f => (
            <li key={f} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', fontSize: '0.875rem', color: '#374151' }}>
              <span style={{ color: '#10B981', flexShrink: 0, marginTop: '1px' }}>✓</span>
              {f}
            </li>
          ))}
        </ul>

        <button
          onClick={() => handleCheckout(plan)}
          disabled={loading === plan}
          className={recommended ? 'btn-primary' : 'btn-outline'}
          style={{
            width: '100%',
            justifyContent: 'center',
            padding: '0.875rem',
            fontSize: '1rem',
            opacity: loading === plan ? 0.7 : 1,
          }}
        >
          {loading === plan ? '...' : plan === 'basic' ? t.pricingCtaBasic : t.pricingCtaPro}
        </button>
      </div>
    )
  }

  return (
    <section id="cennik" style={{ padding: '5rem 1.5rem', backgroundColor: '#fff' }}>
      <div className="container">
        <h2 className="section-title">{t.pricingTitle}</h2>

        <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '2rem' }}>
          <Card plan="basic" price={basicPrice} features={t.basicFeatures} />
          <Card plan="pro" price={proPrice} features={t.proFeatures} recommended />
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.82rem', color: '#9CA3AF', marginTop: '1.5rem' }}>
          {t.pricingRenewal}
        </p>
      </div>
    </section>
  )
}
