'use client'

import Link from 'next/link'
import { useLang } from '@/context/LangContext'
import { TR } from '@/lib/translations'
import { PRICE_LABELS } from '@/lib/prices'
import Kafelek from '@/components/ui/Kafelek'
import { Browser, CalendarCheck, Translate } from '@/components/ui/ikony'
import { przewinDo } from '@/components/Header'

/** Demo to strona apartamentu (`/demo`) — lista mówi tylko o tym, co tam naprawdę jest. */
export default function DemoCTA() {
  const { lang } = useLang()
  const t = TR[lang]
  const pl = lang === 'pl'

  const wiersze = [
    { ikona: Browser, kolor: 'emerald' as const, b: pl ? 'Strona apartamentu' : 'Apartment site', s: pl ? 'Galeria, opis i mapa okolicy' : 'Gallery, description and area map' },
    { ikona: CalendarCheck, kolor: 'blue' as const, b: pl ? 'Kalendarz i wycena' : 'Calendar and quote', s: pl ? 'Wybierz daty i zobacz cenę pobytu' : 'Pick dates and see the price of the stay' },
    { ikona: Translate, kolor: 'indigo' as const, b: pl ? 'Cztery języki' : 'Four languages', s: pl ? 'Przełącz język tak, jak zrobi to gość' : 'Switch language the way a guest would' },
  ]

  return (
    <section id="demo" className="l-section" style={{ paddingTop: 0 }}>
      <div className="l-wrap">
        <div className="l-demo">
          <div>
            <h2>{pl ? 'Sprawdź wszystko sam, zanim kupisz.' : 'Try it yourself before you buy.'}</h2>
            <p>{t.demoText}</p>
            <div className="l-demo__ctas">
              <Link href="/demo" className="n-btn n-btn--light">{t.demoCta}</Link>
              <button type="button" className="n-btn l-btn-dark-ghost" onClick={() => przewinDo('cennik')}>
                {pl ? `Zamów — od ${PRICE_LABELS.basic.pln}` : `Order — from ${PRICE_LABELS.basic.eur}`}
              </button>
            </div>
          </div>
          <div className="l-demo__list">
            {wiersze.map(w => (
              <div key={w.b} className="n-row">
                <Kafelek ikona={w.ikona} kolor={w.kolor} rozmiar="sm" />
                <div className="n-row__txt"><b>{w.b}</b><span>{w.s}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
