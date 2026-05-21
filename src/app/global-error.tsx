'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body>
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center',
          justifyContent: 'center', padding: '2rem',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          background: '#FAFAFA',
        }}>
          <div style={{ textAlign: 'center', maxWidth: '480px' }}>
            <div style={{
              width: 56, height: 56, borderRadius: 14,
              background: '#FEF2F2', margin: '0 auto 1.5rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <h1 style={{ fontSize: '1.375rem', fontWeight: 800, color: '#111827', marginBottom: '0.625rem', letterSpacing: '-0.03em' }}>
              Coś poszło nie tak
            </h1>
            <p style={{ fontSize: '0.875rem', color: '#6B7280', lineHeight: 1.65, marginBottom: '1.75rem' }}>
              Wystąpił nieoczekiwany błąd. Nasz zespół został automatycznie powiadomiony.
            </p>
            <button
              onClick={reset}
              style={{
                background: '#111827', color: 'white', border: 'none',
                borderRadius: 100, padding: '0.75rem 1.75rem',
                fontSize: '0.875rem', fontWeight: 700, cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Spróbuj ponownie
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
