'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

const STEPS = [
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
        <polyline points="22,6 12,13 2,6"/>
      </svg>
    ),
    text: 'Wkrótce dostaniesz od nas email z formularzem onboardingowym.',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
    text: 'Wypełnij formularz — opisz apartament, dodaj zdjęcia i ceny.',
  },
  {
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/>
        <polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    text: <>Zbudujemy Twoją stronę w ciągu <strong style={{ color: '#111827' }}>7 dni roboczych</strong>.</>,
  },
]

function SukcesContent() {
  const searchParams = useSearchParams()
  const plan = searchParams.get('plan') ?? 'basic'
  const planLabel = plan === 'pro' ? 'Nobooking Pro' : 'Nobooking Basic'

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F0FDF4',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '2rem',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background decoration */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(circle, #A7F3D0 1px, transparent 1px)',
        backgroundSize: '32px 32px',
        opacity: 0.45,
      }}/>

      <div className="animate-fade-up" style={{ textAlign: 'center', maxWidth: '520px', position: 'relative' }}>

        {/* Success icon */}
        <div style={{
          width: '80px', height: '80px',
          background: 'white',
          border: '3px solid var(--color-accent)',
          borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.75rem',
          boxShadow: '0 8px 32px rgba(5,150,105,0.25)',
        }}>
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        </div>

        <h1 style={{
          fontSize: 'clamp(1.75rem, 4vw, 2.25rem)', fontWeight: 800,
          letterSpacing: '-0.04em', marginBottom: '0.625rem', color: '#111827',
          lineHeight: 1.1,
        }}>
          Płatność przyjęta!
        </h1>

        {/* Plan badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
          background: 'var(--color-accent)', color: 'white',
          fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.05em',
          padding: '0.3rem 0.875rem', borderRadius: 'var(--radius-pill)',
          marginBottom: '2rem',
        }}>
          ✦ {planLabel}
        </div>

        {/* Steps card */}
        <div style={{
          background: 'white', border: '1px solid var(--color-accent-border)',
          borderRadius: 'var(--radius-xl)', padding: '1.75rem 2rem',
          textAlign: 'left', marginBottom: '2rem',
          boxShadow: '0 4px 24px rgba(5,150,105,0.08)',
        }}>
          <p style={{ fontWeight: 800, marginBottom: '1.25rem', color: '#111827', fontSize: '0.95rem' }}>
            Co teraz?
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {STEPS.map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: '0.875rem', alignItems: 'flex-start' }}>
                {/* Step number + icon */}
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: 'var(--color-accent-light)', color: 'var(--color-accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {step.icon}
                </div>
                <div style={{ paddingTop: '0.5rem' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--color-accent)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                    Krok {i + 1}
                  </span>
                  <p style={{ color: '#374151', fontSize: '0.875rem', lineHeight: 1.65, marginTop: '0.15rem' }}>
                    {step.text}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <a href="/" style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.375rem',
          fontSize: '0.875rem', color: 'var(--color-text-muted)', textDecoration: 'none',
          transition: 'color var(--transition-fast)',
        }}
        onMouseEnter={e => e.currentTarget.style.color = 'var(--color-text)'}
        onMouseLeave={e => e.currentTarget.style.color = 'var(--color-text-muted)'}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
          Wróć na stronę główną
        </a>
      </div>
    </div>
  )
}

export default function SukcesPage() {
  return (
    <Suspense>
      <SukcesContent />
    </Suspense>
  )
}
