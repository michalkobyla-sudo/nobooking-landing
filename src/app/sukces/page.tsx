'use client'

import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'

function SukcesContent() {
  const searchParams = useSearchParams()
  const plan = searchParams.get('plan') ?? 'basic'
  const planLabel = plan === 'pro' ? 'Nobooking Pro' : 'Nobooking Basic'

  return (
    <div style={{ minHeight: '100vh', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ textAlign: 'center', maxWidth: '540px' }}>
        <div style={{
          width: '72px', height: '72px',
          background: 'var(--color-accent)', borderRadius: '50%',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 1.5rem',
          fontSize: '2rem', color: 'white', fontWeight: 800,
        }}>
          ✓
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.5rem', color: '#111827' }}>
          Płatność przyjęta!
        </h1>
        <p style={{ fontSize: '1rem', color: 'var(--color-accent)', fontWeight: 600, marginBottom: '1.5rem' }}>
          {planLabel}
        </p>
        <div style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-xl)', padding: '1.75rem', textAlign: 'left', marginBottom: '2rem' }}>
          <p style={{ fontWeight: 700, marginBottom: '0.75rem', color: '#111827' }}>Co teraz?</p>
          <ol style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', color: '#374151', fontSize: '0.9rem', lineHeight: 1.6 }}>
            <li>Wkrótce dostaniesz od nas email z formularzem onboardingowym.</li>
            <li>Wypełnij formularz — opisz apartament, podaj zdjęcia i ceny.</li>
            <li>Zbudujemy Twoją stronę w ciągu <strong>7 dni roboczych</strong>.</li>
          </ol>
        </div>
        <a href="/" style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', textDecoration: 'none' }}>
          ← Wróć na stronę główną
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
