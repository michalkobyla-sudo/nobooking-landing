'use client'

import { useLang } from '@/context/LangContext'
import { TR } from '@/lib/translations'

export default function Footer() {
  const { lang, setLang } = useLang()
  const t = TR[lang]
  const demoUrl = process.env.NEXT_PUBLIC_DEMO_URL || 'https://demo.nobooking.eu'

  return (
    <footer style={{ backgroundColor: '#1A1A2E', color: '#9CA3AF', padding: '2.5rem 1.5rem' }}>
      <div className="container" style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', justifyContent: 'space-between', alignItems: 'center' }}>
        <a href="/" style={{ textDecoration: 'none' }}>
          <span style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '1.3rem' }}>
            <span style={{ color: '#2B7A78', fontWeight: 700 }}>No</span>
            <span style={{ color: '#E5E7EB', fontWeight: 400 }}>booking</span>
          </span>
        </a>

        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap', fontSize: '0.85rem' }}>
          <a href={demoUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#9CA3AF', textDecoration: 'none' }}>
            {t.demo}
          </a>
          <a href="/polityka-prywatnosci" style={{ color: '#9CA3AF', textDecoration: 'none' }}>
            {t.footerPrivacy}
          </a>
          <a href="mailto:kontakt@nobooking.eu" style={{ color: '#9CA3AF', textDecoration: 'none' }}>
            kontakt@nobooking.eu
          </a>
          <button
            onClick={() => setLang(lang === 'pl' ? 'en' : 'pl')}
            style={{ background: 'none', border: '1px solid #374151', borderRadius: '6px', color: '#9CA3AF', cursor: 'pointer', padding: '0.25rem 0.6rem', fontSize: '0.78rem' }}
          >
            {lang === 'pl' ? 'EN' : 'PL'}
          </button>
        </div>

        <p style={{ fontSize: '0.78rem', width: '100%', textAlign: 'center', borderTop: '1px solid #2D3748', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
          {t.footerCopyright}
        </p>
      </div>
    </footer>
  )
}
