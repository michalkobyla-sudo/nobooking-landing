'use client'

import { useState } from 'react'
import { useLang } from '@/context/LangContext'
import { TR } from '@/lib/translations'

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

/** Cena pakietu Basic, zgodna z `calcRoiNote` i cennikiem. */
const CENA_BASIC = { pl: 799, en: 199 }

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

  return (
    <section id="kalkulator" className="section-wrap" style={{ borderBottom: '1px solid var(--color-border-light)' }}>
      <div className="container">
        <div className="section-label">Kalkulator strat</div>
        <h2 className="section-title">{t.calcTitle}</h2>
        <p className="section-sub">{t.calcSubtitle}</p>

        <div style={{
          background: '#F9FAFB', border: '1px solid var(--color-border)',
          borderRadius: 'var(--radius-xl)', padding: '2.5rem',
          maxWidth: '640px', margin: '0 auto',
        }}>
          {/* Inputs */}
          {[
            { label: t.calcRateLabel, value: rate, setter: setRate, suffix: lang === 'pl' ? 'zł' : '€', min: 50, max: 5000 },
            { label: t.calcNightsLabel, value: nights, setter: setNights, suffix: '', min: 1, max: 31 },
            { label: t.calcCommissionLabel, value: commission, setter: setCommission, suffix: '%', min: 1, max: 30 },
            { label: t.calcDirectLabel, value: direct, setter: setDirect, suffix: '%', min: 0, max: 100 },
          ].map(({ label, value, setter, suffix, min, max }) => (
            <div key={label} style={{
              display: 'flex', alignItems: 'baseline', gap: '1rem', marginBottom: '1.25rem',
            }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, flex: 1, color: '#374151', lineHeight: 1.4 }}>
                {label}
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0, width: '148px' }}>
                <input
                  type="number"
                  value={value}
                  min={min}
                  max={max}
                  onChange={e => setter(Number(e.target.value))}
                  style={{ width: '110px', flexShrink: 0 }}
                />
                <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', width: '1.5rem', flexShrink: 0 }}>{suffix}</span>
              </div>
            </div>
          ))}

          <hr style={{ border: 'none', borderTop: '1px solid var(--color-border)', margin: '1.5rem 0' }}/>

          {/* Loss result */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: '#FEF2F2', border: '1px solid #FECACA',
            borderRadius: '12px', padding: '1.25rem 1.5rem', marginBottom: '0.875rem',
          }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-pain)' }}>
              {t.calcLossLabel}
            </span>
            <span style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--color-pain)' }}>
              {annualLoss.toLocaleString('pl-PL')} {waluta}
            </span>
          </div>

          {/* Saving result */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            background: 'var(--color-accent-light)', border: '1px solid var(--color-accent-border)',
            borderRadius: '12px', padding: '1.25rem 1.5rem',
          }}>
            <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--color-accent)' }}>
              {t.calcSavingLabel}
            </span>
            <span style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.04em', color: 'var(--color-accent)' }}>
              +{annualSaving.toLocaleString('pl-PL')} {waluta}
            </span>
          </div>

          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-faint)', marginTop: '1.125rem', lineHeight: 1.65 }}>
            {przypis}
          </p>

          {roiNote && (
            <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--color-text-faint)', marginTop: '0.75rem', fontWeight: 600 }}>
              {roiNote}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
