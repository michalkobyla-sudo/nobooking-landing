'use client'

import { useLang } from '@/context/LangContext'
import { TR } from '@/lib/translations'
import type { Icon } from '@phosphor-icons/react'
import { AppleLogo, CreditCard, DeviceMobile, GlobeHemisphereWest, Images, Tag, TextAlignLeft } from '@/components/ui/ikony'

type Chip = { ikona: Icon; kolor: string; tekst: string }

export default function HowItWorks() {
  const { lang } = useLang()
  const t = TR[lang]
  const pl = lang === 'pl'

  const kroki: { tytul: string; opis: string; chipy: Chip[] }[] = [
    {
      tytul: t.howStep1Title,
      opis: t.howStep1Desc,
      chipy: [
        { ikona: CreditCard, kolor: 'var(--ios-blue)', tekst: pl ? 'Karta' : 'Card' },
        // BLIK działa w Stripe tylko w złotówkach, a wersja angielska płaci w euro.
        ...(pl ? [{ ikona: DeviceMobile, kolor: 'var(--ink)', tekst: 'BLIK' }] : []),
        { ikona: AppleLogo, kolor: 'var(--ink)', tekst: 'Apple Pay' },
      ],
    },
    {
      tytul: t.howStep2Title,
      opis: t.howStep2Desc,
      chipy: [
        { ikona: Images, kolor: 'var(--ios-teal)', tekst: pl ? 'Zdjęcia' : 'Photos' },
        { ikona: TextAlignLeft, kolor: 'var(--ios-graphite)', tekst: pl ? 'Opis' : 'Description' },
        { ikona: Tag, kolor: 'var(--ios-orange)', tekst: pl ? 'Ceny' : 'Prices' },
      ],
    },
    {
      tytul: t.howStep3Title,
      opis: t.howStep3Desc,
      chipy: [{ ikona: GlobeHemisphereWest, kolor: 'var(--emerald)', tekst: pl ? 'twoja-nazwa.nobooking.eu' : 'your-name.nobooking.eu' }],
    },
  ]

  return (
    <section id="jak-dziala" className="l-section">
      <div className="l-wrap">
        <div className="l-head"><h2>{pl ? 'Trzy kroki do własnej strony.' : 'Three steps to your own site.'}</h2></div>
        <ol className="l-steps" style={{ listStyle: 'none' }}>
          {kroki.map((k, i) => (
            <li key={k.tytul} className="l-step">
              <div className="l-step__num" aria-hidden>{i + 1}</div>
              <h3>{k.tytul}</h3>
              <p>{k.opis}</p>
              <div className="l-step__meta">
                {k.chipy.map(({ ikona: I, kolor, tekst }) => (
                  <span key={tekst} className="n-chip"><I weight="fill" color={kolor} aria-hidden />{tekst}</span>
                ))}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
