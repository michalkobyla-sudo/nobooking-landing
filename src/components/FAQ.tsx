'use client'

import type { Icon } from '@phosphor-icons/react'
import { useLang } from '@/context/LangContext'
import { TR } from '@/lib/translations'
import Kafelek, { type KolorKafelka } from '@/components/ui/Kafelek'
import { ArrowsCounterClockwise, CaretRight, CreditCard, DeviceMobile, Images, Question, Timer, Wallet } from '@/components/ui/ikony'

/** Ikona i kolor dla pytania o danym numerze w `TR[lang].faqs` (kolejność taka sama w obu językach). */
const IKONY: { ikona: Icon; kolor: KolorKafelka }[] = [
  { ikona: CreditCard, kolor: 'orange' },
  { ikona: Images, kolor: 'teal' },
  { ikona: ArrowsCounterClockwise, kolor: 'graphite' },
  { ikona: DeviceMobile, kolor: 'blue' },
  { ikona: Timer, kolor: 'emerald' },
  { ikona: Wallet, kolor: 'orange' },
]

export default function FAQ() {
  const { lang } = useLang()
  const t = TR[lang]

  return (
    <section id="faq" className="l-section">
      <div className="l-wrap">
        <div className="l-head"><h2>{lang === 'pl' ? 'Pytania i odpowiedzi.' : 'Questions and answers.'}</h2></div>
        <div className="l-faq">
          <div className="n-list n-list--grey">
            {t.faqs.map((faq, i) => {
              const { ikona, kolor } = IKONY[i] ?? { ikona: Question, kolor: 'graphite' as const }
              return (
                <details key={faq.q} open={i === 0}>
                  <summary>
                    <Kafelek ikona={ikona} kolor={kolor} rozmiar="sm" />
                    {faq.q}
                    <CaretRight weight="bold" className="l-faq__ch" aria-hidden />
                  </summary>
                  <div className="l-faq__ans">{faq.a}</div>
                </details>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
