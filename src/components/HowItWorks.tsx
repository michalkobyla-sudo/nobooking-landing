'use client'

import { useLang } from '@/context/LangContext'
import { TR } from '@/lib/translations'

const STEP_ICONS = [
  // Step 1 — configure site (settings sliders)
  <svg key="1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="6" x2="20" y2="6"/>
    <line x1="4" y1="12" x2="20" y2="12"/>
    <line x1="4" y1="18" x2="20" y2="18"/>
    <circle cx="9" cy="6" r="2" fill="currentColor" stroke="none"/>
    <circle cx="15" cy="12" r="2" fill="currentColor" stroke="none"/>
    <circle cx="10" cy="18" r="2" fill="currentColor" stroke="none"/>
  </svg>,
  // Step 2 — share link (link/chain)
  <svg key="2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>,
  // Step 3 — receive money (credit card / payment)
  <svg key="3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
    <line x1="1" y1="10" x2="23" y2="10"/>
    <rect x="4" y="14" width="4" height="2" rx="1" fill="currentColor" stroke="none"/>
  </svg>,
]

export default function HowItWorks() {
  const { lang } = useLang()
  const t = TR[lang]

  const steps = [
    { num: '01', title: t.howStep1Title, desc: t.howStep1Desc },
    { num: '02', title: t.howStep2Title, desc: t.howStep2Desc },
    { num: '03', title: t.howStep3Title, desc: t.howStep3Desc },
  ]

  return (
    <section id="jak-dziala" className="section-wrap section-wrap--alt">
      <div className="container">
        <div className="section-label">{lang === 'pl' ? 'Jak to działa' : 'How it works'}</div>
        <h2 className="section-title">{t.howTitle}</h2>
        <p className="section-sub">
          {lang === 'pl' ? 'Bez kodowania, bez agencji, bez miesięcznych abonamentów.' : 'No coding, no agencies, no monthly subscriptions.'}
        </p>

        {/* Steps with connectors */}
        <div className="grid-3col" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '0',
          alignItems: 'start',
          position: 'relative',
        }}>
          {steps.map((step, i) => (
            <div key={step.num} style={{ position: 'relative', textAlign: 'center', padding: '0 1.5rem 0' }}>
              {/* Connector arrow between steps (not after last) */}
              {i < steps.length - 1 && (
                <div className="hide-mobile" aria-hidden style={{
                  position: 'absolute',
                  top: '28px',
                  right: '-8px',
                  zIndex: 2,
                  display: 'flex', alignItems: 'center',
                }}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ opacity: 0.4 }}>
                    <polyline points="4 3 12 8 4 13" stroke="var(--color-text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              )}
              {/* Dashed line connector */}
              {i < steps.length - 1 && (
                <div className="hide-mobile" aria-hidden style={{
                  position: 'absolute',
                  top: '35px',
                  left: 'calc(50% + 28px)',
                  right: '-2px',
                  height: '1px',
                  borderTop: '1.5px dashed var(--color-border)',
                  zIndex: 1,
                }}/>
              )}

              {/* Icon circle */}
              <div style={{
                width: '56px', height: '56px',
                background: 'white',
                border: '2px solid var(--color-border)',
                borderRadius: '14px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1.5rem',
                position: 'relative', zIndex: 3,
                boxShadow: 'var(--shadow-sm)',
                color: 'var(--color-accent)',
              }}>
                <div style={{ width: '24px', height: '24px' }}>
                  {STEP_ICONS[i]}
                </div>
                {/* Step number badge */}
                <div style={{
                  position: 'absolute', top: '-8px', right: '-8px',
                  width: '20px', height: '20px',
                  background: 'var(--color-dark)', color: 'white',
                  borderRadius: '50%', fontSize: '0.6rem', fontWeight: 800,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '2px solid var(--color-bg-alt)',
                  letterSpacing: '-0.01em',
                }}>
                  {i + 1}
                </div>
              </div>

              <div style={{ fontSize: '0.62rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--color-text-faint)', marginBottom: '0.5rem' }}>
                {step.num}
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.625rem', letterSpacing: '-0.02em' }}>
                {step.title}
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.68 }}>
                {step.desc}
              </p>
            </div>
          ))}
        </div>

        {/* Demo links */}
        <div style={{ display: 'flex', gap: '0.875rem', justifyContent: 'center', marginTop: '3.5rem', flexWrap: 'wrap' }}>
          <a href="/demo" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-pill)',
            padding: '0.7rem 1.375rem', fontSize: '0.875rem', fontWeight: 600,
            color: 'var(--color-text)', textDecoration: 'none', background: 'white',
            transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
            boxShadow: 'var(--shadow-sm)',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-text)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            {lang === 'pl' ? 'Demo strony apartamentu' : 'Apartment site demo'}
          </a>
          <a href="/admin/demo/zamowienia" style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            border: '1.5px solid var(--color-border)', borderRadius: 'var(--radius-pill)',
            padding: '0.7rem 1.375rem', fontSize: '0.875rem', fontWeight: 600,
            color: 'var(--color-text)', textDecoration: 'none', background: 'white',
            transition: 'border-color var(--transition-fast), box-shadow var(--transition-fast)',
            boxShadow: 'var(--shadow-sm)',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-text)'; e.currentTarget.style.boxShadow = 'var(--shadow-md)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
            {lang === 'pl' ? 'Demo panelu admina' : 'Admin panel demo'}
          </a>
        </div>
      </div>
    </section>
  )
}
