'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PUSTE_ZRODLO } from '@/lib/attribution'
import { zapamietaneZrodlo } from '@/lib/zrodloWPamieci'
import Kafelek from '@/components/ui/Kafelek'
import { CaretLeft, Sparkle, Translate, CalendarCheck, WarningCircle, Lock } from '@/components/ui/ikony'

interface Pola {
  first_name: string
  email: string
  apartment_name: string
  apartment_location: string
  description: string
  price_per_night: string
  currency: 'pln' | 'eur'
  max_guests: string
  bedrooms: string
  offer_link: string
}

const PUSTE: Pola = {
  first_name: '', email: '', apartment_name: '', apartment_location: '', description: '',
  price_per_night: '', currency: 'pln', max_guests: '', bedrooms: '', offer_link: '',
}

/** Kody błędów z `api/demo` → zdanie, które mówi, co zrobić. */
const BLEDY: Record<string, string> = {
  invalid_email: 'Sprawdź adres e-mail — na niego wyślemy link do demo.',
  missing_consent: 'Zaznacz zgodę na kontakt, żebyśmy mogli wysłać Ci link.',
  invalid_price: 'Cena za noc musi być liczbą większą od zera.',
  invalid_guests: 'Liczba gości musi być liczbą od 1 do 40.',
  invalid_bedrooms: 'Liczba sypialni musi być liczbą od 0 do 20.',
  invalid_link: 'Link do oferty wygląda na niepoprawny. Wklej pełny adres albo zostaw pole puste.',
  too_many_for_email: 'Na ten adres przygotowaliśmy już dziś dwa dema. Sprawdź skrzynkę albo napisz na kontakt@nobooking.eu.',
  too_many_requests: 'Za dużo zgłoszeń z tego połączenia. Spróbuj za godzinę albo napisz na kontakt@nobooking.eu.',
  daily_limit: 'Dziś przygotowaliśmy już wszystkie dema, jakie możemy. Napisz na kontakt@nobooking.eu — odpiszemy z linkiem.',
}

function Pole({ label, opis, required, htmlFor, children }: { label: string; opis?: string; required?: boolean; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="n-field">
      <label htmlFor={htmlFor}>{label}{required && <span className="n-req" aria-hidden>*</span>}</label>
      {children}
      {opis && <small className="n-hint">{opis}</small>}
    </div>
  )
}

