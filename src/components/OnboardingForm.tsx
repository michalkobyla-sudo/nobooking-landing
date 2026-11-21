'use client'

import { useState } from 'react'
import type { Icon } from '@phosphor-icons/react'
import Kafelek, { type KolorKafelka } from '@/components/ui/Kafelek'
import { CheckCircle, CrownSimple, HouseLine, Images, ListChecks, Phone, Plus, Tag, TextAlignLeft, WarningCircle, X } from '@/components/ui/ikony'

interface Props {
  token: string
  firstName: string
  apartmentName: string
  plan: 'basic' | 'pro'
}

interface Season {
  label: string
  from: string
  to: string
  price: string
  minNights: string
}

// Pola w stylu iOS (`.n-input` w `src/app/ios.css` daje też obwódkę przy fokusie).
const inputStyle: React.CSSProperties = {}
const textareaStyle: React.CSSProperties = { resize: 'vertical', minHeight: '96px' }
const selectStyle: React.CSSProperties = {}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="n-field">
      <span className="n-label">{label}{required && <span className="n-req" aria-hidden>*</span>}</span>
      {hint && <span className="n-hint">{hint}</span>}
      {children}
    </div>
  )
}

/** Sekcja formularza: podpis z płytką ikony i biała karta z polami, jak grupa w Ustawieniach. */
function Sekcja({ tytul, ikona, kolor, children }: { tytul: string; ikona: Icon; kolor: KolorKafelka; children: React.ReactNode }) {
  return (
    <section className="n-form-block">
      <h2 className="n-group-label" style={{ fontSize: 15, fontWeight: 600, color: 'var(--ink)' }}>
        <Kafelek ikona={ikona} kolor={kolor} rozmiar="xs" />{tytul}
      </h2>
      <div className="n-form-card">{children}</div>
    </section>
  )
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="n-form-grid">{children}</div>
}

function Grid3({ children }: { children: React.ReactNode }) {
  return <div className="n-form-grid n-form-grid--3">{children}</div>
}

const AMENITIES_OPTIONS = [
  'WiFi', 'Klimatyzacja', 'Parking', 'Basen', 'Balkon / Taras', 'Widok na morze',
  'Kuchnia / Aneks kuchenny', 'Zmywarka', 'Pralka', 'Smart TV', 'Łóżeczko dziecięce',
  'Krzesełko do karmienia', 'Winda', 'Ogród', 'Grill', 'Jacuzzi',
  'Siłownia', 'Rowerki', 'Zwierzęta mile widziane', 'Samodzielny check-in',
]

