'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useLang } from '@/context/LangContext'
import { TR } from '@/lib/translations'
import { PRICE_LABELS, PRICES } from '@/lib/prices'
import { zapamietaneDemo } from '@/lib/demoWPamieci'
import Kafelek from '@/components/ui/Kafelek'
import { CheckCircle, CrownSimple, HouseLine } from '@/components/ui/ikony'

export default function PricingCards() {
  const { lang, currency, setCurrency } = useLang()
  const t = TR[lang]
  const pl = lang === 'pl'
  const router = useRouter()
  const [loading, setLoading] = useState<'basic' | 'pro' | null>(null)

  function handleBuy(plan: 'basic' | 'pro') {
    setLoading(plan)
    // Klient przyszedł z podglądu swojego demo — formularz wypełni się jego danymi.
    const demo = zapamietaneDemo()
    router.push(`/zamow?plan=${plan}&currency=${currency}${demo ? `&demo=${encodeURIComponent(demo)}` : ''}`)
  }

  // Cena pakietu rozłożona na 24 miesiące, w górę do pełnej jednostki —
  // „mniej niż” zostaje prawdą także po zaokrągleniu.
  const miesiecznie = (plan: 'basic' | 'pro') => {
    const n = Math.ceil(PRICES[plan][currency] / 100 / 24)
    const kwota = currency === 'pln' ? `${n} zł` : pl ? `${n} €` : `€${n}`
    return pl ? `mniej niż ${kwota} miesięcznie` : `less than ${kwota} a month`
  }

  // Z `prices.ts`, nie z literałów: kwota pokazana i pobrana przez Stripe
  // muszą pochodzić z tego samego miejsca.
  const plany = [
    { id: 'basic' as const, nazwa: 'Basic', cena: PRICE_LABELS.basic[currency], cechy: t.basicFeatures, cta: t.pricingCtaBasic },
    { id: 'pro' as const, nazwa: 'Pro', cena: PRICE_LABELS.pro[currency], cechy: t.proFeatures, cta: t.pricingCtaPro },
  ]

  return (
    <section id="cennik" className="l-section l-alt">
      <div className="l-wrap">
        <div className="l-head">
          <h2>{pl ? 'Jedna opłata na dwa lata.' : 'One payment for two years.'}</h2>
          <p>{pl
            ? 'Bez abonamentu i bez prowizji — poza sezonem nie płacisz nic więcej. Cenę odnowienia zapisujemy w dniu zakupu.'
            : 'No subscription and no commission — nothing more to pay off-season. Your renewal price is locked in on the day you buy.'}</p>
        </div>

        <div className="n-seg" role="group" aria-label={pl ? 'Waluta' : 'Currency'}>
          {(['pln', 'eur'] as const).map(c => (
            <button key={c} type="button" aria-pressed={currency === c} onClick={() => setCurrency(c)}>
              {c.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="l-plans">
          {plany.map(p => {
            const pro = p.id === 'pro'
            return (
              <div key={p.id} className={`l-plan${pro ? ' l-plan--pro' : ''}`}>
                {pro && <span className="l-plan__tag">{t.pricingRecommended}</span>}
                <h3>
                  <Kafelek ikona={pro ? CrownSimple : HouseLine} kolor={pro ? 'ink' : 'emerald'} rozmiar="md" />
                  {p.nazwa}
                </h3>
                <div className="l-plan__price">{p.cena}<small>{t.pricingPeriod}</small></div>
                <p className="l-plan__month">{miesiecznie(p.id)}</p>
                <ul>
                  {p.cechy.map(c => <li key={c}><CheckCircle weight="fill" aria-hidden />{c}</li>)}
                </ul>
                <button
                  type="button"
                  className={`n-btn n-btn--block ${pro ? 'n-btn--light' : 'n-btn--primary'}`}
                  onClick={() => handleBuy(p.id)}
                  disabled={loading !== null}
                >
                  {loading === p.id
                    ? <><span className="spinner" style={pro ? { borderColor: '#D1D1D6', borderTopColor: 'var(--ink)' } : undefined} />{pl ? 'Przekierowanie…' : 'Redirecting…'}</>
                    : p.cta}
                </button>
              </div>
            )
          })}
        </div>
        <p className="l-renew">{t.pricingRenewal}</p>
      </div>
    </section>
  )
}
