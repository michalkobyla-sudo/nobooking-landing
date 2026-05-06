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
        <div style={{ fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.03em', cursor: 'pointer', flexShrink: 0 }}
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          Nobooking
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

          {/* CTA */}
          <button onClick={() => scrollTo('cennik')} style={{
            background: 'var(--color-dark)', color: 'white',
            border: 'none', borderRadius: 'var(--radius-sm)',
            padding: '0.5rem 1.1rem', fontSize: '0.82rem', fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
          }}>
            {lang === 'pl' ? 'Zamów stronę →' : 'Order site →'}
          </button>
        </div>
      </div>
    </header>
  )
}
