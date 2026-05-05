'use client'

import { useLang } from '@/context/LangContext'
import { TR } from '@/lib/translations'

export default function DemoCTA() {
  const { lang } = useLang()
  const t = TR[lang]
  const demoUrl = process.env.NEXT_PUBLIC_DEMO_URL || 'https://demo.nobooking.eu'

  return (
    <section style={{ padding: '5rem 1.5rem', backgroundColor: '#1A4A48' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto', textAlign: 'center' }}>
        <p style={{ fontSize: 'clamp(1.1rem, 2.5vw, 1.35rem)', color: '#B2D8D7', lineHeight: 1.7, marginBottom: '2rem' }}>
          {t.demoText}
        </p>
        <a
          href={demoUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            backgroundColor: 'white',
            color: '#1A4A48',
            padding: '0.875rem 2.5rem',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '1.05rem',
            textDecoration: 'none',
            transition: 'transform 0.2s, box-shadow 0.2s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLAnchorElement).style.transform = 'translateY(-2px)'
            ;(e.currentTarget as HTMLAnchorElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.2)'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLAnchorElement).style.transform = 'none'
            ;(e.currentTarget as HTMLAnchorElement).style.boxShadow = 'none'
          }}
        >
          {t.demoCta}
        </a>
      </div>
    </section>
  )
}
