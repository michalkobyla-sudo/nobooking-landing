'use client'

import { useLang } from '@/context/LangContext'

/**
 * Cztery rzeczy, które dostajesz w pakiecie, każda sprawdzona w kodzie i w Stripe:
 * czas startu (FAQ „Ile trwa wdrożenie?”), metody płatności (konfiguracja
 * płatności kont połączonych — BLIK tylko w PLN), języki strony (`apartmentTypes`)
 * i jednorazowa opłata (`prices.ts`). Nie piszemy tu niczego, czego nie ma w produkcie.
 */
export default function Przewagi() {
  const pl = useLang().lang === 'pl'

  const fakty = pl
    ? [
        { duze: '24 h', tytul: 'od formularza do strony', tekst: 'Tyle zwykle trwa przygotowanie strony. Najpóźniej 7 dni roboczych.' },
        { duze: '0 zł', tytul: 'dopłat za płatności online', tekst: 'Karta, Apple Pay i Google Pay, a przy cenach w złotówkach BLIK — w pakiecie, przez Twoje konto Stripe.' },
        { duze: '4', tytul: 'języki strony', tekst: 'Polski, angielski, hiszpański i niemiecki. Gość z zagranicy rezerwuje w swoim.' },
        { duze: '1', tytul: 'opłata na dwa lata', tekst: 'Bez abonamentu. Poza sezonem nie płacisz nic więcej.' },
      ]
    : [
        { duze: '24 h', tytul: 'from form to live site', tekst: 'That is how long setup usually takes. At most 7 business days.' },
        { duze: '€0', tytul: 'extra for online payments', tekst: 'Card, Apple Pay and Google Pay, plus BLIK for prices in złoty — included, through your own Stripe account.' },
        { duze: '4', tytul: 'site languages', tekst: 'Polish, English, Spanish and German. Guests from abroad book in their own.' },
        { duze: '1', tytul: 'payment for two years', tekst: 'No subscription. Nothing more to pay off-season.' },
      ]

  return (
    <section className="l-edge" aria-labelledby="przewagi-tytul">
      <div className="l-wrap">
        <h2 id="przewagi-tytul">
          {pl ? 'Wszystko, czego potrzebuje rezerwacja, jest w cenie.' : 'Everything a booking needs is included.'}
        </h2>
        <dl className="l-edge__facts">
          {fakty.map(f => (
            <div key={f.tytul} className="l-edge__fact">
              <dt><b>{f.duze}</b><span>{f.tytul}</span></dt>
              <dd>{f.tekst}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
