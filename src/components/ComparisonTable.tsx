'use client'

import { useLang } from '@/context/LangContext'
import { TR } from '@/lib/translations'

const CHECK = <span style={{ color: 'var(--color-accent)', fontWeight: 800, fontSize: '1.1rem' }}>✓</span>
const CROSS = <span style={{ color: 'var(--color-pain)', fontSize: '1.1rem' }}>✗</span>
const PARTIAL = (text: string) => <span style={{ color: '#D97706', fontSize: '0.8rem', fontWeight: 600 }}>{text}</span>

export default function ComparisonTable() {
  const { lang } = useLang()
  const t = TR[lang]

  const rows = [
    {
      feature: t.compCommission,
      nb: <span style={{ color: 'var(--color-accent)', fontWeight: 800 }}>0%</span>,
      bk: <span style={{ color: 'var(--color-pain)', fontWeight: 700 }}>~15%</span>,
      ab: <span style={{ color: 'var(--color-pain)', fontWeight: 700 }}>3–17%</span>,
    },
    {
      feature: t.compDomain,
      nb: CHECK,
      bk: CROSS,
      ab: CROSS,
    },
    {
      feature: t.compPayments,
      nb: PARTIAL(lang === 'pl' ? 'Natychmiast (Stripe)' : 'Instant (Stripe)'),
      bk: PARTIAL(lang === 'pl' ? 'Po 30+ dniach' : '30+ days delay'),
      ab: PARTIAL(lang === 'pl' ? 'Po zameldowaniu' : 'After check-in'),
    },
    {
      feature: t.compEmail,
      nb: CHECK,
      bk: CROSS,
      ab: CROSS,
    },
    {
      feature: t.compAdmin,
      nb: CHECK,
      bk: PARTIAL(lang === 'pl' ? 'Ograniczony' : 'Limited'),
      ab: PARTIAL(lang === 'pl' ? 'Ograniczony' : 'Limited'),
    },
    {
      feature: t.compPrice,
      nb: <span style={{ color: 'var(--color-accent)', fontWeight: 700 }}>{lang === 'pl' ? '799 zł jednorazowo' : '€199 one-time'}</span>,
      bk: <span style={{ color: 'var(--color-pain)', fontSize: '0.8rem', fontWeight: 600 }}>{lang === 'pl' ? '0 zł + prowizja od każdej rezerwacji' : '€0 + commission per booking'}</span>,
      ab: <span style={{ color: 'var(--color-pain)', fontSize: '0.8rem', fontWeight: 600 }}>{lang === 'pl' ? '0 zł + prowizja od każdej rezerwacji' : '€0 + commission per booking'}</span>,
    },
  ]

  return (
    <section className="section-wrap section-wrap--alt">
      <div className="container">
        <div className="section-label">{lang === 'pl' ? 'Porównanie' : 'Comparison'}</div>
        <h2 className="section-title">{t.compTitle}</h2>
        <p className="section-sub">
          {lang === 'pl' ? 'Dlaczego własna strona to zawsze lepsza inwestycja.' : 'Why your own site is always the better investment.'}
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%', borderCollapse: 'collapse',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)', overflow: 'hidden',
          }}>
            <thead>
              <tr>
                <th style={{ padding: '1rem 1.25rem', textAlign: 'left', background: '#F9FAFB', fontSize: '0.85rem', fontWeight: 700 }}>
                  {t.compFeature}
                </th>
                <th style={{ padding: '1rem 1.25rem', textAlign: 'center', background: 'var(--color-dark)', color: 'white', fontSize: '0.85rem', fontWeight: 700 }}>
                  Nobooking
                </th>
                <th style={{ padding: '1rem 1.25rem', textAlign: 'center', background: '#F9FAFB', color: 'var(--color-text-muted)', fontSize: '0.85rem', fontWeight: 700 }}>
                  {t.compBooking}
                </th>
                <th style={{ padding: '1rem 1.25rem', textAlign: 'center', background: '#F9FAFB', color: 'var(--color-text-muted)', fontSize: '0.85rem', fontWeight: 700 }}>
                  {t.compAirbnb}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  <td style={{ padding: '0.875rem 1.25rem', fontSize: '0.875rem', fontWeight: 600, background: '#FAFAFA', borderTop: '1px solid var(--color-border-light)' }}>
                    {row.feature}
                  </td>
                  <td style={{ padding: '0.875rem 1.25rem', textAlign: 'center', borderTop: '1px solid var(--color-border-light)' }}>
                    {row.nb}
                  </td>
                  <td style={{ padding: '0.875rem 1.25rem', textAlign: 'center', borderTop: '1px solid var(--color-border-light)' }}>
                    {row.bk}
                  </td>
                  <td style={{ padding: '0.875rem 1.25rem', textAlign: 'center', borderTop: '1px solid var(--color-border-light)' }}>
                    {row.ab}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
