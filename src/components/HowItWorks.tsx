'use client'

import { useLang } from '@/context/LangContext'
import { TR } from '@/lib/translations'

export default function HowItWorks() {
  const { lang } = useLang()
  const t = TR[lang]

  const steps = [
    { num: '1', title: t.howStep1Title, desc: t.howStep1Desc },
    { num: '2', title: t.howStep2Title, desc: t.howStep2Desc },
    { num: '3', title: t.howStep3Title, desc: t.howStep3Desc },
  ]

  return (
    <section id="jak-dziala" className="section-wrap section-wrap--alt">
      <div className="container">
        <div className="section-label">{lang === 'pl' ? 'Jak to działa' : 'How it works'}</div>
        <h2 className="section-title">{t.howTitle}</h2>
        <p className="section-sub">
          {lang === 'pl' ? 'Bez kodowania, bez agencji, bez miesięcznych abonamentów.' : 'No coding, no agencies, no monthly subscriptions.'}
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '2rem',
        }}>
          {steps.map(step => (
            <div key={step.num} style={{
              textAlign: 'center',
              padding: '2rem 1.5rem',
            }}>
              <div style={{
                width: '48px', height: '48px',
                background: 'var(--color-dark)', color: 'white',
                borderRadius: '14px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.1rem', fontWeight: 800,
                margin: '0 auto 1.25rem',
              }}>
                {step.num}
              </div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                {step.title}
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.65 }}>
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
