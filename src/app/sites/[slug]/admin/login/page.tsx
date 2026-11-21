'use client'

import { useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { bezpiecznyPowrot } from '@/lib/powrotPoLogowaniu'
import Kafelek from '@/components/ui/Kafelek'
import { Lock, WarningCircle } from '@/components/ui/ikony'

export default function OwnerLoginPage() {
  const router = useRouter()
  const params = useParams()
  const slug = params.slug as string

  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const res = await fetch(`/api/sites/${slug}/owner/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (!res.ok) {
      setError('Nieprawidłowe hasło.')
      setLoading(false)
      return
    }

    // `powrot` pochodzi z adresu, więc przed użyciem jest sprawdzany —
    // inaczej byłby to otwarty przekierowywacz pod naszą domeną.
    // Czytamy wprost z adresu, nie przez `useSearchParams` — ten wymusza
    // otoczenie strony `<Suspense>`, a tutaj parametr jest potrzebny dopiero
    // w obsłudze zdarzenia, gdy przeglądarka i tak już działa.
    const cel = bezpiecznyPowrot(
      new URLSearchParams(window.location.search).get('powrot'),
      slug,
    )

    // Trasy API odpowiadają przekierowaniem, nie stroną Reacta; `router.push`
    // ich nie obsłuży.
    if (cel.startsWith('/api/')) {
      window.location.href = cel
      return
    }

    router.push(cel)
    router.refresh()
  }

  return (
    <div className="n-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
            <Kafelek ikona={Lock} kolor="emerald" rozmiar="lg" />
          </div>
          <h1 style={{ fontSize: 30 }}>Panel właściciela</h1>
          <p className="n-page__lead" style={{ marginTop: 6 }}>{slug}</p>
        </div>

        <form onSubmit={handleLogin} className="n-form-card">
          <div className="n-field">
            <label htmlFor="haslo">Hasło</label>
            <input
              id="haslo"
              className="n-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              autoFocus
              required
            />
          </div>

          {error && (
            <div className="n-alert n-alert--error" role="alert"><WarningCircle weight="fill" aria-hidden />{error}</div>
          )}

          <button type="submit" disabled={loading} className="n-btn n-btn--primary n-btn--block">
            {loading ? <><span className="spinner" />Logowanie…</> : 'Zaloguj się'}
          </button>
        </form>
        <p className="n-fineprint">Działa na Nobooking</p>
      </div>
    </div>
  )
}
