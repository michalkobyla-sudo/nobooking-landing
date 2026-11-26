'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Kafelek from '@/components/ui/Kafelek'
import { EnvelopeSimple, Sparkle } from '@/components/ui/ikony'

/** Co tyle odświeżamy stronę, póki demo się generuje. */
const CO_ILE_MS = 4000
/** Po tylu odświeżeniach przestajemy — link i tak przyjdzie mailem. */
const MAKS_ODSWIEZEN = 45

export default function OczekiwanieNaDemo({ nazwa, wyczerpane }: { nazwa: string; wyczerpane: boolean }) {
  const router = useRouter()
  const [ile, setIle] = useState(0)
  const czekamy = !wyczerpane && ile < MAKS_ODSWIEZEN

  useEffect(() => {
    if (!czekamy) return
    const t = setTimeout(() => { setIle(n => n + 1); router.refresh() }, CO_ILE_MS)
    return () => clearTimeout(t)
  }, [czekamy, ile, router])

  return (
    <main className="n-page" style={{ display: 'grid', placeItems: 'center' }}>
      <div className="n-card" style={{ textAlign: 'center', maxWidth: 460 }} aria-live="polite">
        <Kafelek ikona={wyczerpane ? EnvelopeSimple : Sparkle} kolor={wyczerpane ? 'blue' : 'emerald'} rozmiar="lg" />
        {wyczerpane ? (
          <>
            <h1 style={{ fontSize: 26, margin: '16px 0 8px' }}>Przygotujemy je ręcznie</h1>
            <p className="n-page__lead" style={{ marginTop: 0 }}>
              Automat nie poradził sobie z demo apartamentu {nazwa}. Dostaliśmy zgłoszenie i odezwiemy się mailem z gotowym linkiem.
            </p>
          </>
        ) : (
          <>
            <h1 style={{ fontSize: 26, margin: '16px 0 8px' }}>Przygotowujemy demo</h1>
            <p className="n-page__lead" style={{ marginTop: 0 }}>
              Piszemy teksty strony {nazwa} w czterech językach. Zwykle trwa to mniej niż minutę — ta strona odświeży się sama, a link wyślemy też mailem.
            </p>
            {czekamy && <span className="spinner" style={{ marginTop: 20, borderColor: '#D1D1D6', borderTopColor: 'var(--emerald)' }} />}
          </>
        )}
        <p style={{ marginTop: 24, fontSize: 15 }}><Link href="/" style={{ color: 'var(--emerald-dark)', fontWeight: 600 }}>Wróć na nobooking.eu</Link></p>
      </div>
    </main>
  )
}
