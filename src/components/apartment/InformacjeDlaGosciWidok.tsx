import type { Lang } from '@/lib/apartmentTypes'
import type { DaneInformacji, Informacje } from '@/lib/informacjeDlaGosci'

/**
 * Wygląd strony „Prywatność i warunki rezerwacji”. Wspólny dla prawdziwych
 * apartamentów (`/sites/[slug]/informacje`) i demo (`/demo/informacje`) —
 * demo pokazuje klientowi, co dostaną jego goście.
 */
export function InformacjeDlaGosciWidok({ i, dane, primary, powrot, lang }: {
  i: Informacje; dane: DaneInformacji; primary: string; powrot: string; lang: Lang
}) {
  return (
    <main lang={lang} style={{ background: '#F8F5EF', minHeight: '100vh', padding: '3rem 1rem 5rem' }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <a href={powrot} style={{ fontSize: '0.85rem', color: primary, textDecoration: 'none', fontWeight: 600 }}>{i.powrot}</a>

        <article style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 16, padding: '2.25rem clamp(1.25rem, 4vw, 2.75rem)', marginTop: '1.25rem', color: '#1F2937', fontSize: '0.93rem', lineHeight: 1.7 }}>
          <h1 style={{ fontSize: 'clamp(1.5rem, 4vw, 1.9rem)', fontWeight: 900, letterSpacing: '-0.03em', lineHeight: 1.15, margin: '0 0 0.4rem' }}>{i.tytul}</h1>
          <p style={{ color: '#6B7280', margin: '0 0 2rem', fontSize: '0.9rem' }}>{dane.nazwaObiektu}</p>

          {i.sekcje.map((s, n) => (
            <section key={n} style={{ marginTop: n === 0 ? 0 : '2rem' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.01em', margin: '0 0 0.6rem' }}>{s.tytul}</h2>
              {s.akapity.map((a, k) => (
                <p key={k} style={{ margin: '0 0 0.75rem' }}>
                  {a}
                  {s.polityka && k === 0 && (
                    <> <a href={dane.politykaNobooking} target="_blank" rel="noopener" style={{ color: primary }}>{i.politykaEtykieta}</a>.</>
                  )}
                </p>
              ))}
              {s.punkty && (
                <ul style={{ margin: '0 0 0.75rem', paddingLeft: '1.2rem' }}>
                  {s.punkty.map((p, k) => <li key={k} style={{ marginBottom: '0.45rem' }}>{p}</li>)}
                </ul>
              )}
            </section>
          ))}
        </article>
      </div>
    </main>
  )
}
