'use client'

import { useLang } from '@/context/LangContext'
import { TR } from '@/lib/translations'

export default function HowItWorks() {
  const { lang } = useLang()
  const t = TR[lang]

  const steps = [
    { num: '1', icon: '🛒', title: t.howStep1Title, desc: t.howStep1Desc },
    { num: '2', icon: '📋', title: t.howStep2Title, desc: t.howStep2Desc },
    { num: '3', icon: '🚀', title: t.howStep3Title, desc: t.howStep3Desc },
  ]

  return (
    <section style={{ padding: '5rem 1.5rem', backgroundColor: '#FAFAF8' }}>
      <div className="container">
        <h2 className="section-title">{t.howTitle}</h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '2rem', maxWidth: '860px', margin: '0 auto' }}>
          {steps.map((step) => (
            <div key={step.num} style={{ textAlign: 'center', position: 'relative' }}>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                backgroundColor: '#2B7A78', color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1rem',
                fontFamily: 'var(--font-cormorant), serif',
                fontSize: '1.75rem', fontWeight: 700,
              }}>
                {step.num}
              </div>
              <div style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>{step.icon}</div>
              <h3 style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.5rem', color: '#1A1A2E' }}>
                {step.title}
              </h3>
              <p style={{ fontSize: '0.875rem', color: '#6B7280', lineHeight: 1.6 }}>{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
