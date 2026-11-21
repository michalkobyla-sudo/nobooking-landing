'use client'

import Link from 'next/link'
import { useLang } from '@/context/LangContext'
import { TR } from '@/lib/translations'
import Kafelek from '@/components/ui/Kafelek'
import { HouseLine } from '@/components/ui/ikony'
import { przewinDo } from '@/components/Header'

export default function Footer() {
  const { lang } = useLang()
  const t = TR[lang]

  const productLinks = lang === 'pl'
    ? [
        { label: 'Jak to działa', id: 'jak-dziala' },
        { label: 'Funkcje', id: 'funkcje' },
        { label: 'Cennik', id: 'cennik' },
        { label: 'Demo', href: '/demo' },
      ]
    : [
        { label: 'How it works', id: 'jak-dziala' },
        { label: 'Features', id: 'funkcje' },
        { label: 'Pricing', id: 'cennik' },
        { label: 'Demo', href: '/demo' },
      ]

/**
 * Adres kontaktowy — **widoczny na stronie, nie tylko w komunikatach błędu.**
 *
 * Do 2026-10-12 `kontakt@nobooking.eu` pojawiał się wyłącznie w treści błędów
 * formularza („Spróbuj ponownie lub napisz na…"), czyli w praktyce nigdy.
 * Stripe wstrzymał wtedy wypłaty, bo nie potrafił potwierdzić, że panujemy nad
 * domeną: konto założone na Gmailu, a na stronie ani jednego adresu w domenie
 * `nobooking.eu`. Odwiedzający miał ten sam problem — „Kontakt" w stopce był
 * atrapą z `href="#"`.
 */
const ADRES_KONTAKTOWY = 'kontakt@nobooking.eu'

  return (
    <footer className="l-footer">
      <div className="l-wrap">
        <div className="l-footer__top">
          <div className="l-footer__brand">
            <Link href="/" className="l-logo" style={{ fontSize: 16 }}>
              <Kafelek ikona={HouseLine} kolor="emerald" rozmiar="xs" />
              Nobooking
            </Link>
            <p>
              {lang === 'pl'
                ? 'Własne strony rezerwacyjne dla właścicieli apartamentów wakacyjnych.'
                : 'Booking sites of their own for holiday apartment owners.'}
            </p>
          </div>
          <div className="l-footer__cols">
            <div>
              <h4>{lang === 'pl' ? 'Produkt' : 'Product'}</h4>
              {productLinks.map(link =>
                'id' in link && link.id
                  ? <button key={link.label} type="button" onClick={() => przewinDo(link.id)}>{link.label}</button>
                  : <Link key={link.label} href={link.href ?? '/'}>{link.label}</Link>,
              )}
            </div>
            <div>
              <h4>{lang === 'pl' ? 'Firma' : 'Company'}</h4>
              {/* `<Link>`, nie `<a>`: przeładowanie gubi źródło wejścia (`lib/zrodloWPamieci.ts`). */}
              {[
                { label: ADRES_KONTAKTOWY, href: `mailto:${ADRES_KONTAKTOWY}` },
                { label: lang === 'pl' ? 'Regulamin' : 'Terms', href: '/regulamin' },
                { label: lang === 'pl' ? 'Polityka prywatności' : 'Privacy Policy', href: '/polityka-prywatnosci' },
              ].map(poz => <Link key={poz.href} href={poz.href}>{poz.label}</Link>)}
            </div>
          </div>
        </div>
        <div className="l-footer__bottom">
          <span>{t.footerCopyright}</span>
          <span>
            {lang === 'pl' ? 'Stworzył: ' : 'Created by '}
            <a href="https://michalkobylinski.pl" target="_blank" rel="noopener">Michał Kobyliński</a>
          </span>
        </div>
      </div>
    </footer>
  )
}