export default function DemoForm() {
  const router = useRouter()
  const [f, setF] = useState<Pola>(PUSTE)
  const [zgoda, setZgoda] = useState(false)
  const [wysylanie, setWysylanie] = useState(false)
  const [blad, setBlad] = useState<string | null>(null)

  const ustaw = (k: keyof Pola, v: string) => setF(p => ({ ...p, [k]: v }))

  async function wyslij(e: React.FormEvent) {
    e.preventDefault()
    setBlad(null)
    if (!f.first_name.trim() || !f.email.trim() || !f.apartment_name.trim() || !f.apartment_location.trim()) {
      setBlad('Uzupełnij imię, e-mail, nazwę i miejscowość apartamentu.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) { setBlad(BLEDY.invalid_email); return }
    if (!zgoda) { setBlad(BLEDY.missing_consent); return }

    setWysylanie(true)
    try {
      const odp = await fetch('/api/demo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...f, zgoda, zrodlo: zapamietaneZrodlo() ?? PUSTE_ZRODLO }),
      })
      const dane = await odp.json().catch(() => ({})) as { url?: string; error?: string }
      if (odp.ok && dane.url) {
        router.push(dane.url)
        return
      }
      setBlad(BLEDY[dane.error ?? ''] ?? 'Coś poszło nie tak. Spróbuj ponownie albo napisz na kontakt@nobooking.eu.')
    } catch {
      setBlad('Brak połączenia. Sprawdź internet i spróbuj ponownie.')
    }
    setWysylanie(false)
  }

  return (
    <div className="n-page">
      <div className="n-page__inner">
        <Link href="/" className="n-back"><CaretLeft weight="bold" aria-hidden />nobooking.eu</Link>

        <h1>Zobacz swój apartament na własnej stronie</h1>
        <p className="n-page__lead">
          Podaj kilka danych, a przygotujemy demo strony z nazwą, opisem i cenami Twojego apartamentu, w czterech językach.
          Bez płacenia i bez zakładania konta.
        </p>

        <div className="n-list n-list--grey" style={{ marginTop: 24 }}>
          <div className="n-row">
            <Kafelek ikona={Sparkle} kolor="emerald" rozmiar="sm" />
            <div className="n-row__txt"><b>Gotowe zwykle w minutę</b><span>Strona otworzy się sama, link przyjdzie też mailem.</span></div>
          </div>
          <div className="n-row">
            <Kafelek ikona={CalendarCheck} kolor="blue" rozmiar="sm" />
            <div className="n-row__txt"><b>Kalendarz i ceny jak u gościa</b><span>Wybierasz daty i widzisz cenę pobytu.</span></div>
          </div>
          <div className="n-row">
            <Kafelek ikona={Translate} kolor="indigo" rozmiar="sm" />
            <div className="n-row__txt"><b>Polski, angielski, hiszpański, niemiecki</b><span>Zdjęcia w demo są przykładowe — swoje dodasz po zakupie.</span></div>
          </div>
        </div>

        <form onSubmit={wyslij} noValidate style={{ marginTop: 28 }}>
          <div className="n-form-block">
            <p className="n-group-label">Apartament</p>
            <div className="n-form-card">
              <Pole label="Nazwa apartamentu" required htmlFor="d-nazwa">
                <input id="d-nazwa" className="n-input" type="text" maxLength={80} value={f.apartment_name} onChange={e => ustaw('apartment_name', e.target.value)} placeholder="np. Apartament Słoneczny" />
              </Pole>
              <Pole label="Miejscowość i region" required htmlFor="d-miejsce">
                <input id="d-miejsce" className="n-input" type="text" maxLength={120} value={f.apartment_location} onChange={e => ustaw('apartment_location', e.target.value)} placeholder="np. Torrevieja, Costa Blanca" />
              </Pole>
              <Pole label="Kilka zdań o apartamencie" opis="Co wyróżnia to miejsce: widok, plaża, taras, basen. Bez opisu teksty będą ogólne." htmlFor="d-opis">
                <textarea id="d-opis" className="n-input" maxLength={1500} value={f.description} onChange={e => ustaw('description', e.target.value)} />
              </Pole>
              <div className="n-form-grid">
                <Pole label="Cena za noc" htmlFor="d-cena">
                  <input id="d-cena" className="n-input" type="number" inputMode="numeric" min={1} value={f.price_per_night} onChange={e => ustaw('price_per_night', e.target.value)} placeholder="np. 350" />
                </Pole>
                <Pole label="Waluta" htmlFor="d-waluta">
                  <select id="d-waluta" className="n-input" value={f.currency} onChange={e => ustaw('currency', e.target.value)}>
                    <option value="pln">PLN</option>
                    <option value="eur">EUR</option>
                  </select>
                </Pole>
              </div>
              <div className="n-form-grid">
                <Pole label="Maks. liczba gości" htmlFor="d-goscie">
                  <input id="d-goscie" className="n-input" type="number" inputMode="numeric" min={1} max={40} value={f.max_guests} onChange={e => ustaw('max_guests', e.target.value)} />
                </Pole>
                <Pole label="Sypialnie" htmlFor="d-sypialnie">
                  <input id="d-sypialnie" className="n-input" type="number" inputMode="numeric" min={0} max={20} value={f.bedrooms} onChange={e => ustaw('bedrooms', e.target.value)} />
                </Pole>
              </div>
              <Pole label="Link do oferty (nieobowiązkowo)" opis="Booking.com, Airbnb albo Twoja strona — zobaczymy, jak dziś prezentujesz apartament." htmlFor="d-link">
                <input id="d-link" className="n-input" type="url" maxLength={500} value={f.offer_link} onChange={e => ustaw('offer_link', e.target.value)} placeholder="https://" />
              </Pole>
            </div>
          </div>

          <div className="n-form-block">
            <p className="n-group-label">Gdzie wysłać link</p>
            <div className="n-form-card">
              <div className="n-form-grid">
                <Pole label="Imię" required htmlFor="d-imie">
                  <input id="d-imie" className="n-input" type="text" maxLength={60} value={f.first_name} onChange={e => ustaw('first_name', e.target.value)} autoComplete="given-name" />
                </Pole>
                <Pole label="E-mail" required htmlFor="d-email">
                  <input id="d-email" className="n-input" type="email" maxLength={160} value={f.email} onChange={e => ustaw('email', e.target.value)} autoComplete="email" />
                </Pole>
              </div>
              <label className="n-check">
                <input type="checkbox" checked={zgoda} onChange={e => setZgoda(e.target.checked)} required />
                <span>
                  Zgadzam się, żeby Nobooking wysłał mi link do demo i napisał w jego sprawie.
                  {' '}Szczegóły w <a href="/polityka-prywatnosci" target="_blank" rel="noopener">polityce prywatności</a>.
                </span>
              </label>
            </div>
          </div>

          {blad && (
            <div className="n-alert n-alert--error" role="alert" style={{ marginTop: 20 }}>
              <WarningCircle weight="fill" aria-hidden />{blad}
            </div>
          )}

          <button type="submit" disabled={wysylanie} className="n-btn n-btn--primary n-btn--block" style={{ marginTop: 24 }}>
            {wysylanie ? <><span className="spinner" />Wysyłam…</> : 'Przygotuj moje demo'}
          </button>
          <p className="n-fineprint"><Lock weight="fill" aria-hidden />Bez płatności. Dane służą tylko do przygotowania demo.</p>
        </form>
      </div>
    </div>
  )
}
