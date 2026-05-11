'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

interface RevisionData {
  found: boolean
  first_name?: string
  apartment_name?: string
  plan?: 'basic' | 'pro'
  site_slug?: string
  revision_count?: number
  revisions_left?: number
}

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://nobooking.eu'

export default function PoprawkiPage() {
  const { token } = useParams<{ token: string }>()
  const [data, setData] = useState<RevisionData | null>(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/revisions/${token}`)
      .then(r => r.json())
      .then((d: RevisionData) => { setData(d); setLoading(false) })
      .catch(() => { setData({ found: false }); setLoading(false) })
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!notes.trim()) return
    setSubmitting(true)
    setError(null)

    try {
      const res = await fetch(`/api/revisions/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      })
      if (!res.ok) {
        const d = await res.json() as { error?: string }
        throw new Error(d.error || 'Błąd serwera')
      }
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Spróbuj ponownie')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div style={styles.center}>
        <div style={styles.spinner} />
      </div>
    )
  }

  if (!data?.found) {
    return (
      <div style={styles.center}>
        <div style={styles.card}>
          <div style={styles.emoji}>🔍</div>
          <h1 style={styles.title}>Nie znaleziono formularza</h1>
          <p style={styles.subtitle}>Ten link jest nieprawidłowy lub wygasł.</p>
        </div>
      </div>
    )
  }

  if (data.revisions_left === 0 && !submitted) {
    return (
      <div style={styles.center}>
        <div style={styles.card}>
          <div style={styles.emoji}>✅</div>
          <h1 style={styles.title}>Wykorzystałeś wszystkie rundy poprawek</h1>
          <p style={styles.subtitle}>
            Twoja strona jest gotowa. Skontaktuj się z nami jeśli potrzebujesz dalszych zmian.
          </p>
          {data.site_slug && (
            <a href={`${SITE_URL}/sites/${data.site_slug}`} style={styles.btn}>
              Zobacz swoją stronę →
            </a>
          )}
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div style={styles.center}>
        <div style={styles.card}>
          <div style={styles.emoji}>🎉</div>
          <h1 style={styles.title}>Poprawki przyjęte!</h1>
          <p style={styles.subtitle}>
            Regenerujemy Twoją stronę na podstawie uwag. Wyślemy Ci nowy podgląd za kilka minut.
          </p>
          {data.site_slug && (
            <a href={`${SITE_URL}/sites/${data.site_slug}`} style={{ ...styles.btn, marginTop: '1.5rem' }}>
              Zobacz obecną wersję →
            </a>
          )}
        </div>
      </div>
    )
  }

  const roundLabel = (data.revision_count ?? 0) + 1
  const revisionsLeft = data.revisions_left ?? 0

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={styles.logo}>
          <span style={{ color: 'rgba(255,255,255,0.6)' }}>No</span>booking
        </div>
        <p style={styles.headerSub}>Runda poprawek {roundLabel} z 4</p>
      </div>

      <div style={styles.container}>
        <div style={styles.progressBar}>
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              style={{
                ...styles.progressDot,
                background: i <= roundLabel ? '#059669' : '#e5e7eb',
              }}
            />
          ))}
        </div>

        {data.site_slug && (
          <div style={styles.previewBox}>
            <span style={{ fontSize: '1rem' }}>🏠</span>
            <span style={{ flex: 1, fontWeight: 600 }}>{data.apartment_name}</span>
            <a
              href={`${SITE_URL}/sites/${data.site_slug}`}
              target="_blank"
              rel="noreferrer"
              style={styles.previewLink}
            >
              Otwórz podgląd →
            </a>
          </div>
        )}

        <form onSubmit={handleSubmit} style={styles.form}>
          <h2 style={styles.formTitle}>Co chcesz zmienić?</h2>
          <p style={styles.formHint}>
            Opisz dokładnie co poprawić — tekst, kolory, cennik, układ, cokolwiek.
            {revisionsLeft <= 1 && (
              <strong style={{ color: '#dc2626' }}> To Twoja ostatnia runda poprawek!</strong>
            )}
          </p>

          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="np. Zmień kolor główny na granatowy, popraw opis w sekcji 'Opis' — za długi. Dodaj informację o parkingu podziemnym. Cena w niskim sezonie powinna być 95€ a nie 80€."
            rows={7}
            style={styles.textarea}
            required
          />

          {error && (
            <div style={styles.errorBox}>{error}</div>
          )}

          <div style={styles.actions}>
            <span style={styles.roundInfo}>
              Pozostało rund: <strong>{revisionsLeft}</strong> z 4
            </span>
            <button
              type="submit"
              disabled={submitting || !notes.trim()}
              style={{
                ...styles.submitBtn,
                opacity: (submitting || !notes.trim()) ? 0.6 : 1,
              }}
            >
              {submitting ? 'Wysyłam...' : 'Wyślij poprawki →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    background: '#f9fafb',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  },
  header: {
    background: '#059669',
    padding: '1.5rem 2rem',
    textAlign: 'center',
  },
  logo: {
    fontSize: '1.5rem',
    fontWeight: 900,
    color: 'white',
    letterSpacing: '-0.04em',
  },
  headerSub: {
    color: 'rgba(255,255,255,0.8)',
    margin: '0.5rem 0 0',
    fontSize: '0.875rem',
  },
  container: {
    maxWidth: '600px',
    margin: '2rem auto',
    padding: '0 1rem',
  },
  progressBar: {
    display: 'flex',
    gap: '0.5rem',
    justifyContent: 'center',
    marginBottom: '1.5rem',
  },
  progressDot: {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    transition: 'background 0.2s',
  },
  previewBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    background: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '10px',
    padding: '1rem 1.25rem',
    marginBottom: '1.5rem',
    fontSize: '0.875rem',
  },
  previewLink: {
    color: '#059669',
    fontWeight: 700,
    textDecoration: 'none',
    whiteSpace: 'nowrap',
  },
  form: {
    background: 'white',
    borderRadius: '12px',
    padding: '2rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  },
  formTitle: {
    fontSize: '1.25rem',
    fontWeight: 800,
    color: '#111827',
    margin: '0 0 0.5rem',
  },
  formHint: {
    fontSize: '0.875rem',
    color: '#6b7280',
    margin: '0 0 1.25rem',
    lineHeight: 1.6,
  },
  textarea: {
    width: '100%',
    padding: '0.875rem 1rem',
    border: '1.5px solid #e5e7eb',
    borderRadius: '8px',
    fontSize: '0.9rem',
    lineHeight: 1.6,
    resize: 'vertical',
    fontFamily: 'inherit',
    color: '#1a1a1a',
    boxSizing: 'border-box',
    outline: 'none',
  },
  errorBox: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '0.75rem 1rem',
    color: '#dc2626',
    fontSize: '0.875rem',
    marginTop: '1rem',
  },
  actions: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '1.25rem',
    gap: '1rem',
    flexWrap: 'wrap',
  },
  roundInfo: {
    fontSize: '0.8rem',
    color: '#9ca3af',
  },
  submitBtn: {
    background: '#059669',
    color: 'white',
    border: 'none',
    padding: '0.875rem 2rem',
    borderRadius: '8px',
    fontWeight: 700,
    fontSize: '0.95rem',
    cursor: 'pointer',
    transition: 'opacity 0.15s',
  },
  center: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    fontFamily: '-apple-system, sans-serif',
  },
  card: {
    textAlign: 'center',
    maxWidth: '480px',
  },
  emoji: {
    fontSize: '3rem',
    marginBottom: '1rem',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 800,
    color: '#111827',
    marginBottom: '0.75rem',
  },
  subtitle: {
    color: '#6b7280',
    fontSize: '0.9rem',
    lineHeight: 1.6,
  },
  btn: {
    display: 'inline-block',
    background: '#059669',
    color: 'white',
    padding: '0.875rem 2rem',
    borderRadius: '8px',
    textDecoration: 'none',
    fontWeight: 700,
    marginTop: '1.5rem',
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #e5e7eb',
    borderTop: '3px solid #059669',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
}
