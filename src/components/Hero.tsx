'use client'

import Link from 'next/link'
import { useLang } from '@/context/LangContext'
import { TR } from '@/lib/translations'
import { PRICE_LABELS } from '@/lib/prices'
import Kafelek from '@/components/ui/Kafelek'
import { ArrowsClockwise, CalendarCheck, CheckCircle, Lightning, PlayCircle } from '@/components/ui/ikony'
import { przewinDo } from '@/components/Header'

/** Dni w mini-kalendarzu na ekranie telefonu: b = zajęte z portalu, s = wybrany pobyt. */
const DNI: { n: number; s?: 'b' | 's' }[] = [
  { n: 5 }, { n: 6, s: 'b' }, { n: 7, s: 'b' }, { n: 8, s: 'b' }, { n: 9 }, { n: 10 }, { n: 11, s: 's' },
  { n: 12, s: 's' }, { n: 13, s: 's' }, { n: 14, s: 's' }, { n: 15 }, { n: 16, s: 'b' }, { n: 17, s: 'b' }, { n: 18 },
]

export default function Hero() {
  const { lang } = useLang()
  const t = TR[lang]
  const pl = lang === 'pl'
  const [linia1, linia2, linia3] = t.heroH1.split('\n')

  /*
    Trzy sprawdzalne fakty o ofercie zamiast liczby klientów i awatarów —
    klientów było zero, a liczby, której nie da się pokazać, nie piszemy.
  */
  return (
    <section className="l-hero">
      <div className="l-wrap">
        <div>
          <div className="l-pill">
            <Kafelek ikona={Lightning} kolor="emerald" rozmiar="xs" />
            {pl ? 'Strona gotowa zwykle w 24 godziny' : 'Your site is usually ready in 24 hours'}
          </div>
          <h1>
            <span>{linia1}</span>
            <span>{linia2}</span>
            <span>{linia3}</span>
          </h1>
          <p className="l-lead">{t.heroSub}</p>
          <div className="l-ctas">
            <button type="button" className="n-btn n-btn--primary" onClick={() => przewinDo('cennik')}>
              {pl ? `Zamów stronę — od ${PRICE_LABELS.basic.pln}` : `Order your site — from ${PRICE_LABELS.basic.eur}`}
            </button>
            <Link href="/demo" className="n-btn n-btn--ghost">
              <PlayCircle weight="fill" size={20} color="var(--emerald)" aria-hidden />
              {pl ? 'Zobacz demo' : 'See the demo'}
            </Link>
          </div>
          <ul className="l-trust">
            {t.heroTrust.map(punkt => (
              <li key={punkt}><CheckCircle weight="fill" aria-hidden />{punkt}</li>
            ))}
          </ul>
        </div>

        <div className="l-stage" aria-hidden>
          <div className="l-phone">
            <div className="l-screen">
              <div className="l-photo">
                <div className="l-photo__title">
                  <b>Apartament Playa Azul</b>
                  <small>Torrevieja · {pl ? '4 osoby · 2 sypialnie' : '4 guests · 2 bedrooms'}</small>
                </div>
              </div>
              <div className="l-screen__body">
                <div className="l-price-row">
                  <div><b>{pl ? 'od 90 €' : 'from €90'}</b> <small>/ {pl ? 'noc' : 'night'}</small></div>
                  <small>{pl ? 'min. 3 noce' : 'min. 3 nights'}</small>
                </div>
                <div className="l-cal">
                  {(pl ? ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'] : ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']).map(d => (
                    <span key={d} className="h">{d}</span>
                  ))}
                  {DNI.map(d => <span key={d.n} className={`d${d.s ? ` ${d.s}` : ''}`}>{d.n}</span>)}
                </div>
                <div className="l-screen__cta">{pl ? 'Zarezerwuj 11–14 lipca' : 'Book 11–14 July'}</div>
              </div>
            </div>
          </div>
          <div className="l-notif">
            <Kafelek ikona={CalendarCheck} kolor="emerald" />
            <div>
              <b>{pl ? 'Nowa rezerwacja' : 'New booking'}</b>
              <span>{pl ? 'Playa Azul · 11–14 lipca · opłacona' : 'Playa Azul · 11–14 July · paid'}</span>
            </div>
            <time>{pl ? 'teraz' : 'now'}</time>
          </div>
          <div className="l-notif l-notif--two">
            <Kafelek ikona={ArrowsClockwise} kolor="blue" />
            <div>
              <b>{pl ? 'Kalendarz zsynchronizowany' : 'Calendar synced'}</b>
              <span>{pl ? '16–17 lipca zajęte na Booking.com' : '16–17 July booked on Booking.com'}</span>
            </div>
            <time>5 min</time>
          </div>
        </div>
      </div>
    </section>
  )
}
