'use client'

import { useLang } from '@/context/LangContext'
import { TR } from '@/lib/translations'

export default function DemoCTA() {
  const { lang } = useLang()
  const t = TR[lang]
  const demoUrl = process.env.NEXT_PUBLIC_DEMO_URL || 'https://demo.nobooking.eu'

  function scrollToPricing() {
    document.getElementById('cennik')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section style={{ background: 'var(--color-dark)', padding: '5rem 1.5rem', textAlign: 'center' }}>
      <div style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h2 style={{
          fontSize: 'clamp(1.8rem, 3vw, 2.5rem)',
          fontWeight: 800, letterSpacing: '-0.04em',
          color: 'white', marginBottom: '1rem', lineHeight: 1.1,
        }}>
          {lang === 'pl' ? 'Gotowy przestać oddawać 17%?' : 'Ready to stop giving away 17%?'}
        </h2>
        <p style={{ color: 'var(--color-text-faint)', fontSize: '1rem', marginBottom: '2rem', lineHeight: 1.6 }}>
          {t.demoText}
        </p>
        <div style={{ display: 'flex', gap: '0.875rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={scrollToPricing} style={{
            background: 'white', color: 'var(--color-dark)',
            border: 'none', borderRadius: 'var(--radius-pill)',
            padding: '0.875rem 2rem', fontSize: '1rem', fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {lang === 'pl' ? 'Zamów stronę — od 799 zł →' : 'Order site — from €199 →'}
          </button>
          <a href={demoUrl} target="_blank" rel="noopener noreferrer" style={{
            border: '2px solid rgba(255,255,255,0.25)', color: 'rgba(255,255,255,0.8)',
            borderRadius: 'var(--radius-pill)', padding: '0.825rem 1.875rem',
            fontSize: '1rem', fontWeight: 600, textDecoration: 'none',
            transition: 'border-color 0.2s',
          }}>
            {t.demoCta}
          </a>
        </div>
      </div>
    </section>
  )
}
