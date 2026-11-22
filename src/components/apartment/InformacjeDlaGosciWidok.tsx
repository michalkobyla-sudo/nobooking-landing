import type { Lang } from '@/lib/apartmentTypes'
import type { DaneInformacji, Informacje } from '@/lib/informacjeDlaGosci'
import { koloryMarki } from '@/lib/koloryMarki'
import { CaretLeft } from '@/components/ui/ikony'

/**
 * Wygląd strony „Prywatność i warunki rezerwacji”. Wspólny dla prawdziwych
 * apartamentów (`/sites/[slug]/informacje`) i demo (`/demo/informacje`) —
 * demo pokazuje klientowi, co dostaną jego goście. Styl iOS jak strona
 * apartamentu: szare tło, biała karta, linki w kolorze właściciela.
 */
export function InformacjeDlaGosciWidok({ i, dane, primary, powrot, lang }: {
  i: Informacje; dane: DaneInformacji; primary: string; powrot: string; lang: Lang
}) {
  const kolor = koloryMarki(primary).link
  return (
    <main lang={lang} className="n-page">
      <div className="n-page__inner" style={{ maxWidth: 720 }}>
        <a href={powrot} className="n-back" style={{ color: kolor }}><CaretLeft weight="bold" aria-hidden />{i.powrot.replace(/^[←\s]+/, '')}</a>

        <h1>{i.tytul}</h1>
        <p className="n-page__lead">{dane.nazwaObiektu}</p>

        <article className="n-card" style={{ marginTop: 24, fontSize: 16, lineHeight: 1.65, color: '#3A3A3C' }}>
          {i.sekcje.map((s, n) => (
            <section key={n} style={{ marginTop: n === 0 ? 0 : 28 }}>
              <h2 style={{ fontSize: 19, fontWeight: 700, letterSpacing: '-0.015em', color: 'var(--ink)', margin: '0 0 8px' }}>{s.tytul}</h2>
              {s.akapity.map((a, k) => (
                <p key={k} style={{ margin: '0 0 12px' }}>
                  {a}
                  {s.polityka && k === 0 && (
                    <> <a href={dane.politykaNobooking} target="_blank" rel="noopener" style={{ color: kolor, fontWeight: 600 }}>{i.politykaEtykieta}</a>.</>
                  )}
                </p>
              ))}
              {s.punkty && (
                <ul style={{ margin: '0 0 12px', paddingLeft: 20 }}>
                  {s.punkty.map((p, k) => <li key={k} style={{ marginBottom: 6 }}>{p}</li>)}
                </ul>
              )}
            </section>
          ))}
        </article>
      </div>
    </main>
  )
}
