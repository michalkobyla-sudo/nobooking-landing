'use client'

import { useState } from 'react'
import { useLang } from '@/context/LangContext'
import { TR } from '@/lib/translations'

export default function CommissionCalculator() {
  const { lang } = useLang()
  const t = TR[lang]

  const [rate, setRate] = useState(350)
  const [nights, setNights] = useState(22)
  const [commission, setCommission] = useState(17)

  const monthlyLoss = (rate * nights * commission) / 100
  const annualLoss = Math.round(monthlyLoss * 12)
  const roiDays = Math.ceil(799 / (monthlyLoss / 30))

  const roiNote = t.calcRoiNote.replace('{days}', String(roiDays))

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
          ].map(({ label, value, setter, suffix, min, max }) => (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.25rem',
            }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, flex: 1, color: '#374151' }}>
                {label}
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <input
                  type="number"
                  value={value}
                  min={min}
                  max={max}
                  onChange={e => setter(Number(e.target.value))}
                  style={{ width: '110px' }}
                />
                {suffix && <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', minWidth: '1rem' }}>{suffix}</span>}
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
              {annualLoss.toLocaleString('pl-PL')} {lang === 'pl' ? 'zł' : '€'}
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
              +{annualLoss.toLocaleString('pl-PL')} {lang === 'pl' ? 'zł' : '€'}
            </span>
          </div>

          <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--color-text-faint)', marginTop: '1rem' }}>
            {roiNote}
          </p>
        </div>
      </div>
    </section>
  )
}
