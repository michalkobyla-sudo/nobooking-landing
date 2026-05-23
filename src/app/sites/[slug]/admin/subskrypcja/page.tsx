'use client'

import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'next/navigation'

interface SiteInfo {
  expires_at: string | null
  plan: string
  renewal_price_pln: number | null
  renewal_price_eur: number | null
  renewal_currency: string | null
  active: boolean
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pl-PL', {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

function formatPrice(pln: number | null, eur: number | null, currency: string | null) {
  if (currency === 'eur' && eur) return `${(eur / 100).toFixed(0)} €`
  if (pln) return `${(pln / 100).toFixed(0)} zł`
  return '—'
}

function getDaysUntil(iso: string): number {
  return Math.round((new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
}

export default function SubskrypcjaPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const slug = params.slug as string

  const [site, setSite] = useState<SiteInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [renewing, setRenewing] = useState(false)
  const justRenewed = searchParams.get('renewed') === '1'

  useEffect(() => {
    fetch(`/api/sites/${slug}/owner/info`)
      .then(r => r.json())
      .then((data: SiteInfo) => { setSite(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [slug])

  async function handleRenew() {
    setRenewing(true)
    const res = await fetch(`/api/sites/${slug}/owner/renew`, { method: 'POST' })
    const data = await res.json() as { checkoutUrl?: string; error?: string }
    if (data.checkoutUrl) {
      window.location.href = data.checkoutUrl
    } else {
      alert('Błąd: ' + (data.error ?? 'nieznany'))
      setRenewing(false)
    }
  }

  const card: React.CSSProperties = {
    background: 'white',
    border: '1px solid #E5E7EB',
    borderRadius: '12px',
    padding: '1.5rem',
    marginBottom: '1rem',
  }

  if (loading) {
    return <div style={{ padding: '4rem', textAlign: 'center', color: '#9CA3AF' }}>Ładowanie...</div>
  }

  if (!site) {
    return <div style={{ padding: '4rem', textAlign: 'center', color: '#DC2626' }}>Błąd ładowania danych.</div>
  }

  const daysLeft = site.expires_at ? getDaysUntil(site.expires_at) : null
  const isExpired = daysLeft !== null && daysLeft < 0
  const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 14
  const price = formatPrice(site.renewal_price_pln, site.renewal_price_eur, site.renewal_currency)

  const statusColor = isExpired ? '#DC2626' : isUrgent ? '#D97706' : '#059669'
  const statusBg = isExpired ? '#FEF2F2' : isUrgent ? '#FEF3C7' : '#F0FDF4'
  const statusBorder = isExpired ? '#FECACA' : isUrgent ? '#FCD34D' : '#BBF7D0'

  let statusLabel = '✅ Aktywna'
  if (isExpired) statusLabel = '❌ Wygasła'
  else if (daysLeft !== null && daysLeft <= 1) statusLabel = `🚨 Wygasa jutro`
  else if (daysLeft !== null && daysLeft <= 7) statusLabel = `⚠️ Wygasa za ${daysLeft} dni`
  else if (daysLeft !== null && daysLeft <= 30) statusLabel = `⏳ Wygasa za ${daysLeft} dni`
  else if (daysLeft !== null) statusLabel = `✅ Aktywna — ${daysLeft} dni do odnowienia`

  return (
    <div>
      <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#111827', marginBottom: '1.5rem' }}>
        Subskrypcja
      </h1>

      {/* Success banner */}
      {justRenewed && (
        <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: '12px', padding: '1rem 1.5rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.25rem' }}>🎉</span>
          <div>
            <p style={{ margin: 0, fontWeight: 700, color: '#065F46', fontSize: '0.95rem' }}>Dziękujemy za odnowienie!</p>
            <p style={{ margin: '0.2rem 0 0', color: '#047857', fontSize: '0.85rem' }}>
              Subskrypcja została przedłużona o 2 lata.
              {site.expires_at && ` Nowa data wygaśnięcia: ${formatDate(site.expires_at)}.`}
            </p>
          </div>
        </div>
      )}

      {/* Status card */}
      <div style={{ ...card, border: `1px solid ${statusBorder}`, background: statusBg }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.75rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.25rem' }}>Status subskrypcji</p>
            <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: statusColor }}>{statusLabel}</p>
          </div>
          {site.expires_at && (
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: 0, fontSize: '0.75rem', color: '#9CA3AF', marginBottom: '0.125rem' }}>Data wygaśnięcia</p>
              <p style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#111827' }}>{formatDate(site.expires_at)}</p>
            </div>
          )}
        </div>
      </div>

      {/* Plan & price */}
      <div style={card}>
        <p style={{ margin: '0 0 1rem', fontSize: '0.75rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          Twój plan
        </p>
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
          <div>
            <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#111827' }}>
              Nobooking {site.plan === 'pro' ? 'Pro' : 'Basic'}
            </p>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.875rem', color: '#6B7280' }}>
              Subskrypcja 2-letnia
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#9CA3AF', marginBottom: '0.125rem' }}>
              Twoja zablokowana cena odnowienia
            </p>
            <p style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900, color: '#059669', letterSpacing: '-0.03em' }}>
              {price}
            </p>
            <p style={{ margin: '0.125rem 0 0', fontSize: '0.75rem', color: '#9CA3AF' }}>/ 2 lata — cena nigdy nie wzrośnie</p>
          </div>
        </div>
      </div>

      {/* Renew button — show if expiry is within 90 days or already expired */}
      {daysLeft !== null && daysLeft <= 90 && (
        <div style={{ ...card, borderColor: isExpired ? '#FECACA' : '#E5E7EB' }}>
          <p style={{ margin: '0 0 0.5rem', fontWeight: 700, fontSize: '1rem', color: '#111827' }}>
            {isExpired ? 'Przywróć dostęp' : 'Odnów teraz'}
          </p>
          <p style={{ margin: '0 0 1.25rem', fontSize: '0.875rem', color: '#6B7280', lineHeight: 1.6 }}>
            {isExpired
              ? 'Strona jest wyłączona. Opłać odnowienie, a dostęp zostanie przywrócony natychmiast.'
              : `Przedłuż subskrypcję o kolejne 2 lata za ${price}. Nowa data wygaśnięcia: ${site.expires_at ? formatDate(new Date(new Date(site.expires_at).getTime() + 2 * 365.25 * 24 * 60 * 60 * 1000).toISOString()) : '—'}.`
            }
          </p>
          <button
            onClick={handleRenew}
            disabled={renewing}
            style={{
              background: isExpired ? '#DC2626' : '#059669',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '0.875rem 1.75rem',
              fontSize: '0.95rem',
              fontWeight: 700,
              fontFamily: 'inherit',
              cursor: renewing ? 'not-allowed' : 'pointer',
              opacity: renewing ? 0.7 : 1,
            }}
          >
            {renewing ? 'Przekierowuję do płatności...' : `${isExpired ? 'Przywróć' : 'Odnów'} — ${price} →`}
          </button>
        </div>
      )}

      {/* Info for long-term active sites */}
      {daysLeft !== null && daysLeft > 90 && (
        <div style={{ ...card, background: '#F9FAFB' }}>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#6B7280', lineHeight: 1.65 }}>
            Otrzymasz przypomnienie e-mailem na <strong>90, 30, 14, 7 i 1 dzień</strong> przed wygaśnięciem subskrypcji.
            Cena odnowienia jest zablokowana i nie zmieni się niezależnie od zmian cennika.
          </p>
        </div>
      )}
    </div>
  )
}
