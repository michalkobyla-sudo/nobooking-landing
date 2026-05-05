'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { useLang } from '@/context/LangContext'
import { TR } from '@/lib/translations'

function SukcesContent() {
  const { lang } = useLang()
  const t = TR[lang]
  const searchParams = useSearchParams()
  const plan = searchParams.get('plan') ?? 'basic'
  const planLabel = plan === 'pro' ? 'Nobooking Pro' : 'Nobooking Basic'
  const demoUrl = process.env.NEXT_PUBLIC_DEMO_URL || 'https://demo.nobooking.eu'

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F0FAF9', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ textAlign: 'center', maxWidth: '520px' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🎉</div>
        <h1 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem', color: '#1A1A2E' }}>
          {t.successTitle}
        </h1>
        <p style={{ fontSize: '0.95rem', color: '#2B7A78', fontWeight: 600, marginBottom: '1rem' }}>
          {planLabel}
        </p>
        <p style={{ color: '#4B5563', lineHeight: 1.7, marginBottom: '2rem' }}>
          {t.successText}
        </p>
        <a href={demoUrl} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ fontSize: '1rem' }}>
          {t.successCta}
        </a>
      </div>
    </div>
  )
}

export default function SukcesPage() {
  return (
    <Suspense>
      <SukcesContent />
    </Suspense>
  )
}
