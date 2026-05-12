'use client'

import { useLang } from '@/context/LangContext'
import { TR } from '@/lib/translations'

// Unique avatar colors per testimonial
const AVATAR_COLORS = [
  { bg: '#DBEAFE', text: '#1D4ED8' },
  { bg: '#FCE7F3', text: '#BE185D' },
  { bg: '#D1FAE5', text: '#065F46' },
]

function Stars() {
  return (
    <div style={{ display: 'flex', gap: '2px', marginBottom: '1rem' }}>
      {[1,2,3,4,5].map(i => (
        <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill="#F59E0B" stroke="none">
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/>
        </svg>
      ))}
    </div>
  )
}

export default function Testimonials() {
  const { lang } = useLang()
  const t = TR[lang]

  return (
    <section className="section-wrap section-wrap--alt">
      <div className="container">
        <div className="section-label">{lang === 'pl' ? 'Opinie klientów' : 'Customer reviews'}</div>
        <h2 className="section-title">{t.testimonialsTitle}</h2>

        <div className="grid-3col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
          {t.testimonials.map((item, i) => {
            const avatar = AVATAR_COLORS[i % AVATAR_COLORS.length]
            const initials = item.author.split(' ').map((w: string) => w[0]).join('').slice(0, 2)
            return (
              <div key={i} style={{
                background: 'white',
                border: '1px solid var(--color-border-light)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.625rem',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: 'var(--shadow-sm)',
              }}>
                <Stars/>

                {/* Quote mark */}
                <div style={{ fontSize: '2.5rem', lineHeight: 1, color: 'var(--color-accent-border)', fontFamily: 'Georgia, serif', marginBottom: '0.25rem', marginTop: '-0.5rem' }}>
                  "
                </div>

                <p style={{
                  fontSize: '0.875rem', color: '#374151', lineHeight: 1.75,
                  marginBottom: '1.5rem', flex: 1,
                }}>
                  {item.text}
                </p>

                {/* Author row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', borderTop: '1px solid var(--color-border-light)', paddingTop: '1rem' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: avatar.bg, color: avatar.text,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.72rem', fontWeight: 800, flexShrink: 0,
                  }}>
                    {initials}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, lineHeight: 1.2 }}>{item.author}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-faint)', marginTop: '0.1rem' }}>{item.location}</div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
