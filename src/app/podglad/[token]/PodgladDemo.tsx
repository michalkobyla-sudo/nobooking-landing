'use client'

import { useEffect } from 'react'
import ApartmentPage from '@/components/apartment/ApartmentPage'
import type { ApartmentConfig } from '@/lib/apartmentTypes'
import { zapamietajDemo } from '@/lib/demoWPamieci'
import { PRICE_LABELS } from '@/lib/prices'

/**
 * Gotowe demo: strona apartamentu jak `/demo` (formularz rezerwacji nic nie wysyła), z paskiem prowadzącym do
 * cennika. Token zostaje w pamięci karty, więc formularz zamówienia wypełni
 * się danymi z demo.
 */
export default function PodgladDemo({ token, config }: { token: string; config: ApartmentConfig }) {
  useEffect(() => { zapamietajDemo(token) }, [token])

  return (
    <ApartmentPage
      config={config}
      showDemoBanner
      baner={{
        tekst: 'To podgląd Twojej strony. Zdjęcia są przykładowe — swoje dodasz w panelu.',
        etykieta: `Zamów — od ${PRICE_LABELS.basic.pln}`,
        sciezka: '/#cennik',
      }}
    />
  )
}
