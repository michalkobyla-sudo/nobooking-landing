'use client'

import Link from 'next/link'
import { useLang } from '@/context/LangContext'
import Kafelek from '@/components/ui/Kafelek'
import { HouseLine } from '@/components/ui/ikony'

export function przewinDo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

export default function Header() {
  const { lang, setLang } = useLang()

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
    <header className="l-nav">
      <div className="l-wrap">
        <button type="button" className="l-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
          <Kafelek ikona={HouseLine} kolor="emerald" rozmiar="sm" />
          Nobooking
        </button>

        <nav className="l-nav__links" aria-label={lang === 'pl' ? 'Sekcje' : 'Sections'}>
          {navItems.map(item => (
            <button key={item.id} type="button" onClick={() => przewinDo(item.id)}>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="l-nav__right">
          <div className="n-seg n-seg--sm" role="group" aria-label={lang === 'pl' ? 'Język' : 'Language'}>
            {(['pl', 'en'] as const).map(l => (
              <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <Link href="/demo" className="l-nav__demo">Demo</Link>
          <button type="button" className="n-btn n-btn--primary n-btn--sm" onClick={() => przewinDo('cennik')}>
            {lang === 'pl' ? 'Zamów stronę' : 'Order site'}
          </button>
        </div>
      </div>
    </header>
  )
}
