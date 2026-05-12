'use client'

import { useState, useRef, useEffect } from 'react'
import { useLang } from '@/context/LangContext'
import { TR } from '@/lib/translations'

function AccordionItem({ q, a, open, onToggle }: { q: string; a: string; open: boolean; onToggle: () => void }) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState(0)

  useEffect(() => {
    if (bodyRef.current) {
      setHeight(bodyRef.current.scrollHeight)
    }
  }, [a])

  return (
    <div style={{
      border: '1px solid var(--color-border)',
      borderRadius: '12px',
      overflow: 'hidden',
      transition: 'border-color var(--transition-fast)',
      ...(open ? { borderColor: 'var(--color-accent-border)' } : {}),
    }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '1.125rem 1.5rem', gap: '1rem',
          background: open ? '#FAFFFE' : 'white', border: 'none', cursor: 'pointer',
          fontFamily: 'inherit', textAlign: 'left',
          transition: 'background var(--transition-fast)',
        }}>
        <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.4 }}>
          {q}
        </span>
        <span style={{
          width: '28px', height: '28px', borderRadius: '8px', flexShrink: 0,
          background: open ? 'var(--color-accent)' : 'var(--color-bg-alt)',
          border: '1px solid ' + (open ? 'var(--color-accent)' : 'var(--color-border)'),
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'background var(--transition-fast), border-color var(--transition-fast)',
        }}>
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke={open ? 'white' : 'var(--color-text-faint)'}
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ transition: 'transform var(--transition-base)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </span>
      </button>

      {/* CSS-animated body — no conditional render, just height transition */}
      <div style={{
        maxHeight: open ? `${height}px` : '0px',
        overflow: 'hidden',
        transition: 'max-height 0.32s cubic-bezier(0.4, 0, 0.2, 1)',
      }}>
        <div ref={bodyRef} style={{
          padding: '0 1.5rem 1.25rem',
          fontSize: '0.875rem', color: 'var(--color-text-muted)', lineHeight: 1.75,
          borderTop: '1px solid var(--color-border-light)',
          paddingTop: '1rem',
        }}>
          {a}
        </div>
      </div>
    </div>
  )
}

export default function FAQ() {
  const { lang } = useLang()
  const t = TR[lang]
  const [open, setOpen] = useState<number | null>(0) // first item open by default

  return (
    <section id="faq" className="section-wrap">
      <div className="container">
        <div className="section-label">FAQ</div>
        <h2 className="section-title">{t.faqTitle}</h2>

        <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {t.faqs.map((faq, i) => (
            <AccordionItem
              key={i}
              q={faq.q}
              a={faq.a}
              open={open === i}
              onToggle={() => setOpen(open === i ? null : i)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
