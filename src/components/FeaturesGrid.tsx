'use client'

import { useLang } from '@/context/LangContext'
import { TR } from '@/lib/translations'

const ICONS = [
  // Calendar
  <svg key="cal" viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  // Credit card
  <svg key="card" viewBox="0 0 24 24"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
  // Settings/admin
  <svg key="admin" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>,
  // User
  <svg key="user" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>,
  // Bell
  <svg key="bell" viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  // Globe
  <svg key="globe" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>,
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

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '1.5rem',
        }}>
          {features.map((feature, i) => (
            <div key={i} style={{
              background: 'var(--color-bg-alt)',
              border: '1px solid var(--color-border-light)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.75rem',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              cursor: 'default',
              display: 'flex',
              flexDirection: 'column',
            }}
              onMouseEnter={e => {
                e.currentTarget.style.borderColor = 'var(--color-accent-border)'
                e.currentTarget.style.boxShadow = '0 4px 24px rgba(5,150,105,0.08)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.borderColor = 'var(--color-border-light)'
                e.currentTarget.style.boxShadow = 'none'
              }}>
              <div className="icon-box" style={{ marginBottom: '1rem' }}>
                {ICONS[i]}
              </div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: '0.4rem' }}>
                {feature.title}
              </h3>
              <p style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)', lineHeight: 1.65, flex: 1 }}>
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
