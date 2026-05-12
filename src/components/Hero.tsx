'use client'

import { useLang } from '@/context/LangContext'
import { TR } from '@/lib/translations'

export default function Hero() {
  const { lang } = useLang()
  const t = TR[lang]
  const demoUrl = '/demo'

  function scrollToPricing() {
    document.getElementById('cennik')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <section style={{
      background: 'var(--color-bg-alt)',
      borderBottom: '1px solid var(--color-border-light)',
      padding: 'clamp(4rem, 8vw, 6.5rem) 1.5rem',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Subtle dot grid background */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'radial-gradient(circle, #D1D5DB 1px, transparent 1px)',
        backgroundSize: '28px 28px',
        opacity: 0.55,
      }}/>
      {/* Gradient fade over dots */}
      <div aria-hidden style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 70% 60% at 50% 0%, rgba(236,253,245,0.7) 0%, transparent 70%)',
      }}/>

      <div style={{
        maxWidth: '1100px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: '1.15fr 1fr',
        gap: '3.5rem',
        alignItems: 'center',
        position: 'relative',
      }} className="grid-hero">

        {/* LEFT: Text */}
        <div className="animate-fade-up">
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            background: 'white',
            border: '1px solid var(--color-accent-border)',
            color: 'var(--color-accent)', fontSize: '0.72rem', fontWeight: 700,
            letterSpacing: '0.07em', textTransform: 'uppercase',
            padding: '0.35rem 0.875rem', borderRadius: 'var(--radius-pill)',
            marginBottom: '1.75rem',
            boxShadow: '0 1px 4px rgba(5,150,105,0.10)',
          }}>
            {/* House icon */}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            {lang === 'pl' ? 'Dla właścicieli apartamentów wakacyjnych' : 'For vacation apartment owners'}
          </div>

          {/* H1 */}
          <h1 style={{
            fontSize: 'clamp(2.6rem, 4.8vw, 3.8rem)',
            fontWeight: 800,
            lineHeight: 1.04,
            letterSpacing: '-0.045em',
            color: 'var(--color-text)',
            marginBottom: '1.375rem',
            whiteSpace: 'pre-line',
          }}>
            {t.heroH1}
          </h1>

          {/* Sub */}
          <p style={{
            fontSize: '1.05rem',
            color: 'var(--color-text-muted)',
            lineHeight: 1.72,
            maxWidth: '440px',
            marginBottom: '2.25rem',
          }}>
            {t.heroSub}
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2.5rem', maxWidth: '340px' }}>
            <button onClick={scrollToPricing} className="btn-primary" style={{ fontSize: '1rem' }}>
              {t.heroPrimary}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
            <a href={demoUrl} className="btn-outline">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              {t.heroSecondary}
            </a>
          </div>

          {/* Social proof */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div style={{ display: 'flex' }}>
              {[
                { initials: 'AK', bg: '#DBEAFE', color: '#1D4ED8' },
                { initials: 'MW', bg: '#FCE7F3', color: '#BE185D' },
                { initials: 'PM', bg: '#FEF3C7', color: '#B45309' },
                { initials: '+',  bg: 'var(--color-accent-light)', color: 'var(--color-accent)' },
              ].map((item, i) => (
                <div key={item.initials} style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  border: '2.5px solid white',
                  background: item.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.62rem', fontWeight: 800,
                  color: item.color,
                  marginLeft: i === 0 ? 0 : '-7px',
                  zIndex: 4 - i,
                  position: 'relative',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                }}>
                  {item.initials}
                </div>
              ))}
            </div>
            <div>
              <span style={{ fontSize: '0.875rem', color: 'var(--color-text)' }}>
                <strong style={{ fontWeight: 800 }}>124 </strong>
                <span style={{ color: 'var(--color-text-muted)' }}>
                  {t.heroSocialProof.replace('124 ', '')}
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT: Browser mockup */}
        <div className="hide-mobile animate-fade-up animate-fade-up-delay-2" style={{
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 24px 72px rgba(0,0,0,0.13), 0 4px 16px rgba(0,0,0,0.06)',
          overflow: 'hidden',
          border: '1px solid var(--color-border)',
        }}>
          {/* Browser bar */}
          <div style={{
            background: '#F9FAFB',
            borderBottom: '1px solid var(--color-border)',
            padding: '0.65rem 1rem',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#FF5F57' }}/>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#FFBD2E' }}/>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#28CA41' }}/>
            <div style={{
              background: 'white', border: '1px solid var(--color-border)',
              borderRadius: '6px', flex: 1, padding: '0.28rem 0.75rem',
              fontSize: '0.7rem', color: 'var(--color-text-faint)',
              display: 'flex', alignItems: 'center', gap: '0.4rem',
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              moj-apartament.pl
            </div>
          </div>

          {/* Mockup content */}
          <div style={{ padding: '1.25rem' }}>
            {/* Hero image placeholder */}
            <div style={{
              background: 'linear-gradient(135deg, #ECFDF5 0%, #D1FAE5 60%, #A7F3D0 100%)',
              borderRadius: '10px', height: '96px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '1rem', position: 'relative', overflow: 'hidden',
            }}>
              {/* Decorative circles */}
              <div style={{ position: 'absolute', right: '-12px', top: '-12px', width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(5,150,105,0.12)' }}/>
              <div style={{ position: 'absolute', left: '12px', bottom: '-16px', width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(5,150,105,0.08)' }}/>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>

            <div style={{ fontWeight: 800, fontSize: '0.9rem', marginBottom: '0.2rem', letterSpacing: '-0.02em' }}>
              {lang === 'pl' ? 'Apartament przy plaży' : 'Beachfront Apartment'}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginBottom: '0.875rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span>Sopot</span>
              <span style={{ color: 'var(--color-border)' }}>·</span>
              <span>2 {lang === 'pl' ? 'osoby' : 'guests'}</span>
              <span style={{ color: 'var(--color-border)' }}>·</span>
              <span>WiFi</span>
            </div>

            {/* Date pickers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', marginBottom: '0.875rem' }}>
              {[
                { label: 'Check-in', val: lang === 'pl' ? '15 lip' : 'Jul 15' },
                { label: 'Check-out', val: lang === 'pl' ? '22 lip' : 'Jul 22' },
              ].map(d => (
                <div key={d.label} style={{
                  background: '#F9FAFB', border: '1px solid var(--color-border)',
                  borderRadius: '8px', padding: '0.45rem 0.6rem',
                }}>
                  <div style={{ fontSize: '0.52rem', color: 'var(--color-text-faint)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '0.1rem' }}>{d.label}</div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>{d.val}</div>
                </div>
              ))}
            </div>

            {/* Price breakdown */}
            {[
              { label: lang === 'pl' ? '7 nocy × 320 zł' : '7 nights × 320 PLN', val: lang === 'pl' ? '2 240 zł' : '2 240 PLN' },
              { label: lang === 'pl' ? 'Sprzątanie' : 'Cleaning', val: lang === 'pl' ? '150 zł' : '150 PLN' },
            ].map(row => (
              <div key={row.label} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '0.35rem 0', borderTop: '1px solid var(--color-border-light)',
                fontSize: '0.74rem',
              }}>
                <span style={{ color: 'var(--color-text-muted)' }}>{row.label}</span>
                <strong>{row.val}</strong>
              </div>
            ))}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '0.5rem 0', borderTop: '1.5px solid var(--color-text)',
              fontSize: '0.82rem', marginBottom: '0.875rem',
            }}>
              <strong>{lang === 'pl' ? 'Razem' : 'Total'}</strong>
              <strong style={{ color: 'var(--color-accent)' }}>{lang === 'pl' ? '2 390 zł' : '2 390 PLN'}</strong>
            </div>

            {/* Book button */}
            <div style={{
              background: 'var(--color-accent)', color: 'white',
              borderRadius: '8px', padding: '0.625rem',
              textAlign: 'center', fontSize: '0.8rem', fontWeight: 700,
              boxShadow: '0 2px 8px rgba(5,150,105,0.28)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem',
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              {lang === 'pl' ? 'Zarezerwuj i zapłać' : 'Reserve & Pay'}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
