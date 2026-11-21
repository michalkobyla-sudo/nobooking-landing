'use client'

import { useState } from 'react'
import { createBrowserClient } from '@supabase/ssr'
import { useRouter } from 'next/navigation'
import Kafelek from '@/components/ui/Kafelek'
import { HouseLine, WarningCircle } from '@/components/ui/ikony'

export default function AdminLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    // createBrowserClient stores session in cookies (readable by SSR proxy)
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Nieprawidłowy email lub hasło.')
      setLoading(false)
      return
    }

    router.push('/admin/zamowienia')
    router.refresh()
  }

  return (
    <div className="n-page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
            <Kafelek ikona={HouseLine} kolor="emerald" rozmiar="lg" />
          </div>
          <h1 style={{ fontSize: 30 }}>Nobooking Admin</h1>
          <p className="n-page__lead" style={{ marginTop: 6 }}>Zamówienia, strony i bot</p>
        </div>

        <form onSubmit={handleLogin} className="n-form-card">
          <div className="n-field">
            <label htmlFor="email">Email</label>
            <input id="email" className="n-input" type="email" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" autoFocus required />
          </div>
          <div className="n-field">
            <label htmlFor="haslo">Hasło</label>
            <input id="haslo" className="n-input" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required />
          </div>

          {error && (
            <div className="n-alert n-alert--error" role="alert"><WarningCircle weight="fill" aria-hidden />{error}</div>
          )}

          <button type="submit" disabled={loading} className="n-btn n-btn--primary n-btn--block">
            {loading ? <><span className="spinner" />Logowanie…</> : 'Zaloguj się'}
          </button>
        </form>
      </div>
    </div>
  )
}
