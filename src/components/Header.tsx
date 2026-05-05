'use client'

import { useLang } from '@/context/LangContext'
import { TR } from '@/lib/translations'

export default function Header() {
  const { lang, currency, setLang, setCurrency } = useLang()
  const t = TR[lang]
  const demoUrl = process.env.NEXT_PUBLIC_DEMO_URL || 'https://demo.nobooking.eu'

  function scrollToPricing() {
    document.getElementById('cennik')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <header style={{
      position: 'sticky', top: 0, zIndex: 100,
      backgroundColor: 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(8px)',
      borderBottom: '1px solid #E5E7EB',
    }}>
      <div className="container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px', gap: '1rem' }}>
        {/* Logo */}
        <a href="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
          <span style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '1.5rem', lineHeight: 1 }}>
            <span style={{ color: '#2B7A78', fontWeight: 700 }}>No</span>
            <span style={{ color: '#1A1A2E', fontWeight: 400 }}>booking</span>
          </span>
        </a>

        {/* Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Lang toggle */}
          <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1px solid #E5E7EB' }}>
            {(['pl', 'en'] as const).map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                style={{
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: lang === l ? '#2B7A78' : 'white',
                  color: lang === l ? 'white' : '#6B7280',
                  transition: 'all 0.15s',
                  textTransform: 'uppercase',
                }}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Currency toggle */}
          <div style={{ display: 'flex', borderRadius: '8px', overflow: 'hidden', border: '1px solid #E5E7EB' }}>
            {(['pln', 'eur'] as const).map(c => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                style={{
                  padding: '0.35rem 0.65rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: currency === c ? '#2B7A78' : 'white',
                  color: currency === c ? 'white' : '#6B7280',
                  transition: 'all 0.15s',
                  textTransform: 'uppercase',
                }}
              >
                {c === 'pln' ? 'PLN' : 'EUR'}
              </button>
            ))}
          </div>

          {/* Demo button */}
          <a href={demoUrl} target="_blank" rel="noopener noreferrer" className="btn-outline" style={{ padding: '0.45rem 1rem', fontSize: '0.875rem' }}>
            {t.demo}
          </a>

          {/* Buy button */}
          <button onClick={scrollToPricing} className="btn-primary" style={{ padding: '0.45rem 1rem', fontSize: '0.875rem' }}>
            {t.buyNow}
          </button>
        </div>
      </div>
    </header>
  )
}
