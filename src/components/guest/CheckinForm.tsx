'use client'

import { useEffect, useState } from 'react'

interface Osoba { imie: string; dokument: string; obywatelstwo: string }

interface Stan {
  mozna: boolean
  guest_name: string
  guests_count: number
  check_in: string
  check_out: string
  zapisano: { osoby: Osoba[]; godzinaPrzyjazdu: string | null; uwagi: string | null } | null
}

const BLEDY: Record<string, string> = {
  brak_osob: 'Podaj dane przynajmniej jednej osoby.',
  za_duzo_osob: 'Więcej osób, niż obejmuje rezerwacja.',
  brak_imienia: 'Każda osoba musi mieć imię i nazwisko.',
  zla_godzina: 'Godzina w formacie 15:30.',
  po_terminie: 'Termin pobytu już minął.',
  pro_required: 'Ta strona nie ma włączonego check-inu online.',
}

const pusta = (): Osoba => ({ imie: '', dokument: '', obywatelstwo: '' })

export default function CheckinForm({ slug, bookingId, primary }: {
  slug: string
  bookingId: string
  primary: string
}) {
  const [stan, setStan]     = useState<Stan | null>(null)
  const [osoby, setOsoby]   = useState<Osoba[]>([pusta()])
  const [godzina, setGodzina] = useState('')
  const [uwagi, setUwagi]   = useState('')
  const [zapisuje, setZapisuje] = useState(false)
  const [zapisano, setZapisano] = useState(false)
  const [blad, setBlad]     = useState<string | null>(null)

  const adres = `/api/sites/${slug}/guest/${bookingId}/checkin`

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch(adres)
        if (!res.ok) { setBlad(BLEDY.pro_required); return }
        const d = await res.json() as Stan
        setStan(d)
        if (d.zapisano) {
          setOsoby(d.zapisano.osoby.length > 0
            ? d.zapisano.osoby.map(o => ({ imie: o.imie ?? '', dokument: o.dokument ?? '', obywatelstwo: o.obywatelstwo ?? '' }))
            : [pusta()])
          setGodzina(d.zapisano.godzinaPrzyjazdu ?? '')
          setUwagi(d.zapisano.uwagi ?? '')
          setZapisano(true)
        }
      } catch {
        setBlad('Nie udało się wczytać formularza.')
      }
    })()
  }, [adres])

  function zmien(i: number, pole: keyof Osoba, wartosc: string) {
    setOsoby(o => o.map((x, j) => (j === i ? { ...x, [pole]: wartosc } : x)))
    setZapisano(false)
  }

  async function wyslij(e: React.FormEvent) {
    e.preventDefault()
    setBlad(null)
    setZapisuje(true)
    try {
      const res = await fetch(adres, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ osoby, godzinaPrzyjazdu: godzina, uwagi }),
      })
      const d = await res.json() as { error?: string }
      if (!res.ok) { setBlad(BLEDY[d.error ?? ''] ?? 'Nie udało się zapisać.'); return }
      setZapisano(true)
    } catch {
      setBlad('Błąd połączenia. Spróbuj ponownie.')
    } finally {
      setZapisuje(false)
    }
  }

  const pole: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', border: '1px solid #E5E7EB', borderRadius: 8,
    padding: '0.6rem 0.75rem', fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none',
  }
  const etykieta: React.CSSProperties = {
    display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#6B7280',
    textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem',
  }

  if (blad && !stan) {
    return <div style={{ padding: '1.5rem', color: '#B91C1C', fontSize: '0.9rem' }}>{blad}</div>
  }
  if (!stan) {
    return <div style={{ padding: '1.5rem', color: '#9CA3AF', fontSize: '0.9rem' }}>Wczytywanie…</div>
  }
  if (!stan.mozna) {
    return (
      <div style={{ padding: '1.5rem', color: '#6B7280', fontSize: '0.9rem' }}>
        Termin pobytu już minął — formularz nie jest już potrzebny.
      </div>
    )
  }

  const mozeDodac = osoby.length < stan.guests_count

  return (
    <form onSubmit={wyslij} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <p style={{ margin: 0, fontSize: '0.875rem', color: '#6B7280', lineHeight: 1.6 }}>
        Podaj dane osób, które przyjadą. Skróci to formalności na miejscu.
        Dane są usuwane tydzień po wyjeździe.
      </p>

      {osoby.map((o, i) => (
        <div key={i} style={{ border: '1px solid #E5E7EB', borderRadius: 12, padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.75rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#111827' }}>
              {i === 0 ? 'Osoba rezerwująca' : `Osoba ${i + 1}`}
            </span>
            {i > 0 && (
              <button type="button" onClick={() => setOsoby(x => x.filter((_, j) => j !== i))}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#9CA3AF', fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                Usuń
              </button>
            )}
          </div>

          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <div>
              <label style={etykieta}>Imię i nazwisko</label>
              <input style={pole} value={o.imie} onChange={e => zmien(i, 'imie', e.target.value)}
                placeholder="Jak w dokumencie" required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div>
                <label style={etykieta}>Numer dokumentu</label>
                <input style={pole} value={o.dokument} onChange={e => zmien(i, 'dokument', e.target.value)} placeholder="opcjonalnie" />
              </div>
              <div>
                <label style={etykieta}>Obywatelstwo</label>
                <input style={pole} value={o.obywatelstwo} onChange={e => zmien(i, 'obywatelstwo', e.target.value)} placeholder="opcjonalnie" />
              </div>
            </div>
          </div>
        </div>
      ))}

      {mozeDodac && (
        <button type="button" onClick={() => { setOsoby(o => [...o, pusta()]); setZapisano(false) }}
          style={{ background: 'none', border: '1px dashed #D1D5DB', borderRadius: 10, padding: '0.65rem', fontSize: '0.85rem', fontWeight: 600, color: '#374151', cursor: 'pointer', fontFamily: 'inherit' }}>
          + Dodaj osobę ({osoby.length} z {stan.guests_count})
        </button>
      )}

      <div style={{ display: 'grid', gap: '1rem' }}>
        <div>
          <label style={etykieta}>Planowana godzina przyjazdu</label>
          <input style={{ ...pole, maxWidth: 160 }} value={godzina}
            onChange={e => { setGodzina(e.target.value); setZapisano(false) }}
            placeholder="15:30" inputMode="numeric" />
        </div>
        <div>
          <label style={etykieta}>Uwagi dla gospodarza</label>
          <textarea style={{ ...pole, minHeight: 90, resize: 'vertical' }} value={uwagi}
            onChange={e => { setUwagi(e.target.value); setZapisano(false) }}
            placeholder="Numer lotu, późny przyjazd, cokolwiek warto wiedzieć" />
        </div>
      </div>

      {blad && <div style={{ fontSize: '0.85rem', color: '#B91C1C' }}>{blad}</div>}

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <button type="submit" disabled={zapisuje}
          style={{ background: primary, color: 'white', border: 'none', borderRadius: 10, padding: '0.75rem 1.5rem', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: zapisuje ? 0.7 : 1 }}>
          {zapisuje ? 'Zapisywanie…' : zapisano ? 'Zapisz zmiany' : 'Wyślij'}
        </button>
        {zapisano && !zapisuje && (
          <span style={{ fontSize: '0.85rem', color: '#15803D', fontWeight: 600 }}>✓ Zapisane — możesz jeszcze poprawić</span>
        )}
      </div>
    </form>
  )
}
