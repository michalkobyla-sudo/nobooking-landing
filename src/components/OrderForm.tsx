'use client'

import Link from 'next/link'
import { useState } from 'react'
import { normalizujNumerPodatkowy } from '@/lib/numerPodatkowy'
import { PRICE_LABELS } from '@/lib/prices'
import { PUSTE_ZRODLO } from '@/lib/attribution'
import { zapamietaneZrodlo } from '@/lib/zrodloWPamieci'
import Kafelek from '@/components/ui/Kafelek'
import { CaretLeft, CrownSimple, HouseLine, Lock, WarningCircle } from '@/components/ui/ikony'

interface Props {
  plan: 'basic' | 'pro'
  currency: 'pln' | 'eur'
}

interface FormData {
  first_name: string
  last_name: string
  email: string
  phone: string
  want_invoice: boolean
  invoice_company: string
  invoice_nip: string
  invoice_address: string
  apartment_name: string
  apartment_location: string
  notes: string
}

const INITIAL: FormData = {
  first_name: '', last_name: '', email: '', phone: '',
  want_invoice: false,
  invoice_company: '', invoice_nip: '', invoice_address: '',
  apartment_name: '', apartment_location: '', notes: '',
}

function Field({ label, required, htmlFor, children }: { label: string; required?: boolean; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="n-field">
      <label htmlFor={htmlFor}>{label}{required && <span className="n-req" aria-hidden>*</span>}</label>
      {children}
    </div>
  )
}

