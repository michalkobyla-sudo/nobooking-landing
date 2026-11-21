'use client'

import { useState } from 'react'
import { useLang } from '@/context/LangContext'
import { TR } from '@/lib/translations'
import { PRICES } from '@/lib/prices'
import Kafelek from '@/components/ui/Kafelek'
import { Calculator, HouseLine } from '@/components/ui/ikony'

/**
 * Kalkulator prowizji.
 *
 * Wczesniej pokazywal jako oszczednosc **cala** roczna prowizje Booking.com —
 * czyli zakladal, ze kazdy gosc, ktory dzis przychodzi z portalu, jutro
 * zarezerwuje bezposrednio. Tak nie jest i nikt doswiadczony w to nie uwierzy,
 * a obietnica na stronie sprzedazowej jest zobowiazaniem (zasada Z1).
 *
 * Teraz wlasciciel sam ustawia, jaka czesc rezerwacji realnie przejmie, a od
 * przejetych odejmujemy oplaty Stripe — bo przy direct charges to on jest
 * sprzedawca i to on je placi.
 */

/** Oplaty Stripe, stawka standardowa dla kart europejskich (stripe.com/pl/pricing,
 *  sprawdzone 2026-10-01). Realna zalezy od konta i kraju karty gościa — mowi
 *  o tym przypis pod wynikiem. */
const STRIPE_PROCENT = 1.5
const STRIPE_STALA = { pl: 1, en: 0.25 }

/** Cena pakietu Basic — z `prices.ts`, żeby kalkulator zwrotu liczył tę samą
 *  kwotę, którą pobiera Stripe. Wcześniej stały tu dwie liczby wpisane ręcznie. */
const CENA_BASIC = { pl: PRICES.basic.pln / 100, en: PRICES.basic.eur / 100 }

/** Z translations: zakladamy srednio tyle nocy na rezerwacje. */
const NOCY_NA_REZERWACJE = 7

function wZakresie(v: number, min: number, max: number): number {
  if (!Number.isFinite(v)) return min
  return Math.min(max, Math.max(min, v))
}

