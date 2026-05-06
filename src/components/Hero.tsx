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
      background: 'var(--color-bg-alt)',
      borderBottom: '1px solid var(--color-border-light)',
      padding: 'clamp(4rem, 8vw, 6rem) 1.5rem',
    }}>
      <div style={{
        maxWidth: '1100px',
        margin: '0 auto',
        display: 'grid',
        gridTemplateColumns: '1.2fr 1fr',
        gap: '3rem',
        alignItems: 'center',
      }}>
        {/* LEFT: Text */}
        <div>
          {/* Badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.4rem',
            background: 'var(--color-accent-light)', border: '1px solid var(--color-accent-border)',
            color: 'var(--color-accent)', fontSize: '0.72rem', fontWeight: 700,
            letterSpacing: '0.08em', textTransform: 'uppercase',
            padding: '0.3rem 0.875rem', borderRadius: 'var(--radius-pill)',
            marginBottom: '1.5rem',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
            {lang === 'pl' ? 'Dla właścicieli apartamentów wakacyjnych' : 'For vacation apartment owners'}
          </div>

          {/* H1 */}
          <h1 style={{
            fontSize: 'clamp(2.4rem, 4.5vw, 3.5rem)',
            fontWeight: 800,
            lineHeight: 1.05,
            letterSpacing: '-0.04em',
            color: 'var(--color-text)',
            marginBottom: '1.25rem',
            whiteSpace: 'pre-line',
          }}>
            {t.heroH1}
          </h1>

          {/* Sub */}
          <p style={{
            fontSize: '1rem',
            color: 'var(--color-text-muted)',
            lineHeight: 1.7,
            maxWidth: '420px',
            marginBottom: '2rem',
          }}>
            {t.heroSub}
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '2rem', maxWidth: '340px' }}>
            <button onClick={scrollToPricing} className="btn-primary">
              {t.heroPrimary}
            </button>
            <a href={demoUrl} target="_blank" rel="noopener noreferrer" className="btn-outline">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="5 3 19 12 5 21 5 3"/>
              </svg>
              {t.heroSecondary}
            </a>
          </div>

          {/* Social proof */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ display: 'flex' }}>
              {['AK', 'MW', 'PM', 'JL'].map((initials, i) => (
                <div key={initials} style={{
                  width: '30px', height: '30px', borderRadius: '50%',
                  border: '2px solid white',
                  background: i === 3 ? 'var(--color-accent-light)' : '#E5E7EB',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.6rem', fontWeight: 700,
                  color: i === 3 ? 'var(--color-accent)' : 'var(--color-text-muted)',
                  marginLeft: i === 0 ? 0 : '-6px',
                  zIndex: 4 - i,
                  position: 'relative',
                }}>
                  {i === 3 ? '+' : initials}
                </div>
              ))}
            </div>
            <span style={{ fontSize: '0.82rem', color: 'var(--color-text-muted)' }}>
              <strong style={{ color: 'var(--color-text)', fontWeight: 700 }}>124 </strong>
              {t.heroSocialProof.replace('124 ', '')}
            </span>
          </div>
        </div>

        {/* RIGHT: Browser mockup */}
        <div className="hide-mobile" style={{
          background: 'white',
          borderRadius: '14px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.06)',
          overflow: 'hidden',
          border: '1px solid var(--color-border)',
        }}>
          {/* Browser bar */}
          <div style={{
            background: '#F9FAFB',
            borderBottom: '1px solid var(--color-border)',
            padding: '0.6rem 1rem',
            display: 'flex', alignItems: 'center', gap: '0.5rem',
          }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#FF5F57' }}/>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#FFBD2E' }}/>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#28CA41' }}/>
            <div style={{
              background: 'white', border: '1px solid var(--color-border)',
              borderRadius: '6px', flex: 1, padding: '0.25rem 0.75rem',
              fontSize: '0.7rem', color: 'var(--color-text-faint)',
            }}>
              moj-apartament.pl
            </div>
          </div>

          {/* Mockup content */}
          <div style={{ padding: '1.25rem' }}>
            {/* Apartment image placeholder */}
            <div style={{
              background: 'linear-gradient(135deg, var(--color-accent-light), var(--color-accent-border))',
              borderRadius: '10px', height: '100px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '1rem',
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                <polyline points="9 22 9 12 15 12 15 22"/>
              </svg>
            </div>

            <div style={{ fontWeight: 800, fontSize: '0.95rem', marginBottom: '0.25rem' }}>
              {lang === 'pl' ? 'Apartament przy plaży' : 'Beachfront Apartment'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
              {lang === 'pl' ? 'Sopot · 2 osoby · WiFi · Parking' : 'Sopot · 2 guests · WiFi · Parking'}
            </div>

            {/* Date pickers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.875rem' }}>
              {[
                { label: 'Check-in', val: lang === 'pl' ? '15 lip' : 'Jul 15' },
                { label: 'Check-out', val: lang === 'pl' ? '22 lip' : 'Jul 22' },
              ].map(d => (
                <div key={d.label} style={{
                  background: '#F9FAFB', border: '1px solid var(--color-border)',
                  borderRadius: '8px', padding: '0.5rem 0.6rem',
                }}>
                  <div style={{ fontSize: '0.55rem', color: 'var(--color-text-faint)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{d.label}</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700 }}>{d.val}</div>
                </div>
              ))}
            </div>

            {/* Price breakdown */}
            {[
              { label: lang === 'pl' ? '7 nocy × 320 zł' : '7 nights × 320 PLN', val: lang === 'pl' ? '2 240 zł' : '2 240 PLN' },
              { label: lang === 'pl' ? 'Opłata za sprzątanie' : 'Cleaning fee', val: lang === 'pl' ? '150 zł' : '150 PLN' },
            ].map(row => (
              <div key={row.label} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '0.4rem 0', borderTop: '1px solid var(--color-border-light)',
                fontSize: '0.78rem',
              }}>
                <span style={{ color: 'var(--color-text-muted)' }}>{row.label}</span>
                <strong>{row.val}</strong>
              </div>
            ))}
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '0.5rem 0', borderTop: '2px solid var(--color-text)',
              fontSize: '0.85rem', marginBottom: '0.875rem',
            }}>
              <strong>{lang === 'pl' ? 'Razem' : 'Total'}</strong>
              <strong style={{ color: 'var(--color-accent)' }}>{lang === 'pl' ? '2 390 zł' : '2 390 PLN'}</strong>
            </div>

            {/* Book button */}
            <div style={{
              background: 'var(--color-accent)', color: 'white',
              borderRadius: '8px', padding: '0.65rem',
              textAlign: 'center', fontSize: '0.82rem', fontWeight: 700,
            }}>
              {lang === 'pl' ? 'Zarezerwuj i zapłać' : 'Reserve & Pay'}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
