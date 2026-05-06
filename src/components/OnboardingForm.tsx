'use client'

import { useState } from 'react'

interface Props {
  token: string
  firstName: string
  apartmentName: string
}

interface Season {
  label: string
  from: string
  to: string
  price: string
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.65rem 0.875rem',
  border: '1.5px solid var(--color-border)',
  borderRadius: 'var(--radius-md)',
  fontSize: '0.95rem', fontFamily: 'inherit',
  outline: 'none', boxSizing: 'border-box',
  background: 'white', color: 'var(--color-text)',
}

const textareaStyle: React.CSSProperties = { ...inputStyle, resize: 'vertical', minHeight: '90px' }

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '1.25rem' }}>
      <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>
        {label}{required && <span style={{ color: 'var(--color-pain)', marginLeft: '2px' }}>*</span>}
      </label>
      {children}
    </div>
  )
}

export default function OnboardingForm({ token, firstName, apartmentName }: Props) {
  const [description, setDescription] = useState('')
  const [pricePerNight, setPricePerNight] = useState('')
  const [maxGuests, setMaxGuests] = useState('')
  const [checkinTime, setCheckinTime] = useState('')
  const [checkoutTime, setCheckoutTime] = useState('')
  const [amenities, setAmenities] = useState('')
  const [rules, setRules] = useState('')
  const [seasons, setSeasons] = useState<Season[]>([])
  const [photosLink, setPhotosLink] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  function addSeason() {
    setSeasons(prev => [...prev, { label: '', from: '', to: '', price: '' }])
  }

  function updateSeason(index: number, field: keyof Season, value: string) {
    setSeasons(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s))
  }

  function removeSeason(index: number) {
    setSeasons(prev => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!description.trim() || !pricePerNight || !maxGuests || !checkinTime.trim() || !checkoutTime.trim()) {
      setError('Wypełnij wszystkie wymagane pola.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/onboarding/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ob_description: description.trim(),
          ob_price_per_night: parseInt(pricePerNight) || null,
          ob_max_guests: parseInt(maxGuests) || null,
          ob_checkin_time: checkinTime.trim(),
          ob_checkout_time: checkoutTime.trim(),
          ob_amenities: amenities.trim() || null,
          ob_rules: rules.trim() || null,
          ob_seasons: seasons.length > 0 ? JSON.stringify(seasons) : null,
          ob_photos_link: photosLink.trim() || null,
        }),
      })

      const data = await res.json() as { success?: boolean; error?: string }
      if (data.success) {
        setDone(true)
      } else if (data.error === 'already_submitted') {
        setError('Formularz został już wysłany.')
      } else {
        setError('Wystąpił błąd. Spróbuj ponownie lub napisz na kontakt@nobooking.eu')
      }
    } catch {
      setError('Błąd połączenia. Sprawdź internet i spróbuj ponownie.')
    }
    setLoading(false)
  }

  if (done) {
    return (
      <div style={{ minHeight: '100vh', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ textAlign: 'center', maxWidth: '480px' }}>
          <div style={{ width: '72px', height: '72px', background: 'var(--color-accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '2rem', color: 'white', fontWeight: 800 }}>✓</div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#111827', marginBottom: '0.75rem' }}>Dziękujemy, {firstName}!</h1>
          <p style={{ color: '#374151', lineHeight: 1.7 }}>Formularz dla <strong>{apartmentName}</strong> został wysłany. Odezwiemy się wkrótce z informacją o postępie prac.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', padding: '3rem 1rem' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.5rem', color: '#111827' }}>
          Formularz budowy strony
        </h1>
        <p style={{ fontSize: '0.9rem', color: '#6B7280', marginBottom: '2.5rem' }}>
          Cześć {firstName}! Wypełnij poniższy formularz dla <strong>{apartmentName}</strong>. Zajmie to ok. 5 minut.
        </p>

        <form onSubmit={handleSubmit} noValidate>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: '1.25rem' }}>O apartamencie</h2>

          <Field label="Opis apartamentu" required>
            <textarea style={textareaStyle} value={description} onChange={e => setDescription(e.target.value)} placeholder="Opisz apartament — pokoje, widok, wyposażenie..." />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
            <Field label="Cena za noc" required>
              <input style={inputStyle} type="number" min="1" value={pricePerNight} onChange={e => setPricePerNight(e.target.value)} placeholder="np. 350" />
            </Field>
            <Field label="Maks. liczba gości" required>
              <input style={inputStyle} type="number" min="1" max="50" value={maxGuests} onChange={e => setMaxGuests(e.target.value)} placeholder="np. 4" />
            </Field>
            <Field label="Godzina check-in" required>
              <input style={inputStyle} type="text" value={checkinTime} onChange={e => setCheckinTime(e.target.value)} placeholder="np. 15:00" />
            </Field>
            <Field label="Godzina check-out" required>
              <input style={inputStyle} type="text" value={checkoutTime} onChange={e => setCheckoutTime(e.target.value)} placeholder="np. 11:00" />
            </Field>
          </div>

          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: '1.5rem 0 1.25rem' }}>Udogodnienia i zasady</h2>

          <Field label="Udogodnienia">
            <textarea style={textareaStyle} value={amenities} onChange={e => setAmenities(e.target.value)} placeholder="np. WiFi, Parking, Klimatyzacja, Basen, Balkon..." />
          </Field>
          <Field label="Zasady pobytu">
            <textarea style={textareaStyle} value={rules} onChange={e => setRules(e.target.value)} placeholder="np. Zakaz palenia, Zakaz imprez, Zwierzęta po uzgodnieniu..." />
          </Field>

          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', margin: '1.5rem 0 1.25rem' }}>Ceny sezonowe (opcjonalne)</h2>

          {seasons.map((season, i) => (
            <div key={i} style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '1rem', marginBottom: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'end' }}>
                <Field label="Nazwa sezonu">
                  <input style={inputStyle} type="text" value={season.label} onChange={e => updateSeason(i, 'label', e.target.value)} placeholder="np. Lato" />
                </Field>
                <Field label="Data od">
                  <input style={inputStyle} type="date" value={season.from} onChange={e => updateSeason(i, 'from', e.target.value)} />
                </Field>
                <Field label="Data do">
                  <input style={inputStyle} type="date" value={season.to} onChange={e => updateSeason(i, 'to', e.target.value)} />
                </Field>
                <Field label="Cena/noc">
                  <input style={inputStyle} type="number" value={season.price} onChange={e => updateSeason(i, 'price', e.target.value)} placeholder="np. 450" />
                </Field>
                <button
                  type="button"
                  onClick={() => removeSeason(i)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', fontSize: '1.25rem', padding: '0.65rem 0.25rem', alignSelf: 'end', marginBottom: '1.25rem' }}
                >
                  ×
                </button>
              </div>
            </div>
          ))}

          <button
            type="button"
            onClick={addSeason}
            style={{ background: 'white', border: '1.5px dashed var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0.65rem 1.25rem', fontSize: '0.875rem', fontWeight: 600, color: '#374151', cursor: 'pointer', fontFamily: 'inherit', marginBottom: '1.5rem', display: 'block', width: '100%' }}
          >
            + Dodaj sezon
          </button>

          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', marginBottom: '1.25rem' }}>Zdjęcia</h2>

          <Field label="Link do zdjęć (Google Drive, WeTransfer, Dropbox)">
            <input style={inputStyle} type="url" value={photosLink} onChange={e => setPhotosLink(e.target.value)} placeholder="https://drive.google.com/..." />
          </Field>
          <p style={{ fontSize: '0.8rem', color: '#9CA3AF', marginTop: '-0.75rem', marginBottom: '1.5rem' }}>
            Prześlij zdjęcia (min. 10) przez Google Drive lub WeTransfer i wklej link powyżej.
          </p>

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 'var(--radius-md)', padding: '0.875rem 1rem', marginBottom: '1.25rem', fontSize: '0.875rem', color: 'var(--color-pain)' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: '100%', fontSize: '1rem', padding: '1rem', opacity: loading ? 0.7 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Wysyłam...' : 'Wyślij formularz →'}
          </button>
        </form>
      </div>
    </div>
  )
}
