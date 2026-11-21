'use client'

import { useLang } from '@/context/LangContext'
import { TR } from '@/lib/translations'
import { Star } from '@/components/ui/ikony'

function Gwiazdki() {
  return (
    <div style={{ display: 'flex', gap: 2, color: 'var(--ios-yellow)', fontSize: 16 }} aria-hidden>
      {[1, 2, 3, 4, 5].map(i => <Star key={i} weight="fill" />)}
    </div>
  )
}

/**
 * Opinie klientow.
 *
 * Sekcja chowa sie, dopoki nie ma czego pokazac. Do 2026-10-01 staly tu trzy
 * wymyslone opinie — z nazwiskami, miejscowosciami, piecioma gwiazdkami
 * i konkretnymi kwotami oszczednosci — przy zerowej liczbie klientow. Pusta
 * sekcja jest lepsza niz wymyslona: pierwsza prawdziwa opinia wraca tu przez
 * `TR[lang].testimonials` i nic wiecej nie trzeba zmieniac.
 */
export default function Testimonials() {
  const { lang } = useLang()
  const t = TR[lang]

  if (t.testimonials.length === 0) return null

  return (
    <section className="l-section">
      <div className="l-wrap">
        <div className="l-head"><h2>{t.testimonialsTitle}</h2></div>
        <div className="l-quotes">
          {t.testimonials.map(item => (
            <figure key={item.author} className="n-card n-card--grey" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Gwiazdki />
              <blockquote style={{ fontSize: 16, color: 'var(--ink)', flex: 1 }}>{item.text}</blockquote>
              <figcaption style={{ fontSize: 14, color: 'var(--muted)' }}>
                <b style={{ color: 'var(--ink)', display: 'block' }}>{item.author}</b>{item.location}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
