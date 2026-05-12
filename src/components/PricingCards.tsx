'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/context/LangContext'
import { TR } from '@/lib/translations'

function CheckMark({ dark }: { dark?: boolean }) {
  return (
    <span style={{
      width: '18px', height: '18px', borderRadius: '50%',
      background: dark ? 'rgba(255,255,255,0.15)' : 'var(--color-accent-light)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px',
    }}>
      <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
        <polyline points="2,6.5 5,9.5 10,3" stroke={dark ? 'rgba(255,255,255,0.9)' : 'var(--color-accent)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </span>
  )
}

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
          <div style={{
            display: 'flex', background: 'var(--color-bg-alt)',
            border: '1px solid var(--color-border)', borderRadius: 'var(--radius-pill)',
            padding: '4px', gap: '4px',
          }}>
            {(['pln', 'eur'] as const).map(c => (
              <button key={c} onClick={() => setCurrency(c)} style={{
                padding: '0.4rem 1.375rem', borderRadius: 'var(--radius-pill)',
                border: 'none', fontFamily: 'inherit', fontSize: '0.82rem', fontWeight: 700,
                cursor: 'pointer', transition: 'all var(--transition-fast)',
                background: currency === c ? 'var(--color-dark)' : 'transparent',
                color: currency === c ? 'white' : 'var(--color-text-muted)',
              }}>
                {c === 'pln' ? 'PLN zł' : 'EUR €'}
              </button>
            ))}
          </div>
        </div>

        {/* Cards */}
        <div className="grid-2col" style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr',
          gap: '1.25rem', maxWidth: '780px', margin: '0 auto',
          alignItems: 'start',
        }}>
          {/* Basic */}
          <div style={{
            border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-xl)',
            padding: '2rem', display: 'flex', flexDirection: 'column',
            background: 'white',
          }}>
            <div style={{
              fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: 'var(--color-text-muted)', marginBottom: '0.875rem',
            }}>
              Basic
            </div>
            <div style={{ marginBottom: '0.375rem' }}>
              <span style={{ fontSize: '2.75rem', fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 1 }}>
                {prices.basic}
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--color-text-faint)', marginBottom: '1.875rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              {t.pricingPeriod} · {lang === 'pl' ? 'jednorazowo' : 'one-time'}
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '1.875rem', flex: 1 }}>
              {t.basicFeatures.map((f, i) => (
                <li key={i} style={{ fontSize: '0.85rem', color: '#374151', display: 'flex', alignItems: 'flex-start', gap: '0.6rem', lineHeight: 1.4 }}>
                  <CheckMark/>
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleBuy('basic')}
              disabled={loading !== null}
              style={{
                width: '100%', padding: '0.875rem',
                background: 'white', border: '1.5px solid var(--color-border)',
                color: 'var(--color-text)', borderRadius: 'var(--radius-md)',
                fontSize: '0.925rem', fontWeight: 700, fontFamily: 'inherit',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading && loading !== 'basic' ? 0.45 : 1,
                transition: 'border-color var(--transition-fast), background var(--transition-fast)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
              }}
              onMouseEnter={e => { if (!loading) { e.currentTarget.style.borderColor = 'var(--color-text)'; e.currentTarget.style.background = 'var(--color-bg-alt)'; }}}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.background = 'white'; }}>
              {loading === 'basic' ? <><span className="spinner" style={{ borderTopColor: 'var(--color-text)', borderColor: 'var(--color-border)' }}/> {lang === 'pl' ? 'Przekierowanie...' : 'Redirecting...'}</> : t.pricingCtaBasic}
            </button>
          </div>

          {/* Pro — highlighted */}
          <div style={{
            border: '2px solid var(--color-dark)', borderRadius: 'var(--radius-xl)',
            padding: '2rem', position: 'relative', display: 'flex', flexDirection: 'column',
            background: 'var(--color-dark)',
            boxShadow: '0 16px 48px rgba(0,0,0,0.18)',
          }}>
            {/* Badge */}
            <div style={{
              position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)',
              background: 'var(--color-accent)', color: 'white',
              fontSize: '0.65rem', fontWeight: 800, padding: '0.2rem 0.875rem',
              borderRadius: 'var(--radius-pill)', letterSpacing: '0.07em', whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(5,150,105,0.35)',
            }}>
              ✦ {t.pricingRecommended}
            </div>

            <div style={{
              fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)', marginBottom: '0.875rem',
            }}>
              Pro
            </div>
            <div style={{ marginBottom: '0.375rem' }}>
              <span style={{ fontSize: '2.75rem', fontWeight: 800, letterSpacing: '-0.05em', lineHeight: 1, color: 'white' }}>
                {prices.pro}
              </span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.35)', marginBottom: '1.875rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              {t.pricingPeriod} · {lang === 'pl' ? 'jednorazowo' : 'one-time'}
            </div>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.625rem', marginBottom: '1.875rem', flex: 1 }}>
              {t.proFeatures.map((f, i) => (
                <li key={i} style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)', display: 'flex', alignItems: 'flex-start', gap: '0.6rem', lineHeight: 1.4 }}>
                  <CheckMark dark/>
                  {f}
                </li>
              ))}
            </ul>
            <button
              onClick={() => handleBuy('pro')}
              disabled={loading !== null}
              style={{
                width: '100%', padding: '0.875rem',
                background: 'var(--color-accent)', border: 'none',
                color: 'white', borderRadius: 'var(--radius-md)',
                fontSize: '0.925rem', fontWeight: 700, fontFamily: 'inherit',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading && loading !== 'pro' ? 0.45 : 1,
                transition: 'opacity var(--transition-fast), transform var(--transition-fast)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem',
                boxShadow: '0 4px 16px rgba(5,150,105,0.35)',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.opacity = '0.9'; }}
              onMouseLeave={e => { e.currentTarget.style.opacity = '1'; }}>
              {loading === 'pro' ? <><span className="spinner"/> {lang === 'pl' ? 'Przekierowanie...' : 'Redirecting...'}</> : t.pricingCtaPro}
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
