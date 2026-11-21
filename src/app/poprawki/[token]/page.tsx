'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { adresSerwisu } from '@/lib/adresSerwisu'
import Kafelek from '@/components/ui/Kafelek'
import { ArrowSquareOut, Browser, CheckCircle, Info, MagnifyingGlass, PencilSimple, WarningCircle } from '@/components/ui/ikony'

interface RevisionData {
  found: boolean
  first_name?: string
  apartment_name?: string
  plan?: 'basic' | 'pro'
  site_slug?: string
  revision_count?: number
  revisions_left?: number
}

const SITE_URL = adresSerwisu()

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
      <div className="n-page" style={{ display: 'grid', placeItems: 'center' }}>
        <span className="spinner" style={{ width: 32, height: 32, borderWidth: 3, borderColor: 'var(--color-border)', borderTopColor: 'var(--emerald)' }} />
      </div>
    )
  }

  const adresStrony = data?.site_slug ? `${SITE_URL}/sites/${data.site_slug}` : null

  if (!data?.found) {
    return (
      <Komunikat ikona={<MagnifyingGlass weight="fill" size={64} color="var(--ios-graphite)" aria-hidden />} tytul="Nie znaleziono formularza">
        Ten link jest nieprawidłowy lub wygasł.
      </Komunikat>
    )
  }

  if (data.revisions_left === 0 && !submitted) {
    return (
      <Komunikat ikona={<CheckCircle weight="fill" size={64} color="var(--emerald)" aria-hidden />} tytul="Wszystkie rundy poprawek wykorzystane"
        link={adresStrony ? { href: adresStrony, tekst: 'Zobacz swoją stronę' } : undefined}>
        Twoja strona jest gotowa. Jeśli potrzebujesz dalszych zmian, napisz na <a href="mailto:kontakt@nobooking.eu">kontakt@nobooking.eu</a>.
      </Komunikat>
    )
  }

  if (submitted) {
    return (
      <Komunikat ikona={<CheckCircle weight="fill" size={64} color="var(--emerald)" aria-hidden />} tytul="Poprawki przyjęte"
        link={adresStrony ? { href: adresStrony, tekst: 'Zobacz obecną wersję' } : undefined}>
        Budujemy stronę od nowa z Twoimi uwagami. Gdy będzie gotowa, dostaniesz maila.
      </Komunikat>
    )
  }

  const roundLabel = (data.revision_count ?? 0) + 1
  const revisionsLeft = data.revisions_left ?? 0

  return (
    <div className="n-page">
      <div className="n-page__inner" style={{ maxWidth: 600 }}>
        <span className="n-chip" style={{ marginBottom: 14 }}>
          <Kafelek ikona={PencilSimple} kolor="orange" rozmiar="xs" />
          Runda {roundLabel} z 4
        </span>
        <h1>Co chcesz zmienić?</h1>
        <p className="n-page__lead">Opisz dokładnie, co poprawić: tekst, kolory, cennik, układ.</p>

        <div style={{ display: 'flex', gap: 6, margin: '20px 0 24px' }} aria-hidden>
          {[1, 2, 3, 4].map(i => (
            <span key={i} style={{ flex: 1, height: 6, borderRadius: 3, background: i <= roundLabel ? 'var(--emerald)' : '#DADDDC' }} />
          ))}
        </div>

        {adresStrony && (
          <a href={adresStrony} target="_blank" rel="noreferrer" className="n-summary" style={{ textDecoration: 'none', marginBottom: 20 }}>
            <Kafelek ikona={Browser} kolor="emerald" />
            <span className="n-summary__txt"><span>Podgląd strony</span><b>{data.apartment_name}</b></span>
            <ArrowSquareOut weight="bold" size={20} color="var(--emerald-dark)" aria-hidden />
          </a>
        )}

        <form onSubmit={handleSubmit} className="n-form-card">
          <label className="n-field">
            <span className="n-label">Twoje uwagi</span>
            <textarea
              className="n-input"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="np. Zmień kolor główny na granatowy, skróć opis. Dodaj informację o parkingu podziemnym. Cena w niskim sezonie: 95 €, nie 80 €."
              rows={7}
              required
            />
          </label>

          {revisionsLeft <= 1 && (
            <div className="n-alert n-alert--info"><Info weight="fill" aria-hidden />To Twoja ostatnia runda poprawek.</div>
          )}
          {error && (
            <div className="n-alert n-alert--error" role="alert"><WarningCircle weight="fill" aria-hidden />{error}</div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <span className="n-hint">Pozostało rund: <strong style={{ color: 'var(--ink)' }}>{revisionsLeft}</strong> z 4</span>
            <button type="submit" disabled={submitting || !notes.trim()} className="n-btn n-btn--primary">
              {submitting ? <><span className="spinner" />Wysyłam…</> : 'Wyślij poprawki'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function Komunikat({ ikona, tytul, link, children }: {
  ikona: React.ReactNode; tytul: string; link?: { href: string; tekst: string }; children: React.ReactNode
}) {
  return (
    <div className="n-page" style={{ display: 'flex', alignItems: 'center' }}>
      <div className="n-page__inner" style={{ maxWidth: 480, textAlign: 'center' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 18 }}>{ikona}</div>
        <h1>{tytul}</h1>
        <p className="n-page__lead">{children}</p>
        {link && <a href={link.href} className="n-btn n-btn--primary" style={{ marginTop: 24 }}>{link.tekst}</a>}
      </div>
    </div>
  )
}
