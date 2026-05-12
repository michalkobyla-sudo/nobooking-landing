'use client'

import { useLang } from '@/context/LangContext'

export default function Header() {
  const { lang, setLang } = useLang()

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  const navItems =
    lang === 'pl'
      ? [
          { label: 'Jak to działa', id: 'jak-dziala' },
          { label: 'Funkcje', id: 'funkcje' },
          { label: 'Cennik', id: 'cennik' },
          { label: 'FAQ', id: 'faq' },
        ]
      : [
          { label: 'How it works', id: 'jak-dziala' },
          { label: 'Features', id: 'funkcje' },
          { label: 'Pricing', id: 'cennik' },
          { label: 'FAQ', id: 'faq' },
        ]

  return (
    <header style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      height: '64px',
      background: 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--color-border-light)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 1.5rem',
    }}>
      <div style={{
        maxWidth: '1100px',
        margin: '0 auto',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.5rem',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', flexShrink: 0 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: 'var(--color-accent)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </div>
          <span style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.03em' }}>
            Nobooking
          </span>
        </div>

        {/* Nav */}
        <nav style={{ display: 'flex', gap: '1.75rem', alignItems: 'center' }} className="hide-mobile">
          {navItems.map(item => (
            <button key={item.id} onClick={() => scrollTo(item.id)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-muted)',
              fontFamily: 'inherit', padding: 0,
              transition: 'color 0.15s',
            }}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}>
              {item.label}
            </button>
          ))}
        </nav>

        {/* Right actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
          {/* Lang toggle */}
          <div style={{
            display: 'flex', background: 'var(--color-bg-alt)', borderRadius: '8px',
            padding: '3px', gap: '2px',
          }}>
            {(['pl', 'en'] as const).map(l => (
              <button key={l} onClick={() => setLang(l)} style={{
                padding: '0.2rem 0.6rem', borderRadius: '6px', border: 'none',
                fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                fontFamily: 'inherit', transition: 'all 0.15s',
                background: lang === l ? 'white' : 'transparent',
                color: lang === l ? 'var(--color-text)' : 'var(--color-text-faint)',
                boxShadow: lang === l ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Demo link */}
          <a href="/demo" className="header-demo-link" style={{
            border: '1.5px solid var(--color-border)',
            borderRadius: 'var(--radius-pill)',
            padding: '0.45rem 1rem', fontSize: '0.82rem', fontWeight: 600,
            color: 'var(--color-text-muted)', textDecoration: 'none', whiteSpace: 'nowrap',
            transition: 'border-color var(--transition-fast), color var(--transition-fast)',
            display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-text)'; e.currentTarget.style.color = 'var(--color-text)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-muted)'; }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            {lang === 'pl' ? 'Demo' : 'Demo'}
          </a>

          {/* CTA */}
          <button onClick={() => scrollTo('cennik')} style={{
            background: 'var(--color-dark)', color: 'white',
            border: 'none', borderRadius: 'var(--radius-pill)',
            padding: '0.5rem 1.125rem', fontSize: '0.82rem', fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
            transition: 'opacity var(--transition-fast)',
            display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
          }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
            {lang === 'pl' ? 'Zamów stronę' : 'Order site'}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}
