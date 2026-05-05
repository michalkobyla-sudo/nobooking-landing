'use client'

import { useState } from 'react'
import { useLang } from '@/context/LangContext'
import { TR } from '@/lib/translations'

export default function CommissionCalculator() {
  const { lang } = useLang()
  const t = TR[lang]
  const [rate, setRate] = useState(300)
  const [bookings, setBookings] = useState(20)

  const annualLoss = Math.round(bookings * 7 * rate * 0.17)
  const formatted = annualLoss.toLocaleString('pl-PL')

  return (
    <section style={{ padding: '5rem 1.5rem', backgroundColor: '#fff' }}>
      <div className="container">
        <h2 className="section-title">{t.calcTitle}</h2>
        <p className="section-subtitle">{t.calcSubtitle}</p>

        {/* Calculator widget */}
        <div style={{
          maxWidth: '560px', margin: '0 auto 3rem',
          backgroundColor: '#F8F9FA', borderRadius: '20px',
          padding: '2rem', border: '1px solid #E5E7EB',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', marginBottom: '1.5rem' }}>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem', color: '#374151' }}>
                {t.calcRateLabel}
              </label>
              <input
                type="number"
                min={50} max={5000} step={50}
                value={rate}
                onChange={e => setRate(Number(e.target.value))}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, display: 'block', marginBottom: '0.4rem', color: '#374151' }}>
                {t.calcBookingsLabel}
              </label>
              <input
                type="number"
                min={1} max={365} step={1}
                value={bookings}
                onChange={e => setBookings(Number(e.target.value))}
              />
            </div>
          </div>

          <p style={{ fontSize: '0.75rem', color: '#9CA3AF', marginBottom: '1.5rem' }}>{t.calcNightsNote}</p>

          <div style={{ backgroundColor: '#FEF3C7', borderRadius: '12px', padding: '1.25rem', textAlign: 'center', border: '1px solid #FDE68A' }}>
            <p style={{ fontSize: '0.85rem', color: '#92400E', marginBottom: '0.4rem' }}>{t.calcResultPrefix}</p>
            <p style={{ fontSize: '2.2rem', fontWeight: 800, color: '#DC2626', fontFamily: 'var(--font-cormorant), serif' }}>
              {formatted} zł
            </p>
          </div>

          <p style={{ fontSize: '0.82rem', color: '#6B7280', marginTop: '1rem', textAlign: 'center', lineHeight: 1.5 }}>
            {t.calcResultSuffix}
          </p>
        </div>

        {/* Pain points */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem', maxWidth: '800px', margin: '0 auto' }}>
          {[
            { icon: '💸', title: t.calcPain1Title, desc: t.calcPain1Desc },
            { icon: '📵', title: t.calcPain2Title, desc: t.calcPain2Desc },
            { icon: '🔒', title: t.calcPain3Title, desc: t.calcPain3Desc },
          ].map(p => (
            <div key={p.title} style={{
              backgroundColor: '#FFF5F5', borderRadius: '14px', padding: '1.25rem',
              border: '1px solid #FECACA', textAlign: 'center',
            }}>
              <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>{p.icon}</div>
              <p style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.3rem', color: '#1A1A2E' }}>{p.title}</p>
              <p style={{ fontSize: '0.82rem', color: '#6B7280' }}>{p.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
