'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/context/LangContext'
import { TR } from '@/lib/translations'

export default function PricingCards() {
  const { lang, currency, setCurrency } = useLang()
  const t = TR[lang]
  const router = useRouter()
  const [loading, setLoading] = useState<'basic' | 'pro' | null>(null)

  function handleBuy(plan: 'basic' | 'pro') {
    setLoading(plan)
    router.push(`/zamow?plan=${plan}&currency=${currency}`)
  }

  const prices = {
    basic: currency === 'eur' ? '199 €' : '799 zł',
    pro: currency === 'eur' ? '299 €' : '1 199 zł',
  }

  return (
    <section id="cennik" className="section-wrap">
      <div className="container">
        <div className="section-label">{lang === 'pl' ? 'Cennik' : 'Pricing'}</div>
        <h2 className="section-title">{t.pricingTitle}</h2>
        <p className="section-sub">
          {lang === 'pl' ? 'Płacisz raz, korzystasz przez 2 lata. Żadnych subskrypcji, żadnych prowizji.' : 'Pay once, use for 2 years. No subscriptions, no commissions.'}
        </p>

        {/* Currency toggle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2.5rem' }}>
          <div style={{ display: 'flex', background: 'var(--color-bg-alt)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-pill)', padding: '4px', gap: '4px' }}>
            {(['pln', 'eur'] as const).map(c => (
              <button key={c} onClick={() => setCurrency(c)} style={{
                padding: '0.4rem 1.25rem', borderRadius: 'var(--radius-pill)',
                border: 'none', fontFamily: 'inherit', fontSize: '0.875rem', fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.15s',
                background: currency === c ? 'var(--color-dark)' : 'transparent',
                color: currency === c ? 'white' : 'var(--color-text-muted)',
              }}>
                {c === 'pln' ? 'PLN zł' : 'EUR €'}
              </button>
            ))}
          </div>
        </div>

        {/* Cards */}
        <div className="grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', maxWidth: '760px', margin: '0 auto' }}>
          {/* Basic */}
          <div style={{ border: '2px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: '2rem', display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
              Basic
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: '0.25rem' }}>
              {prices.basic}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-faint)', marginBottom: '1.75rem' }}>
              {t.pricingPeriod} · {lang === 'pl' ? 'jednorazowo' : 'one-time'}
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.75rem', flex: 1 }}>
              {t.basicFeatures.map((f, i) => (
                <li key={i} style={{ fontSize: '0.85rem', color: '#374151', display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                  <span style={{
                    width: '18px', height: '18px', borderRadius: '50%',
                    background: 'var(--color-accent-light)', color: 'var(--color-accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.6rem', fontWeight: 900, flexShrink: 0, marginTop: '1px',
                  }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleBuy('basic')}
              disabled={loading !== null}
              style={{
                width: '100%', padding: '0.875rem',
                background: 'white', border: '2px solid var(--color-border)',
                color: 'var(--color-text)', borderRadius: 'var(--radius-md)',
                fontSize: '0.95rem', fontWeight: 700, fontFamily: 'inherit',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading && loading !== 'basic' ? 0.5 : 1,
              }}>
              {loading === 'basic' ? '...' : t.pricingCtaBasic}
            </button>
          </div>

          {/* Pro */}
          <div style={{ border: '2px solid var(--color-dark)', borderRadius: 'var(--radius-xl)', padding: '2rem', position: 'relative', display: 'flex', flexDirection: 'column' }}>
            <div style={{
              position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)',
              background: 'var(--color-dark)', color: 'white',
              fontSize: '0.7rem', fontWeight: 700, padding: '0.2rem 0.875rem',
              borderRadius: 'var(--radius-pill)', letterSpacing: '0.06em', whiteSpace: 'nowrap',
            }}>
              ⭐ {t.pricingRecommended}
            </div>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.75rem' }}>
              Pro
            </div>
            <div style={{ fontSize: '2.5rem', fontWeight: 800, letterSpacing: '-0.04em', marginBottom: '0.25rem' }}>
              {prices.pro}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-faint)', marginBottom: '1.75rem' }}>
              {t.pricingPeriod} · {lang === 'pl' ? 'jednorazowo' : 'one-time'}
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.75rem', flex: 1 }}>
              {t.proFeatures.map((f, i) => (
                <li key={i} style={{ fontSize: '0.85rem', color: '#374151', display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
                  <span style={{
                    width: '18px', height: '18px', borderRadius: '50%',
                    background: 'var(--color-accent-light)', color: 'var(--color-accent)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.6rem', fontWeight: 900, flexShrink: 0, marginTop: '1px',
                  }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleBuy('pro')}
              disabled={loading !== null}
              style={{
                width: '100%', padding: '0.875rem',
                background: 'var(--color-dark)', border: '2px solid var(--color-dark)',
                color: 'white', borderRadius: 'var(--radius-md)',
                fontSize: '0.95rem', fontWeight: 700, fontFamily: 'inherit',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading && loading !== 'pro' ? 0.5 : 1,
              }}>
              {loading === 'pro' ? '...' : t.pricingCtaPro}
            </button>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--color-text-faint)', marginTop: '1.5rem' }}>
          {t.pricingRenewal}
        </p>
      </div>
    </section>
  )
}
