'use client'

import { useLang } from '@/context/LangContext'
import { TR } from '@/lib/translations'

const YES = () => <span style={{ color: '#10B981', fontWeight: 700, fontSize: '1.1rem' }}>✓</span>
const NO = () => <span style={{ color: '#D1D5DB', fontWeight: 700, fontSize: '1.1rem' }}>✗</span>

export default function ComparisonTable() {
  const { lang } = useLang()
  const t = TR[lang]

  const rows = [
    { label: t.compCommission, basic: '0%', pro: '0%', booking: '15–18%', airbnb: '14–16%' },
    { label: t.compDomain, basic: true, pro: true, booking: false, airbnb: false },
    { label: t.compPayments, basic: true, pro: true, booking: false, airbnb: false },
    { label: t.compAdmin, basic: true, pro: true, booking: false, airbnb: false },
    { label: t.compPortal, basic: true, pro: true, booking: false, airbnb: false },
    { label: t.compEmail, basic: true, pro: true, booking: false, airbnb: false },
    { label: t.compMultilang, basic: true, pro: true, booking: false, airbnb: false },
    { label: t.compSms, basic: false, pro: true, booking: false, airbnb: false },
    { label: t.compCheckin, basic: false, pro: true, booking: false, airbnb: false },
    { label: t.compCodes, basic: false, pro: true, booking: false, airbnb: false },
    { label: t.compAnalytics, basic: false, pro: true, booking: false, airbnb: false },
    { label: t.compPrice, basic: '799 zł', pro: '1199 zł', booking: 'free*', airbnb: 'free*' },
  ]

  function renderCell(val: boolean | string) {
    if (val === true) return <YES />
    if (val === false) return <NO />
    return <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#1A1A2E' }}>{val}</span>
  }

  const headers = [t.compFeature, t.compBasic, t.compPro, t.compBooking, t.compAirbnb]
  const highlights = [false, true, true, false, false]

  return (
    <section style={{ padding: '5rem 1.5rem', backgroundColor: '#FAFAF8' }}>
      <div className="container">
        <h2 className="section-title">{t.compTitle}</h2>

        <div style={{ overflowX: 'auto', marginTop: '2rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
            <thead>
              <tr>
                {headers.map((h, i) => (
                  <th key={h} style={{
                    padding: '0.875rem 1rem',
                    textAlign: i === 0 ? 'left' : 'center',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    color: highlights[i] ? '#2B7A78' : '#6B7280',
                    backgroundColor: highlights[i] ? '#E6F4F1' : '#F3F4F6',
                    borderBottom: '2px solid',
                    borderColor: highlights[i] ? '#2B7A78' : '#E5E7EB',
                    whiteSpace: 'nowrap',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={row.label} style={{ backgroundColor: ri % 2 === 0 ? 'white' : '#F9FAFB' }}>
                  <td style={{ padding: '0.75rem 1rem', fontSize: '0.875rem', color: '#374151', fontWeight: 500 }}>
                    {row.label}
                  </td>
                  {[row.basic, row.pro, row.booking, row.airbnb].map((val, ci) => (
                    <td key={ci} style={{
                      padding: '0.75rem 1rem',
                      textAlign: 'center',
                      backgroundColor: ci < 2 ? (ri % 2 === 0 ? '#F0FAF9' : '#E6F4F1') : undefined,
                    }}>
                      {renderCell(val as boolean | string)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '0.75rem', textAlign: 'right' }}>
          {t.compNote}
        </p>
      </div>
    </section>
  )
}