export default function OnboardingForm({ token, firstName, apartmentName, plan }: Props) {
  // ─── Opis i specyfikacja
  const [description, setDescription] = useState('')
  const [tagline, setTagline] = useState('')
  const [address, setAddress] = useState('')
  const [bedrooms, setBedrooms] = useState('')
  const [bathrooms, setBathrooms] = useState('')
  const [sqm, setSqm] = useState('')

  // ─── Zdjęcia i media
  const [photosLink, setPhotosLink] = useState('')
  const [videoLink, setVideoLink] = useState('')

  // ─── Cennik
  const [pricePerNight, setPricePerNight] = useState('')
  const [obCurrency, setObCurrency] = useState<'pln' | 'eur'>('eur')
  const [maxGuests, setMaxGuests] = useState('')
  const [seasons, setSeasons] = useState<Season[]>([])

  // ─── Zasady i udogodnienia
  const [checkinTime, setCheckinTime] = useState('')
  const [checkoutTime, setCheckoutTime] = useState('')
  const [amenities, setAmenities] = useState<string[]>([])
  const [amenitiesOther, setAmenitiesOther] = useState('')
  const [rules, setRules] = useState('')

  // ─── Kontakt i domena
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [domain, setDomain] = useState('')
  const [instagram, setInstagram] = useState('')
  const [facebook, setFacebook] = useState('')
  const [color, setColor] = useState('#1A5276')

  // ─── Pro only
  const [smsPhone, setSmsPhone] = useState('')
  const [checkinFields, setCheckinFields] = useState('')

  // ─── State
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  function toggleAmenity(a: string) {
    setAmenities(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])
  }

  function addSeason() {
    setSeasons(prev => [...prev, { label: '', from: '', to: '', price: '', minNights: '' }])
  }

  function updateSeason(i: number, field: keyof Season, value: string) {
    setSeasons(prev => prev.map((s, idx) => idx === i ? { ...s, [field]: value } : s))
  }

  function removeSeason(i: number) {
    setSeasons(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!description.trim() || !address.trim() || !pricePerNight || !maxGuests || !checkinTime.trim() || !checkoutTime.trim() || !contactEmail.trim() || !contactPhone.trim()) {
      setError('Wypełnij wszystkie wymagane pola.')
      return
    }

    setLoading(true)
    try {
      const allAmenities = [...amenities, ...(amenitiesOther.trim() ? amenitiesOther.split(',').map(s => s.trim()).filter(Boolean) : [])].join(', ')

      const res = await fetch(`/api/onboarding/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ob_description: description.trim(),
          ob_tagline: tagline.trim() || null,
          ob_address: address.trim(),
          ob_bedrooms: parseInt(bedrooms) || null,
          ob_bathrooms: parseInt(bathrooms) || null,
          ob_sqm: parseInt(sqm) || null,
          ob_photos_link: photosLink.trim() || null,
          ob_video_link: videoLink.trim() || null,
          ob_price_per_night: parseInt(pricePerNight) || null,
          ob_currency: obCurrency,
          ob_max_guests: parseInt(maxGuests) || null,
          ob_seasons: seasons.length > 0 ? JSON.stringify(seasons) : null,
          ob_checkin_time: checkinTime.trim(),
          ob_checkout_time: checkoutTime.trim(),
          ob_amenities: allAmenities || null,
          ob_rules: rules.trim() || null,
          ob_contact_email: contactEmail.trim(),
          ob_contact_phone: contactPhone.trim(),
          ob_domain: domain.trim() || null,
          ob_instagram: instagram.trim() || null,
          ob_facebook: facebook.trim() || null,
          ob_color: color || null,
          ob_sms_phone: plan === 'pro' ? (smsPhone.trim() || null) : null,
          ob_checkin_fields: plan === 'pro' ? (checkinFields.trim() || null) : null,
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
      <div className="n-page" style={{ display: 'flex', alignItems: 'center' }}>
        <div className="n-page__inner" style={{ maxWidth: 480, textAlign: 'center' }}>
          <CheckCircle weight="fill" size={72} color="var(--emerald)" aria-hidden style={{ margin: '0 auto 18px', display: 'block' }} />
          <h1>Dziękujemy, {firstName}</h1>
          <p className="n-page__lead">Formularz dla <strong style={{ color: 'var(--ink)' }}>{apartmentName}</strong> został wysłany. Gdy strona będzie gotowa, dostaniesz maila z adresem i dostępem do panelu.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="n-page">
      <div className="n-page__inner" style={{ maxWidth: 680 }}>
        <div style={{ marginBottom: 28 }}>
          <span className="n-chip" style={{ marginBottom: 14 }}>
            <Kafelek ikona={plan === 'pro' ? CrownSimple : HouseLine} kolor={plan === 'pro' ? 'ink' : 'emerald'} rozmiar="xs" />
            Plan {plan === 'pro' ? 'Pro' : 'Basic'}
          </span>
          <h1>Formularz budowy strony</h1>
          <p className="n-page__lead">
            Cześć {firstName}! Wypełnij formularz dla <strong style={{ color: 'var(--ink)' }}>{apartmentName}</strong>. Im więcej informacji, tym lepsza strona.
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate>

          {/* ── 1. OPIS I SPECYFIKACJA ─────────────────────────────────────── */}
          <Sekcja tytul="Opis i specyfikacja" ikona={TextAlignLeft} kolor="graphite">

          <Field label="Opis apartamentu" required hint="Napisz zachęcający opis — co wyróżnia Twój apartament, widok, styl, atmosfera.">
            <textarea className="n-input" style={{ ...textareaStyle, minHeight: '120px' }} value={description} onChange={e => setDescription(e.target.value)} placeholder="Np. Nowoczesny apartament z panoramicznym widokiem na morze, 50 m od plaży. Urządzony w śródziemnomorskim stylu, z prywatnym tarasem i basenem..." />
          </Field>

          <Field label="Krótkie hasło marketingowe (tagline)" hint="Pojawi się pod nazwą apartamentu w hero strony. Np. «Słońce, morze i brak prowizji»">
            <input className="n-input" style={inputStyle} type="text" value={tagline} onChange={e => setTagline(e.target.value)} placeholder="Np. Twój azyl nad Morzem Śródziemnym" maxLength={80} />
          </Field>

          <Field label="Pełny adres apartamentu" required hint="Będzie użyty do mapy Google Maps na stronie.">
            <input className="n-input" style={inputStyle} type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Np. Calle del Mar 15, 03181 Torrevieja, Alicante, Hiszpania" />
          </Field>

          <Grid3>
            <Field label="Sypialnie">
              <input className="n-input" style={inputStyle} type="number" min="0" max="20" value={bedrooms} onChange={e => setBedrooms(e.target.value)} placeholder="np. 2" />
            </Field>
            <Field label="Łazienki">
              <input className="n-input" style={inputStyle} type="number" min="0" max="10" value={bathrooms} onChange={e => setBathrooms(e.target.value)} placeholder="np. 1" />
            </Field>
            <Field label="Powierzchnia (m²)">
              <input className="n-input" style={inputStyle} type="number" min="1" value={sqm} onChange={e => setSqm(e.target.value)} placeholder="np. 65" />
            </Field>
          </Grid3>

          </Sekcja>

          {/* ── 2. ZDJĘCIA I MEDIA ────────────────────────────────────────── */}
          <Sekcja tytul="Zdjęcia i media" ikona={Images} kolor="teal">

          <Field label="Link do zdjęć" required={false} hint="Google Drive, Dropbox, WeTransfer lub iCloud. Minimum 10 zdjęć w dobrej jakości (poziome, min. 1920px).">
            <input className="n-input" style={inputStyle} type="url" value={photosLink} onChange={e => setPhotosLink(e.target.value)} placeholder="https://drive.google.com/..." />
          </Field>

          <Field label="Link do wideo (opcjonalne)" hint="YouTube lub Vimeo. Film z apartamentu lub okolicy — pojawi się w galerii.">
            <input className="n-input" style={inputStyle} type="url" value={videoLink} onChange={e => setVideoLink(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
          </Field>

          </Sekcja>

          {/* ── 3. CENNIK ─────────────────────────────────────────────────── */}
          <Sekcja tytul="Cennik" ikona={Tag} kolor="orange">

          <Grid2>
            <Field label="Podstawowa cena za noc" required>
              <input className="n-input" style={inputStyle} type="number" min="1" value={pricePerNight} onChange={e => setPricePerNight(e.target.value)} placeholder="np. 350" />
            </Field>
            <Field label="Waluta" required>
              <select className="n-input" style={selectStyle} value={obCurrency} onChange={e => setObCurrency(e.target.value as 'pln' | 'eur')}>
                <option value="eur">EUR (€)</option>
                <option value="pln">PLN (zł)</option>
              </select>
            </Field>
          </Grid2>

          <Field label="Maks. liczba gości" required>
            <input className="n-input" style={{ maxWidth: '180px' }} type="number" min="1" max="50" value={maxGuests} onChange={e => setMaxGuests(e.target.value)} placeholder="np. 4" />
          </Field>

          <Field label="Ceny sezonowe (opcjonalne)" hint="Ustaw różne ceny na sezon letni, zimowy, święta itp.">
            {seasons.map((season, i) => (
              <div key={i} style={{ background: 'var(--group)', borderRadius: 14, padding: 12, marginBottom: 10 }}>
                <div className="n-season-grid">
                  <Field label="Nazwa sezonu">
                    <input className="n-input" style={inputStyle} type="text" value={season.label} onChange={e => updateSeason(i, 'label', e.target.value)} placeholder="np. Lato" />
                  </Field>
                  <Field label="Od">
                    <input className="n-input" style={inputStyle} type="date" value={season.from} onChange={e => updateSeason(i, 'from', e.target.value)} />
                  </Field>
                  <Field label="Do">
                    <input className="n-input" style={inputStyle} type="date" value={season.to} onChange={e => updateSeason(i, 'to', e.target.value)} />
                  </Field>
                  <Field label="Cena/noc">
                    <input className="n-input" style={inputStyle} type="number" value={season.price} onChange={e => updateSeason(i, 'price', e.target.value)} placeholder="np. 450" />
                  </Field>
                  <Field label="Min. nocy">
                    <input className="n-input" style={inputStyle} type="number" min="1" value={season.minNights} onChange={e => updateSeason(i, 'minNights', e.target.value)} placeholder="np. 7" />
                  </Field>
                  <button type="button" onClick={() => removeSeason(i)} aria-label="Usuń sezon" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ios-graphite)', fontSize: 20, padding: '10px 4px', alignSelf: 'end' }}><X weight="bold" /></button>
                </div>
              </div>
            ))}
            <button type="button" onClick={addSeason} className="n-btn n-btn--ghost n-btn--sm n-btn--block">
              <Plus weight="bold" aria-hidden />Dodaj sezon
            </button>
          </Field>

          </Sekcja>

          {/* ── 4. UDOGODNIENIA I ZASADY ──────────────────────────────────── */}
          <Sekcja tytul="Udogodnienia i zasady" ikona={ListChecks} kolor="emerald">

          <Grid2>
            <Field label="Godzina check-in" required>
              <input className="n-input" style={inputStyle} type="text" value={checkinTime} onChange={e => setCheckinTime(e.target.value)} placeholder="np. 15:00" />
            </Field>
            <Field label="Godzina check-out" required>
              <input className="n-input" style={inputStyle} type="text" value={checkoutTime} onChange={e => setCheckoutTime(e.target.value)} placeholder="np. 11:00" />
            </Field>
          </Grid2>

          <Field label="Udogodnienia" hint="Zaznacz wszystkie dostępne.">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '0.5rem' }}>
              {AMENITIES_OPTIONS.map(a => (
                <label key={a} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: amenities.includes(a) ? 'rgba(5,150,105,0.1)' : 'var(--group)', border: 0, borderRadius: 10, padding: '9px 12px', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500 }}>
                  <input type="checkbox" checked={amenities.includes(a)} onChange={() => toggleAmenity(a)} style={{ accentColor: 'var(--emerald)', width: 17, height: 17, flexShrink: 0 }} />
                  {a}
                </label>
              ))}
            </div>
            <input className="n-input" style={{ marginTop: '0.75rem' }} type="text" value={amenitiesOther} onChange={e => setAmenitiesOther(e.target.value)} placeholder="Inne udogodnienia, oddzielone przecinkiem..." />
          </Field>

          <Field label="Zasady pobytu" hint="Np. zakaz palenia, zakaz imprez, cisza nocna od 22:00, zwierzęta po uzgodnieniu...">
            <textarea className="n-input" style={textareaStyle} value={rules} onChange={e => setRules(e.target.value)} placeholder="Opisz zasady pobytu..." />
          </Field>

          </Sekcja>

          {/* ── 5. KONTAKT I DOMENA ───────────────────────────────────────── */}
          <Sekcja tytul="Kontakt i domena" ikona={Phone} kolor="blue">

          <Grid2>
            <Field label="Email kontaktowy apartamentu" required hint="Pojawi się w stopce strony. Może być inny niż email zamówienia.">
              <input className="n-input" style={inputStyle} type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="np. rezerwacje@mojastrona.pl" />
            </Field>
            <Field label="Telefon kontaktowy" required hint="Do dyspozycji gości na stronie.">
              <input className="n-input" style={inputStyle} type="tel" value={contactPhone} onChange={e => setContactPhone(e.target.value)} placeholder="np. +48 600 123 456" />
            </Field>
          </Grid2>

          <Field label="Własna domena" hint="Jeśli masz już domenę (np. mojaapartament.pl) — wpisz ją. Jeśli nie — wpisz «brak» i dobierzemy subdomenę.">
            <input className="n-input" style={inputStyle} type="text" value={domain} onChange={e => setDomain(e.target.value)} placeholder="np. apartamentplaya.eu lub «brak»" />
          </Field>

          <Grid2>
            <Field label="Instagram (opcjonalne)" hint="Sama nazwa profilu, bez @.">
              <input className="n-input" style={inputStyle} type="text" value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="np. apartamentplaya" />
            </Field>
            <Field label="Facebook (opcjonalne)" hint="Link do strony lub profilu.">
              <input className="n-input" style={inputStyle} type="text" value={facebook} onChange={e => setFacebook(e.target.value)} placeholder="np. facebook.com/apartamentplaya" />
            </Field>
          </Grid2>

          <Field label="Preferowany kolor strony" hint="Główny kolor marki. Możesz wybrać z palety lub wpisać kod hex.">
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {['#1A5276', '#1B4F72', '#154360', '#6E2F7B', '#922B21', '#1E8449', '#B7770D', '#1A1A1A'].map(c => (
                <button key={c} type="button" onClick={() => setColor(c)} style={{ width: 32, height: 32, borderRadius: '50%', background: c, border: color === c ? '3px solid var(--ink)' : '2px solid transparent', cursor: 'pointer', outline: color === c ? '2px solid white' : 'none', outlineOffset: -4 }} title={c} />
              ))}
              <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width: 32, height: 32, borderRadius: '50%', border: '1.5px solid #D1D5DB', cursor: 'pointer', padding: 0 }} title="Własny kolor" />
              <span style={{ fontSize: '0.8rem', color: '#9CA3AF', fontFamily: 'monospace' }}>{color}</span>
            </div>
          </Field>

          </Sekcja>

          {/* ── 6. PRO — DODATKOWE USTAWIENIA ────────────────────────────── */}
          {plan === 'pro' && (
            <>
              <Sekcja tytul="Plan Pro" ikona={CrownSimple} kolor="ink">

              <p className="n-hint">Te ustawienia są dostępne tylko w planie Pro.</p>

              <Field label="Numer telefonu do powiadomień SMS" hint="Na ten numer będziesz otrzymywać SMS gdy klient złoży rezerwację lub wyśle wiadomość.">
                <input className="n-input" style={inputStyle} type="tel" value={smsPhone} onChange={e => setSmsPhone(e.target.value)} placeholder="np. +48 600 123 456" />
              </Field>

              <Field label="Dodatkowe pola w formularzu online check-in (opcjonalne)" hint="Podaj pytania które chcesz zadać gościom przed przyjazdem, np.: «Szacowana godzina przyjazdu», «Numer rejestracyjny auta», «Czy potrzebujesz łóżeczka dziecięcego?». Każde pytanie w osobnej linii.">
                <textarea className="n-input" style={{ ...textareaStyle, minHeight: '100px' }} value={checkinFields} onChange={e => setCheckinFields(e.target.value)} placeholder="Szacowana godzina przyjazdu&#10;Numer rejestracyjny&#10;Czy potrzebujesz łóżeczka dziecięcego?" />
              </Field>
              </Sekcja>
            </>
          )}

          {/* ── ERROR & SUBMIT ────────────────────────────────────────────── */}
          {error && (
            <div className="n-alert n-alert--error" role="alert" style={{ marginTop: 24 }}>
              <WarningCircle weight="fill" aria-hidden />{error}
            </div>
          )}

          <button type="submit" disabled={loading} className="n-btn n-btn--primary n-btn--block" style={{ marginTop: 24 }}>
            {loading ? <><span className="spinner" />Wysyłam…</> : 'Wyślij formularz'}
          </button>

          <p className="n-fineprint">Stronę budujemy zwykle w ciągu 24 godzin od wysłania formularza.</p>
        </form>
      </div>
    </div>
  )
}
