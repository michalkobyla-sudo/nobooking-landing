'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import Kafelek from '@/components/ui/Kafelek'
import { CaretLeft, CheckCircle, Envelope, ListChecks, Timer } from '@/components/ui/ikony'

const KROKI = [
  { ikona: Envelope, kolor: 'red' as const, tytul: 'Mail z formularzem', opis: 'Wkrótce dostaniesz od nas link do formularza startowego.' },
  { ikona: ListChecks, kolor: 'orange' as const, tytul: 'Formularz', opis: 'Opisz apartament, dodaj zdjęcia i ceny.' },
  { ikona: Timer, kolor: 'emerald' as const, tytul: 'Strona gotowa', opis: 'Budujemy ją zwykle w ciągu 24 godzin od wypełnienia formularza.' },
]

function SukcesContent() {
  const searchParams = useSearchParams()
  const plan = searchParams.get('plan') ?? 'basic'
  const planLabel = plan === 'pro' ? 'Nobooking Pro' : 'Nobooking Basic'

  return (
    <div className="n-page" style={{ display: 'flex', alignItems: 'center' }}>
      <div className="n-page__inner" style={{ maxWidth: 520, width: '100%' }}>
        <div style={{ textAlign: 'center' }}>
          <CheckCircle weight="fill" size={72} color="var(--emerald)" aria-hidden style={{ margin: '0 auto 18px', display: 'block' }} />
          <h1>Płatność przyjęta</h1>
          <p className="n-page__lead">{planLabel} · 2 lata</p>
        </div>

        <p className="n-group-label" style={{ marginTop: 32 }}>Co dalej</p>
        <ol className="n-list" style={{ listStyle: 'none' }}>
          {KROKI.map(k => (
            <li key={k.tytul} className="n-row">
              <Kafelek ikona={k.ikona} kolor={k.kolor} rozmiar="sm" />
              <div className="n-row__txt"><b>{k.tytul}</b><span>{k.opis}</span></div>
            </li>
          ))}
        </ol>

        <div style={{ textAlign: 'center', marginTop: 28 }}>
          <Link href="/" className="n-back" style={{ marginBottom: 0 }}><CaretLeft weight="bold" aria-hidden />Wróć na stronę główną</Link>
        </div>
      </div>
    </div>
  )
}

export default function SukcesPage() {
  return (
    <Suspense>
      <SukcesContent />
    </Suspense>
  )
}
