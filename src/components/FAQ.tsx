'use client'

import { useState } from 'react'
import { useLang } from '@/context/LangContext'
import { TR } from '@/lib/translations'

export default function FAQ() {
  const { lang } = useLang()
  const t = TR[lang]
  const [open, setOpen] = useState<number | null>(null)

  return (
    <section style={{ padding: '5rem 1.5rem', backgroundColor: '#FAFAF8' }}>
      <div className="container" style={{ maxWidth: '720px' }}>
        <h2 className="section-title">{t.faqTitle}</h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '2rem' }}>
          {t.faqs.map((faq, i) => (
            <div key={i} style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              border: '1px solid #E5E7EB',
              overflow: 'hidden',
            }}>
              <button
                onClick={() => setOpen(open === i ? null : i)}
                style={{
                  width: '100%', textAlign: 'left',
                  padding: '1.1rem 1.25rem',
                  background: 'none', border: 'none',
                  cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  gap: '1rem',
                }}
              >
                <span style={{ fontWeight: 600, fontSize: '0.925rem', color: '#1A1A2E', lineHeight: 1.4 }}>
                  {faq.q}
                </span>
                <span style={{
                  fontSize: '1.2rem', color: '#2B7A78', flexShrink: 0,
                  transition: 'transform 0.2s',
                  transform: open === i ? 'rotate(45deg)' : 'none',
                  display: 'inline-block',
                }}>
                  +
                </span>
              </button>
              {open === i && (
                <div style={{ padding: '0 1.25rem 1.1rem', fontSize: '0.875rem', color: '#4B5563', lineHeight: 1.7 }}>
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
