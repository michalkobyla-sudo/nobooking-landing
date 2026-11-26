'use client'

import { useLang } from '@/context/LangContext'
import { ZALOZYCIEL } from '@/lib/zalozyciel'
import Kafelek from '@/components/ui/Kafelek'
import { EnvelopeSimple, GlobeHemisphereWest, Phone } from '@/components/ui/ikony'

/**
 * Kto stoi za Nobookingiem. Opinii klientów jeszcze nie ma, więc zaufanie buduje
 * konkretna osoba z kontaktem. Telefon i zdjęcie pojawiają się dopiero, gdy są
 * wpisane w `lib/zalozyciel.ts`.
 */
export default function Zalozyciel() {
  const pl = useLang().lang === 'pl'
  const z = ZALOZYCIEL

  const kontakty = [
    { ikona: EnvelopeSimple, kolor: 'blue' as const, etykieta: 'E-mail', wartosc: z.email, href: `mailto:${z.email}` },
    ...(z.telefon ? [{ ikona: Phone, kolor: 'emerald' as const, etykieta: pl ? 'Telefon' : 'Phone', wartosc: z.telefon, href: `tel:${z.telefon.replace(/\s/g, '')}` }] : []),
    { ikona: GlobeHemisphereWest, kolor: 'graphite' as const, etykieta: pl ? 'Strona' : 'Website', wartosc: z.strona.replace(/^https?:\/\//, ''), href: z.strona },
  ]

  return (
    <section id="kto" className="l-section l-founder">
      <div className="l-wrap">
        <div className="l-founder__text">
          <h2>{pl ? 'Za Nobookingiem stoi jedna osoba, nie infolinia.' : 'One person runs Nobooking, not a call centre.'}</h2>
          <p>
            {pl
              ? `Nazywam się ${z.imie}. Nobooking projektuję i prowadzę sam — od kodu strony po odpowiedzi na maile — na każdy odpisuję osobiście. Jeśli coś na Twojej stronie nie działa, naprawia to ta sama osoba, która ją zbudowała.`
              : `My name is ${z.imie}. I design and run Nobooking myself — from the site code to answering emails, each of which I reply to personally. If something on your site breaks, the person who built it fixes it.`}
          </p>
        </div>

        <div className="l-founder__card">
          <div className="l-founder__who">
            {z.zdjecie
              ? <img src={z.zdjecie} alt={z.imie} width={64} height={64} className="l-founder__photo" />
              : <span className="l-founder__photo l-founder__photo--initials" aria-hidden>{z.inicjaly}</span>}
            <div>
              <b>{z.imie}</b>
              <span>{pl ? 'Założyciel Nobooking' : 'Founder of Nobooking'}</span>
            </div>
          </div>
          <div className="n-list">
            {kontakty.map(k => (
              <a key={k.etykieta} href={k.href} className="n-row l-founder__row" {...(k.href.startsWith('http') ? { target: '_blank', rel: 'noopener' } : {})}>
                <Kafelek ikona={k.ikona} kolor={k.kolor} rozmiar="sm" />
                <div className="n-row__txt"><span>{k.etykieta}</span><b>{k.wartosc}</b></div>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
