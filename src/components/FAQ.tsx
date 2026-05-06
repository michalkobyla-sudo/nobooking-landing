'use client'

import { useState } from 'react'
import { useLang } from '@/context/LangContext'
import { TR } from '@/lib/translations'

export default function FAQ() {
  const { lang } = useLang()
  const t = TR[lang]
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section id="faq" className="section-wrap">
      <div className="container">
        <div className="section-label">FAQ</div>
        <h2 className="section-title">{t.faqTitle}</h2>

        <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {t.faqs.map((faq, i) => (
            <div key={i} style={{
              border: '1px solid var(--color-border)',
              borderRadius: '12px',
              overflow: 'hidden',
            }}>
              <button onClick={() => setOpen(open === i ? null : i)} style={{
                width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '1.25rem 1.5rem', gap: '1rem',
                background: 'white', border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', textAlign: 'left',
              }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text)' }}>
                  {faq.q}
                </span>
                <svg
                  width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="var(--color-text-faint)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                  style={{ flexShrink: 0, transition: 'transform 0.2s', transform: open === i ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  <polyline points="6 9 12 15 18 9"/>
                </svg>
              </button>
              {open === i && (
                <div style={{ padding: '0 1.5rem 1.25rem', fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.7 }}>
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
