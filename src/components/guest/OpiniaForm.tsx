'use client'

import { useEffect, useState } from 'react'

interface Stan {
  mozna: boolean
  guest_name: string
  juz_jest: { score: number; published: boolean } | null
}

const BLEDY: Record<string, string> = {
  zla_ocena: 'Wybierz ocenę od 1 do 5.',
  za_krotka: 'Napisz przynajmniej kilka zdań — krótsza opinia nikomu nie pomoże.',
  za_wczesnie: 'Opinię można napisać po zakończeniu pobytu.',
}

export default function OpiniaForm({ slug, bookingId, primary }: {
  slug: string
  bookingId: string
  primary: string
}) {
  const [stan, setStan] = useState<Stan | null>(null)
  const [ocena, setOcena] = useState(0)
  const [tekst, setTekst] = useState('')
  const [zapisuje, setZapisuje] = useState(false)
  const [gotowe, setGotowe] = useState(false)
  const [blad, setBlad] = useState<string | null>(null)

  const adres = `/api/sites/${slug}/guest/${bookingId}/opinia`

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(adres)
        if (!res.ok) { setBlad('Nie znaleziono rezerwacji.'); return }
        const d = await res.json() as Stan
        setStan(d)
        if (d.juz_jest) { setOcena(d.juz_jest.score); setGotowe(true) }
      } catch {
        setBlad('Nie udało się wczytać formularza.')
      }
    })()
  }, [adres])

  async function wyslij(e: React.FormEvent) {
    e.preventDefault()
    setBlad(null)
    setZapisuje(true)
    try {
      const res = await fetch(adres, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ score: ocena, text: tekst }),
      })
      const d = await res.json() as { error?: string }
      if (!res.ok) { setBlad(BLEDY[d.error ?? ''] ?? 'Nie udało się zapisać.'); return }
      setGotowe(true)
    } catch {
      setBlad('Błąd połączenia. Spróbuj ponownie.')
    } finally {
      setZapisuje(false)
    }
  }

  if (blad && !stan) return <p style={{ color: '#B91C1C', fontSize: '0.9rem' }}>{blad}</p>
  if (!stan) return <p style={{ color: '#9CA3AF', fontSize: '0.9rem' }}>Wczytywanie…</p>

  if (!stan.mozna) {
    return (
      <p style={{ color: '#6B7280', fontSize: '0.9rem', lineHeight: 1.6 }}>
        Opinię można napisać po zakończeniu pobytu. Napiszemy, gdy przyjdzie czas.
      </p>
    )
  }

  if (gotowe) {
    return (
      <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>🙏</div>
        <p style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: '0 0 0.5rem' }}>Dziękujemy!</p>
        <p style={{ fontSize: '0.875rem', color: '#6B7280', margin: 0, lineHeight: 1.6 }}>
          Opinia pojawi się na stronie po zatwierdzeniu przez gospodarza.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={wyslij} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.6rem' }}>
          Ocena
        </div>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} type="button" onClick={() => setOcena(n)} aria-label={`${n} z 5`}
              style={{
                width: 44, height: 44, borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit',
                fontSize: '1.2rem', lineHeight: 1,
                border: `1px solid ${n <= ocena ? primary : '#E5E7EB'}`,
                background: n <= ocena ? primary : 'white',
                color: n <= ocena ? 'white' : '#9CA3AF',
              }}>
              ★
            </button>
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.6rem' }}>
          Kilka zdań o pobycie
        </div>
        <textarea value={tekst} onChange={e => setTekst(e.target.value)}
          placeholder="Co się podobało, co warto wiedzieć przed przyjazdem…"
          style={{ width: '100%', boxSizing: 'border-box', minHeight: 140, resize: 'vertical', border: '1px solid #E5E7EB', borderRadius: 10, padding: '0.75rem', fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none', lineHeight: 1.6 }} />
      </div>

      {blad && <div style={{ fontSize: '0.85rem', color: '#B91C1C' }}>{blad}</div>}

      <button type="submit" disabled={zapisuje || ocena === 0}
        style={{ background: primary, color: 'white', border: 'none', borderRadius: 10, padding: '0.8rem 1.5rem', fontSize: '0.92rem', fontWeight: 700, cursor: ocena === 0 ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: zapisuje || ocena === 0 ? 0.6 : 1 }}>
        {zapisuje ? 'Wysyłanie…' : 'Wyślij opinię'}
      </button>
    </form>
  )
}
