'use client'

import type { ReactNode } from 'react'
import { useLang } from '@/context/LangContext'
import { TR } from '@/lib/translations'
import { PRICE_LABELS } from '@/lib/prices'
import { CheckCircle, XCircle } from '@/components/ui/ikony'

function Tak({ wyciszone }: { wyciszone?: boolean }) {
  const pl = useLang().lang === 'pl'
  return <CheckCircle weight="fill" className={`yes${wyciszone ? ' yes--muted' : ''}`} aria-label={pl ? 'tak' : 'yes'} role="img" />
}
function Nie() {
  const pl = useLang().lang === 'pl'
  return <XCircle weight="fill" className="no" aria-label={pl ? 'nie' : 'no'} role="img" />
}

export default function ComparisonTable() {
  const { lang } = useLang()
  const t = TR[lang]
  const pl = lang === 'pl'

  const wiersze: { cecha: string; nb: ReactNode; bk: ReactNode; ab: ReactNode }[] = [
    { cecha: pl ? 'Prowizja od rezerwacji' : 'Commission per booking', nb: <span style={{ color: 'var(--emerald-dark)' }}>0%</span>, bk: <span className="bad">~15%</span>, ab: <span className="bad">3–17%</span> },
    { cecha: t.compDomain, nb: <Tak />, bk: <Nie />, ab: <Nie /> },
    {
      cecha: pl ? 'Płatność gościa na Twoje konto' : 'Guest pays into your account',
      nb: <Tak />,
      // Booking.com pozwala też na płatność u gospodarza — zależy od modelu rozliczeń.
      bk: <small>{pl ? 'zależy od modelu' : 'depends on model'}</small>,
      ab: <Nie />,
    },
    { cecha: pl ? 'Panel i kalendarz' : 'Panel and calendar', nb: <Tak />, bk: <Tak wyciszone />, ab: <Tak wyciszone /> },
    {
      cecha: t.compPrice,
      nb: <>{pl ? `od ${PRICE_LABELS.basic.pln}` : `from ${PRICE_LABELS.basic.eur}`}<small>{pl ? 'za 2 lata, jednorazowo' : 'for 2 years, one-time'}</small></>,
      bk: pl ? 'bezpłatnie*' : 'free*',
      ab: pl ? 'bezpłatnie*' : 'free*',
    },
  ]

  return (
    <section id="porownanie" className="l-section">
      <div className="l-wrap">
        <div className="l-head"><h2>{pl ? 'Nobooking i portale, obok siebie.' : 'Nobooking and the portals, side by side.'}</h2></div>
        <div className="l-compare">
          <table>
            <thead>
              <tr>
                <th scope="col">{t.compFeature}</th>
                <th scope="col" className="us">Nobooking</th>
                <th scope="col">{t.compBooking}</th>
                <th scope="col">{t.compAirbnb}</th>
              </tr>
            </thead>
            <tbody>
              {wiersze.map(w => (
                <tr key={w.cecha}>
                  <td>{w.cecha}</td>
                  <td className="us">{w.nb}</td>
                  <td>{w.bk}</td>
                  <td>{w.ab}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="l-footnote">{pl ? '* Bez opłaty z góry, ale z prowizją od każdej rezerwacji.' : '* No upfront fee, but a commission on every booking.'}</p>
      </div>
    </section>
  )
}
