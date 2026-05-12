'use client'

import { useLang } from '@/context/LangContext'
import { TR } from '@/lib/translations'

export default function DemoCTA() {
  const { lang } = useLang()
  const t = TR[lang]
  const demoUrl = '/demo'

  function scrollToPricing() {
    document.getElementById('cennik')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section style={{
      background: 'var(--color-dark)',
      padding: 'clamp(4rem, 8vw, 6rem) 1.5rem',
      textAlign: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle grid background */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
        backgroundSize: '48px 48px',
      }}/>
      {/* Green glow */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 60% 50% at 50% 100%, rgba(5,150,105,0.18) 0%, transparent 70%)',
      }}/>

      <div style={{ maxWidth: '600px', margin: '0 auto', position: 'relative' }}>
        {/* Eyebrow */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
          background: 'rgba(5,150,105,0.15)',
          border: '1px solid rgba(5,150,105,0.25)',
          color: 'var(--color-accent)',
          fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
          padding: '0.3rem 0.875rem', borderRadius: 'var(--radius-pill)',
          marginBottom: '1.5rem',
        }}>
          {lang === 'pl' ? '🎯 Działa od razu po zakupie' : '🎯 Ready to go after purchase'}
        </div>

        <h2 style={{
          fontSize: 'clamp(1.9rem, 3.5vw, 2.75rem)',
          fontWeight: 800, letterSpacing: '-0.045em',
          color: 'white', marginBottom: '1rem', lineHeight: 1.08,
        }}>
          {lang === 'pl' ? 'Gotowy przestać\noddawać 17%?' : 'Ready to stop\ngiving away 17%?'}
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '1rem', marginBottom: '2.25rem', lineHeight: 1.65 }}>
          {t.demoText}
        </p>
        <div style={{ display: 'flex', gap: '0.875rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={scrollToPricing} style={{
            background: 'white', color: 'var(--color-dark)',
            border: 'none', borderRadius: 'var(--radius-pill)',
            padding: '0.9rem 2rem', fontSize: '0.95rem', fontWeight: 800,
            cursor: 'pointer', fontFamily: 'inherit',
            transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(0,0,0,0.4)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.3)'; }}>
            {lang === 'pl' ? 'Zamów — od 799 zł' : 'Order — from €199'}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
          <a href={demoUrl} style={{
            border: '1.5px solid rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.75)',
            borderRadius: 'var(--radius-pill)', padding: '0.875rem 1.75rem',
            fontSize: '0.95rem', fontWeight: 600, textDecoration: 'none',
            transition: 'border-color var(--transition-fast), color var(--transition-fast)',
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)'; e.currentTarget.style.color = 'white'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; e.currentTarget.style.color = 'rgba(255,255,255,0.75)'; }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            {t.demoCta}
          </a>
        </div>
      </div>
    </section>
  )
}
