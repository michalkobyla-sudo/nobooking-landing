'use client'

import { useLang } from '@/context/LangContext'
import { TR } from '@/lib/translations'

// Clean, thin-stroke custom icons per feature
const ICONS = [
  // Calendar / availability
  <svg key="cal" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/>
    <line x1="8" y1="2" x2="8" y2="6"/>
    <line x1="3" y1="10" x2="21" y2="10"/>
    <line x1="8" y1="14" x2="8" y2="14" strokeWidth="2.5"/>
    <line x1="12" y1="14" x2="12" y2="14" strokeWidth="2.5"/>
    <line x1="16" y1="14" x2="16" y2="14" strokeWidth="2.5"/>
    <line x1="8" y1="18" x2="8" y2="18" strokeWidth="2.5"/>
    <line x1="12" y1="18" x2="12" y2="18" strokeWidth="2.5"/>
  </svg>,
  // Stripe payments
  <svg key="card" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="5" width="20" height="14" rx="2"/>
    <line x1="2" y1="10" x2="22" y2="10"/>
    <rect x="5" y="14" width="3" height="1.5" rx="0.5" fill="currentColor" stroke="none"/>
    <rect x="10" y="14" width="5" height="1.5" rx="0.5" fill="currentColor" stroke="none" opacity="0.4"/>
  </svg>,
  // Admin panel / dashboard
  <svg key="admin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="9" rx="1"/>
    <rect x="14" y="3" width="7" height="5" rx="1"/>
    <rect x="14" y="12" width="7" height="9" rx="1"/>
    <rect x="3" y="16" width="7" height="5" rx="1"/>
  </svg>,
  // Guest communication / email
  <svg key="mail" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
    <polyline points="22,6 12,13 2,6"/>
  </svg>,
  // Notifications
  <svg key="bell" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
  </svg>,
  // Custom domain / globe
  <svg key="globe" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>,
]

// Varied accent colors per card to avoid monotony
const CARD_ACCENTS = [
  { bg: '#ECFDF5', stroke: '#059669' },  // green
  { bg: '#EEF2FF', stroke: '#6366F1' },  // indigo
  { bg: '#FFF7ED', stroke: '#EA580C' },  // orange
  { bg: '#F0F9FF', stroke: '#0284C7' },  // sky
  { bg: '#FDF4FF', stroke: '#9333EA' },  // purple
  { bg: '#FAFAFA', stroke: '#374151' },  // neutral
]

export default function FeaturesGrid() {
  const { lang } = useLang()
  const t = TR[lang]
  const features = t.features.slice(0, 6)

  return (
    <section id="funkcje" className="section-wrap">
      <div className="container">
        <div className="section-label">{lang === 'pl' ? 'Co dostajesz' : 'What you get'}</div>
        <h2 className="section-title">{t.featuresTitle}</h2>
        <p className="section-sub">
          {lang === 'pl' ? 'Kompletny system rezerwacji — nie musisz znać się na technologii.' : 'Complete booking system — no tech skills needed.'}
        </p>

        <div className="grid-3col" style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1rem',
        }}>
          {features.map((feature, i) => {
            const accent = CARD_ACCENTS[i]
            return (
              <div
                key={i}
                style={{
                  background: 'white',
                  border: '1px solid var(--color-border-light)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.625rem',
                  transition: 'border-color var(--transition-base), box-shadow var(--transition-base), transform var(--transition-base)',
                  cursor: 'default',
                  display: 'flex',
                  flexDirection: 'column',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.borderColor = accent.stroke + '33'
                  e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.06)'
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.borderColor = 'var(--color-border-light)'
                  e.currentTarget.style.boxShadow = 'none'
                  e.currentTarget.style.transform = 'translateY(0)'
                }}
              >
                {/* Icon box with per-card color */}
                <div style={{
                  width: '44px', height: '44px',
                  background: accent.bg,
                  borderRadius: '12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '1.125rem',
                  color: accent.stroke,
                  flexShrink: 0,
                }}>
                  <div style={{ width: '22px', height: '22px' }}>
                    {ICONS[i]}
                  </div>
                </div>
                <h3 style={{ fontSize: '0.93rem', fontWeight: 700, marginBottom: '0.4rem', letterSpacing: '-0.01em' }}>
                  {feature.title}
                </h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', lineHeight: 1.68, flex: 1 }}>
                  {feature.desc}
                </p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