export default function OrderForm({ plan, currency }: Props) {
  const [form, setForm] = useState<FormData>(INITIAL)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Akceptacja regulaminu. Osobny stan, nie pole `form`: nie jest daną
  // zamówienia, tylko warunkiem jego złożenia.
  const [akceptacja, setAkceptacja] = useState(false)
  // Żądanie wcześniejszego startu (art. 15 ust. 3 upk). Dobrowolne i domyślnie
  // niezaznaczone — zgoda zaznaczona z góry nie byłaby „wyraźna”.
  const [wczesnyStart, setWczesnyStart] = useState(false)

  const planLabel = plan === 'pro' ? 'Pro' : 'Basic'
  const priceLabel = PRICE_LABELS[plan][currency]

  function set(field: keyof FormData, value: string | boolean) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Client-side validation
    if (!form.first_name.trim() || !form.last_name.trim() || !form.email.trim() || !form.phone.trim()) {
      setError('Wypełnij wszystkie wymagane pola.')
      return
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError('Podaj poprawny adres email.')
      return
    }
    if (!form.apartment_name.trim() || !form.apartment_location.trim()) {
      setError('Wypełnij dane apartamentu.')
      return
    }
    if (form.want_invoice && form.invoice_nip.trim() && !normalizujNumerPodatkowy(form.invoice_nip).ok) {
      setError('Sprawdź numer: polski NIP ma 10 cyfr, numer VAT z innego kraju UE zaczyna się od jego kodu, np. ESB12345678.')
      return
    }

    if (!akceptacja) {
      setError('Zaakceptuj regulamin, żeby przejść do płatności.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan, currency,
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          invoice_company: form.want_invoice ? form.invoice_company.trim() || null : null,
          invoice_nip: form.want_invoice ? form.invoice_nip.trim() || null : null,
          invoice_address: form.want_invoice ? form.invoice_address.trim() || null : null,
          apartment_name: form.apartment_name.trim(),
          apartment_location: form.apartment_location.trim(),
          notes: form.notes.trim() || null,
          akceptacja_regulaminu: akceptacja,
          wczesny_start: wczesnyStart,
          // Źródło zapamiętane przy wejściu (`ZapiszZrodlo`), tylko w pamięci karty.
          zrodlo: zapamietaneZrodlo() ?? PUSTE_ZRODLO,
        }),
      })

      const data = await res.json() as { stripe_url?: string; error?: string }

      if (data.stripe_url) {
        window.location.href = data.stripe_url
      } else {
        setError('Wystąpił błąd. Spróbuj ponownie lub napisz na kontakt@nobooking.eu')
      }
    } catch {
      setError('Błąd połączenia. Sprawdź internet i spróbuj ponownie.')
    }
    setLoading(false)
  }

  return (
    <div className="n-page">
      <div className="n-page__inner">
        <Link href="/#cennik" className="n-back"><CaretLeft weight="bold" aria-hidden />Zmień plan</Link>

        <h1>Zamówienie</h1>
        <p className="n-page__lead">Dane do umowy i faktury. Szczegóły apartamentu zbierzemy po płatności.</p>

        <div className="n-summary" style={{ marginTop: 24 }}>
          <Kafelek ikona={plan === 'pro' ? CrownSimple : HouseLine} kolor={plan === 'pro' ? 'ink' : 'emerald'} />
          <div className="n-summary__txt"><span>Wybrany plan</span><b>Nobooking {planLabel} · 2 lata</b></div>
          <div className="n-summary__price">{priceLabel}</div>
        </div>

        <form onSubmit={handleSubmit} noValidate style={{ marginTop: 28 }}>
          <div className="n-form-block">
            <p className="n-group-label">Dane kontaktowe</p>
            <div className="n-form-card">
              <div className="n-form-grid">
                <Field label="Imię" required htmlFor="z-imie">
                  <input id="z-imie" className="n-input" type="text" value={form.first_name} onChange={e => set('first_name', e.target.value)} autoComplete="given-name" />
                </Field>
                <Field label="Nazwisko" required htmlFor="z-nazwisko">
                  <input id="z-nazwisko" className="n-input" type="text" value={form.last_name} onChange={e => set('last_name', e.target.value)} autoComplete="family-name" />
                </Field>
              </div>
              <Field label="Email" required htmlFor="z-email">
                <input id="z-email" className="n-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} autoComplete="email" />
              </Field>
              <Field label="Telefon" required htmlFor="z-telefon">
                <input id="z-telefon" className="n-input" type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} autoComplete="tel" />
              </Field>
              <label className="n-check">
                <input type="checkbox" checked={form.want_invoice} onChange={e => set('want_invoice', e.target.checked)} />
                Chcę fakturę na firmę
              </label>
            </div>
          </div>

          {form.want_invoice && (
            <div className="n-form-block">
              <p className="n-group-label">Dane do faktury</p>
              <div className="n-form-card">
                <Field label="Nazwa firmy" htmlFor="z-firma">
                  <input id="z-firma" className="n-input" type="text" value={form.invoice_company} onChange={e => set('invoice_company', e.target.value)} />
                </Field>
                <Field label="NIP lub numer VAT UE" htmlFor="z-nip">
                  <input id="z-nip" className="n-input" type="text" value={form.invoice_nip} onChange={e => set('invoice_nip', e.target.value)} placeholder="np. 5342334497 albo ESB12345678" autoComplete="off" />
                </Field>
                <Field label="Adres" htmlFor="z-adres">
                  <textarea id="z-adres" className="n-input" value={form.invoice_address} onChange={e => set('invoice_address', e.target.value)} />
                </Field>
              </div>
            </div>
          )}

          <div className="n-form-block">
            <p className="n-group-label">Apartament</p>
            <div className="n-form-card">
              <Field label="Nazwa apartamentu" required htmlFor="z-apartament">
                <input id="z-apartament" className="n-input" type="text" value={form.apartment_name} onChange={e => set('apartment_name', e.target.value)} placeholder="np. Apartament Słoneczny" />
              </Field>
              <Field label="Lokalizacja (miasto/region)" required htmlFor="z-lokalizacja">
                <input id="z-lokalizacja" className="n-input" type="text" value={form.apartment_location} onChange={e => set('apartment_location', e.target.value)} placeholder="np. Torrevieja, Costa Blanca" />
              </Field>
              <Field label="Notatki" htmlFor="z-notatki">
                <textarea id="z-notatki" className="n-input" value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Cokolwiek chcesz nam przekazać" />
              </Field>
            </div>
          </div>

          <div className="n-form-block">
            <p className="n-group-label">Umowa</p>
            <div className="n-form-card">
              {/* Regulamin. Bez tej akceptacji regulamin nie wiąże klienta, a brak
                  informacji o prawie odstąpienia wydłuża termin z 14 dni do roku
                  (art. 29 ustawy o prawach konsumenta). Linki otwierają się
                  w nowej karcie, żeby nie zgubić wypełnionego formularza. */}
              <label className="n-check">
                <input type="checkbox" checked={akceptacja} onChange={e => setAkceptacja(e.target.checked)} required />
                <span>
                  Akceptuję{' '}
                  <a href="/regulamin" target="_blank" rel="noopener">regulamin</a>
                  {' '}i potwierdzam zapoznanie się z{' '}
                  <a href="/polityka-prywatnosci" target="_blank" rel="noopener">polityką prywatności</a>.
                  {' '}Jako konsument masz 14 dni na odstąpienie od umowy.
                </span>
              </label>

              {/* Żądanie wcześniejszego startu. Strona powstaje od razu niezależnie
                  od tego pola — decyduje ono tylko o tym, ile zwracamy przy
                  odstąpieniu (art. 35 i 36 ustawy o prawach konsumenta). */}
              <label className="n-check n-check--muted">
                <input type="checkbox" checked={wczesnyStart} onChange={e => setWczesnyStart(e.target.checked)} />
                <span>
                  <strong style={{ color: 'var(--ink)' }}>Nieobowiązkowe:</strong> żądam rozpoczęcia usługi przed upływem 14 dni na odstąpienie od umowy.
                  {' '}Wiem, że jeśli potem odstąpię, zapłacę za część usługi wykonaną do tego czasu.
                  {' '}Bez zaznaczenia strona też powstaje od razu, a przy odstąpieniu zwracamy całość.
                </span>
              </label>
            </div>
          </div>

          {error && (
            <div className="n-alert n-alert--error" role="alert" style={{ marginTop: 20 }}>
              <WarningCircle weight="fill" aria-hidden />{error}
            </div>
          )}

          <button type="submit" disabled={loading} className="n-btn n-btn--primary n-btn--block" style={{ marginTop: 24 }}>
            {loading ? <><span className="spinner" />Przekierowuję do płatności…</> : `Przejdź do płatności · ${priceLabel}`}
          </button>

          <p className="n-fineprint"><Lock weight="fill" aria-hidden />Płatność obsługuje Stripe.</p>
        </form>
      </div>
    </div>
  )
}
