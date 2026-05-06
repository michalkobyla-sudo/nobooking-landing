'use client'

import { useLang } from '@/context/LangContext'
import { TR } from '@/lib/translations'

export default function Footer() {
  const { lang } = useLang()
  const t = TR[lang]

  const productLinks = lang === 'pl'
    ? [
        { label: 'Jak to działa', id: 'jak-dziala' },
        { label: 'Funkcje', id: 'funkcje' },
        { label: 'Cennik', id: 'cennik' },
        { label: 'Demo', href: process.env.NEXT_PUBLIC_DEMO_URL || 'https://demo.nobooking.eu' },
      ]
    : [
        { label: 'How it works', id: 'jak-dziala' },
        { label: 'Features', id: 'funkcje' },
        { label: 'Pricing', id: 'cennik' },
        { label: 'Demo', href: process.env.NEXT_PUBLIC_DEMO_URL || 'https://demo.nobooking.eu' },
      ]

  const companyLinks = lang === 'pl'
    ? ['O nas', 'Kontakt', 'Regulamin', 'Polityka prywatności']
    : ['About', 'Contact', 'Terms', 'Privacy Policy']

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <footer style={{ background: 'var(--color-dark)', padding: '3rem 1.5rem 2rem' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
        {/* Top row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '2rem', marginBottom: '2.5rem', flexWrap: 'wrap' }}>
          {/* Brand */}
          <div style={{ maxWidth: '240px' }}>
            <div style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.03em', color: 'white', marginBottom: '0.5rem' }}>
              No<span style={{ color: 'var(--color-accent)' }}>booking</span>
            </div>
            <p style={{ fontSize: '0.82rem', color: '#6B7280', lineHeight: 1.65 }}>
              {lang === 'pl'
                ? 'Profesjonalne strony rezerwacji dla właścicieli apartamentów wakacyjnych.'
                : 'Professional booking sites for vacation apartment owners.'}
            </p>
          </div>

          {/* Links */}
          <div style={{ display: 'flex', gap: '3rem', flexWrap: 'wrap' }}>
            <div>
              <h4 style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6B7280', marginBottom: '0.875rem' }}>
                {lang === 'pl' ? 'Produkt' : 'Product'}
              </h4>
              {productLinks.map(link => (
                <div key={link.label} style={{ marginBottom: '0.5rem' }}>
                  {'id' in link
                    ? <button onClick={() => scrollTo(link.id!)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem', color: '#6B7280', padding: 0, textAlign: 'left' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'white')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#6B7280')}>
                        {link.label}
                      </button>
                    : <a href={link.href} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.82rem', color: '#6B7280', textDecoration: 'none' }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'white')}
                        onMouseLeave={e => (e.currentTarget.style.color = '#6B7280')}>
                        {link.label}
                      </a>
                  }
                </div>
              ))}
            </div>
            <div>
              <h4 style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#6B7280', marginBottom: '0.875rem' }}>
                {lang === 'pl' ? 'Firma' : 'Company'}
              </h4>
              {companyLinks.map(label => (
                <div key={label} style={{ marginBottom: '0.5rem' }}>
                  <a href="#" style={{ fontSize: '0.82rem', color: '#6B7280', textDecoration: 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'white')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#6B7280')}>
                    {label}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div style={{ borderTop: '1px solid #1F2937', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
          <p style={{ fontSize: '0.78rem', color: '#4B5563' }}>{t.footerCopyright}. Wszelkie prawa zastrzeżone.</p>
          <p style={{ fontSize: '0.78rem', color: '#4B5563' }}>Made with ♥ in Poland</p>
        </div>
      </div>
    </footer>
  )
}