export default function CommissionCalculator() {
  const { lang } = useLang()
  const t = TR[lang]

  const [rate, setRate] = useState(350)
  const [nights, setNights] = useState(22)
  const [commission, setCommission] = useState(17)
  const [direct, setDirect] = useState(50)

  const waluta = lang === 'pl' ? 'zł' : '€'
  const stalaStripe = STRIPE_STALA[lang] ?? STRIPE_STALA.en
  const cena = CENA_BASIC[lang] ?? CENA_BASIC.en

  // Wartosci z pola liczbowego moga byc puste albo spoza zakresu — bez tego
  // wyczyszczenie pola dawalo w przypisie "~Infinity dni".
  const cena_noc  = wZakresie(rate, 0, 5000)
  const noce      = wZakresie(nights, 0, 31)
  const prowizja  = wZakresie(commission, 0, 30)
  const udzial    = wZakresie(direct, 0, 100)

  const obrotRoczny = cena_noc * noce * 12
  const annualLoss  = Math.round((obrotRoczny * prowizja) / 100)

  // Przejmujemy tylko czesc rezerwacji; od niej odchodza oplaty Stripe.
  const obrotPrzejety   = (obrotRoczny * udzial) / 100
  const prowizjaWrocona = (obrotPrzejety * prowizja) / 100
  const liczbaPlatnosci = (noce * 12 * udzial) / 100 / NOCY_NA_REZERWACJE
  const kosztStripe     = (obrotPrzejety * STRIPE_PROCENT) / 100 + liczbaPlatnosci * stalaStripe
  const annualSaving    = Math.max(0, Math.round(prowizjaWrocona - kosztStripe))

  const roiDays = annualSaving > 0 ? Math.ceil(cena / (annualSaving / 365)) : null
  const roiNote = roiDays === null ? '' : t.calcRoiNote.replace('{days}', String(roiDays))
  const przypis = t.calcAssumptions.replace(
    '{fee}',
    `${String(STRIPE_PROCENT).replace('.', lang === 'pl' ? ',' : '.')}% + ${String(stalaStripe).replace('.', lang === 'pl' ? ',' : '.')} ${waluta}`,
  )

  const pl = lang === 'pl'
  const kwota = (n: number) => `${n.toLocaleString('pl-PL')} ${waluta}`
  const pola = [
    { id: 'kalk-cena', label: t.calcRateLabel, value: rate, setter: setRate, suffix: waluta, min: 50, max: 5000 },
    { id: 'kalk-noce', label: t.calcNightsLabel, value: nights, setter: setNights, suffix: '', min: 1, max: 31 },
    { id: 'kalk-prowizja', label: t.calcCommissionLabel, value: commission, setter: setCommission, suffix: '%', min: 1, max: 30 },
    { id: 'kalk-udzial', label: t.calcDirectLabel, value: direct, setter: setDirect, suffix: '%', min: 0, max: 100 },
  ]

  return (
    <section id="kalkulator" className="l-section l-alt">
      <div className="l-wrap">
        <div className="l-head">
          <h2>{pl ? 'Portale biorą część każdej rezerwacji. My nie.' : 'Portals take a cut of every booking. We don’t.'}</h2>
          <p>{pl ? 'Płacisz raz za dwa lata. Ile zarobisz na rezerwacji, tyle zostaje u Ciebie.' : 'You pay once for two years. What you earn on a booking stays with you.'}</p>
        </div>

        <div className="l-widgets">
          <div className="l-widget">
            <div className="l-widget__head"><span className="n-dot" style={{ background: '#003B95' }} />Booking.com</div>
            <div className="l-widget__big">~15%</div>
            <p>{pl ? 'prowizji od każdej rezerwacji, co roku.' : 'commission on every booking, every year.'}</p>
          </div>
          <div className="l-widget">
            <div className="l-widget__head"><span className="n-dot" style={{ background: '#FF5A5F' }} />Airbnb</div>
            <div className="l-widget__big">3–17%</div>
            <p>{pl ? 'opłat zależnie od modelu rozliczeń.' : 'in fees, depending on the fee model.'}</p>
          </div>
          <div className="l-widget l-widget--dark">
            <div className="l-widget__head"><Kafelek ikona={HouseLine} kolor="emerald" rozmiar="xs" />Nobooking</div>
            <div className="l-widget__big">0%</div>
            <p>{pl ? `prowizji. Od ${kwota(cena)} za 2 lata, jednorazowo.` : `commission. From ${kwota(cena)} for 2 years, one-time.`}</p>
          </div>
        </div>

        <div className="l-calc">
          <div>
            <p className="n-group-label">
              <Kafelek ikona={Calculator} kolor="orange" rozmiar="xs" />
              {t.calcTitle}
            </p>
            <div className="n-list l-calc__inputs">
              {pola.map(({ id, label, value, setter, suffix, min, max }) => (
                <div key={id} className="n-row">
                  <label htmlFor={id}>{label}</label>
                  <span className="l-num">
                    <input id={id} type="number" inputMode="numeric" value={value} min={min} max={max}
                      onChange={e => setter(Number(e.target.value))} />
                    <span className="l-calc__unit">{suffix}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div className="l-calc__result" aria-live="polite">
            <div className="l-calc__line l-calc__line--loss">
              <span>{t.calcLossLabel}</span>
              <b>{kwota(annualLoss)}</b>
            </div>
            <div className="l-calc__line l-calc__line--gain">
              <span>{t.calcSavingLabel}</span>
              <b>+{kwota(annualSaving)}</b>
            </div>
            {roiNote && <p className="l-calc__roi">{roiNote}</p>}
          </div>
        </div>
        <p className="l-calc__note">{przypis}</p>
      </div>
    </section>
  )
}
