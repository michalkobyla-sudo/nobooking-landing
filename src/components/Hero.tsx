'use client'

import { useLang } from '@/context/LangContext'
import { TR } from '@/lib/translations'

export default function Hero() {
  const { lang } = useLang()
  const t = TR[lang]
  const demoUrl = process.env.NEXT_PUBLIC_DEMO_URL || 'https://demo.nobooking.eu'

  function scrollToPricing() {
    document.getElementById('cennik')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section style={{
      background: 'linear-gradient(135deg, #F0FAF9 0%, #FAFAF8 60%, #F3F4F6 100%)',
      padding: 'clamp(4rem, 10vw, 7rem) 1.5rem',
      textAlign: 'center',
    }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <div style={{
          display: 'inline-block',
          backgroundColor: '#E6F4F1',
          color: '#2B7A78',
          fontSize: '0.8rem',
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          padding: '0.35rem 1rem',
          borderRadius: '100px',
          marginBottom: '1.5rem',
        }}>
          nobooking.eu
        </div>

        <h1 style={{
          fontFamily: 'var(--font-cormorant), serif',
          fontSize: 'clamp(2.4rem, 6vw, 4rem)',
          fontWeight: 700,
          lineHeight: 1.15,
          color: '#1A1A2E',
          marginBottom: '1.5rem',
          whiteSpace: 'pre-line',
        }}>
          {t.heroH1}
        </h1>

        <p style={{
          fontSize: 'clamp(1rem, 2vw, 1.2rem)',
          color: '#4B5563',
          lineHeight: 1.7,
          marginBottom: '2.5rem',
          maxWidth: '560px',
          margin: '0 auto 2.5rem',
        }}>
          {t.heroSub}
        </p>

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={scrollToPricing} className="btn-primary" style={{ fontSize: '1.05rem', padding: '0.875rem 2rem' }}>
            {t.heroPrimary}
          </button>
          <a href={demoUrl} target="_blank" rel="noopener noreferrer" className="btn-outline" style={{ fontSize: '1.05rem', padding: '0.875rem 2rem' }}>
            {t.heroSecondary}
          </a>
        </div>
      </div>
    </section>
  )
}
