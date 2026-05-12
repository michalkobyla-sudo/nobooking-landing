'use client'

import { useLang } from '@/context/LangContext'
import { TR } from '@/lib/translations'

function CheckIcon() {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: '22px', height: '22px', borderRadius: '50%',
      background: 'var(--color-accent-light)',
    }}>
      <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
        <polyline points="2,6.5 5,9.5 10,3" stroke="var(--color-accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </span>
  )
}

function CrossIcon() {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: '22px', height: '22px', borderRadius: '50%',
      background: '#FEF2F2',
    }}>
      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
        <line x1="2" y1="2" x2="10" y2="10" stroke="var(--color-pain)" strokeWidth="1.8" strokeLinecap="round"/>
        <line x1="10" y1="2" x2="2" y2="10" stroke="var(--color-pain)" strokeWidth="1.8" strokeLinecap="round"/>
      </svg>
    </span>
  )
}

function Partial({ text }: { text: string }) {
  return (
    <span style={{
      display: 'inline-block',
      background: '#FEF9C3', color: '#92400E',
      fontSize: '0.72rem', fontWeight: 600,
      padding: '0.2rem 0.5rem', borderRadius: '6px',
      lineHeight: 1.4,
    }}>
      {text}
    </span>
  )
}

export default function ComparisonTable() {
  const { lang } = useLang()
  const t = TR[lang]

  const rows = [
    {
      feature: t.compCommission,
      nb: <span style={{ color: 'var(--color-accent)', fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.03em' }}>0%</span>,
      bk: <span style={{ color: 'var(--color-pain)', fontWeight: 700, fontSize: '0.9rem' }}>~15%</span>,
      ab: <span style={{ color: 'var(--color-pain)', fontWeight: 700, fontSize: '0.9rem' }}>3–17%</span>,
    },
    {
      feature: t.compDomain,
      nb: <CheckIcon/>,
      bk: <CrossIcon/>,
      ab: <CrossIcon/>,
    },
    {
      feature: t.compPayments,
      nb: <Partial text={lang === 'pl' ? 'Natychmiast' : 'Instant'}/>,
      bk: <Partial text={lang === 'pl' ? '30+ dni' : '30+ days'}/>,
      ab: <Partial text={lang === 'pl' ? 'Po zameldowaniu' : 'After check-in'}/>,
    },
    {
      feature: t.compEmail,
      nb: <CheckIcon/>,
      bk: <CrossIcon/>,
      ab: <CrossIcon/>,
    },
    {
      feature: t.compAdmin,
      nb: <CheckIcon/>,
      bk: <Partial text={lang === 'pl' ? 'Ograniczony' : 'Limited'}/>,
      ab: <Partial text={lang === 'pl' ? 'Ograniczony' : 'Limited'}/>,
    },
    {
      feature: t.compPrice,
      nb: (
        <span style={{ color: 'var(--color-accent)', fontWeight: 800, fontSize: '0.82rem', letterSpacing: '-0.02em' }}>
          {lang === 'pl' ? '799 zł' : '€199'}
          <span style={{ fontWeight: 500, fontSize: '0.7rem', color: 'var(--color-accent)', opacity: 0.75, marginLeft: '0.25rem' }}>
            {lang === 'pl' ? '/ jednorazowo' : '/ one-time'}
          </span>
        </span>
      ),
      bk: <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>{lang === 'pl' ? '0 zł + prowizja' : '€0 + commission'}</span>,
      ab: <span style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>{lang === 'pl' ? '0 zł + prowizja' : '€0 + commission'}</span>,
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

        <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--color-border)' }}>
          <table style={{
            width: '100%', borderCollapse: 'collapse', minWidth: '560px',
          }}>
            <thead>
              <tr>
                <th style={{
                  padding: '1.125rem 1.5rem', textAlign: 'left',
                  background: '#F9FAFB',
                  borderBottom: '1px solid var(--color-border)',
                  fontSize: '0.78rem', fontWeight: 700,
                  color: 'var(--color-text-muted)', letterSpacing: '0.03em',
                  width: '40%',
                }}>
                  {t.compFeature}
                </th>
                <th style={{
                  padding: '1.125rem 1.5rem', textAlign: 'center',
                  background: 'var(--color-dark)', color: 'white',
                  borderBottom: '1px solid rgba(255,255,255,0.1)',
                  fontSize: '0.875rem', fontWeight: 800,
                  letterSpacing: '-0.02em',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
                    <span>Nobooking</span>
                    <span style={{ background: 'var(--color-accent)', borderRadius: '4px', padding: '0.1rem 0.4rem', fontSize: '0.6rem', fontWeight: 700, letterSpacing: '0.05em' }}>YOU</span>
                  </div>
                </th>
                <th style={{
                  padding: '1.125rem 1.5rem', textAlign: 'center',
                  background: '#F9FAFB',
                  borderBottom: '1px solid var(--color-border)',
                  borderLeft: '1px solid var(--color-border-light)',
                  fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-muted)',
                }}>
                  {t.compBooking}
                </th>
                <th style={{
                  padding: '1.125rem 1.5rem', textAlign: 'center',
                  background: '#F9FAFB',
                  borderBottom: '1px solid var(--color-border)',
                  borderLeft: '1px solid var(--color-border-light)',
                  fontSize: '0.82rem', fontWeight: 700, color: 'var(--color-text-muted)',
                }}>
                  {t.compAirbnb}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} style={{ background: i % 2 === 1 ? '#FAFAFA' : 'white' }}>
                  <td style={{
                    padding: '1rem 1.5rem',
                    fontSize: '0.875rem', fontWeight: 600,
                    borderTop: '1px solid var(--color-border-light)',
                    color: 'var(--color-text)',
                  }}>
                    {row.feature}
                  </td>
                  <td style={{
                    padding: '1rem 1.5rem', textAlign: 'center',
                    borderTop: '1px solid var(--color-border-light)',
                    background: i % 2 === 1 ? '#F0FDF9' : '#F7FEF9',
                    borderLeft: '1px solid var(--color-accent-border)',
                    borderRight: '1px solid var(--color-accent-border)',
                  }}>
                    {row.nb}
                  </td>
                  <td style={{
                    padding: '1rem 1.5rem', textAlign: 'center',
                    borderTop: '1px solid var(--color-border-light)',
                    borderLeft: '1px solid var(--color-border-light)',
                  }}>
                    {row.bk}
                  </td>
                  <td style={{
                    padding: '1rem 1.5rem', textAlign: 'center',
                    borderTop: '1px solid var(--color-border-light)',
                    borderLeft: '1px solid var(--color-border-light)',
                  }}>
                    {row.ab}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Caption */}
        <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--color-text-faint)', marginTop: '1.25rem' }}>
          {lang === 'pl' ? '* Prowizja Booking.com / Airbnb pobierana od każdej rezerwacji.' : '* Booking.com / Airbnb commission charged on every booking.'}
        </p>
      </div>
    </section>
  )
}
