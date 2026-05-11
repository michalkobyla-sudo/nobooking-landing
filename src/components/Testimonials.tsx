'use client'

import { useLang } from '@/context/LangContext'
import { TR } from '@/lib/translations'

export default function Testimonials() {
  const { lang } = useLang()
  const t = TR[lang]

  return (
    <section className="section-wrap section-wrap--alt">
      <div className="container">
        <div className="section-label">{lang === 'pl' ? 'Opinie klientów' : 'Customer reviews'}</div>
        <h2 className="section-title">{t.testimonialsTitle}</h2>

        <div className="grid-3col" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem' }}>
          {t.testimonials.map((item, i) => (
            <div key={i} style={{
              background: 'white',
              border: '1px solid var(--color-border-light)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              display: 'flex',
              flexDirection: 'column',
            }}>
              <div style={{ color: '#F59E0B', fontSize: '0.9rem', marginBottom: '0.875rem', letterSpacing: '0.05em' }}>
                ★★★★★
              </div>
              <p style={{
                fontSize: '0.875rem', color: '#374151', lineHeight: 1.7,
                fontStyle: 'italic', marginBottom: '1.25rem', flex: 1,
              }}>
                &ldquo;{item.text}&rdquo;
              </p>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{item.author}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-faint)', marginTop: '0.1rem' }}>{item.location}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
