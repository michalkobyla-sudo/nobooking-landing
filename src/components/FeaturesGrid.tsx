'use client'

import { useLang } from '@/context/LangContext'
import { TR } from '@/lib/translations'

export default function FeaturesGrid() {
  const { lang } = useLang()
  const t = TR[lang]

  return (
    <section style={{ padding: '5rem 1.5rem', backgroundColor: '#fff' }}>
      <div className="container">
        <h2 className="section-title">{t.featuresTitle}</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.25rem' }}>
          {t.features.map(f => (
            <div key={f.title} style={{
              backgroundColor: '#F8F9FA', borderRadius: '14px',
              padding: '1.25rem', border: '1px solid #E5E7EB',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'
                ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.transform = 'none'
                ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'none'
              }}
            >
              <div style={{ fontSize: '1.75rem', marginBottom: '0.6rem' }}>{f.icon}</div>
              <h3 style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.35rem', color: '#1A1A2E' }}>{f.title}</h3>
              <p style={{ fontSize: '0.78rem', color: '#6B7280', lineHeight: 1.5 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
