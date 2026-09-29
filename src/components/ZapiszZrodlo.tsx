'use client'

import { useEffect } from 'react'
import { czytajZrodlo, scal, zJson, KLUCZ_ZRODLA } from '@/lib/attribution'

/**
 * Zapisuje źródło wejścia przy pierwszej wizycie. Nic nie renderuje.
 *
 * Musi siedzieć w layoucie, a nie w formularzu zamówienia: parametry kampanii
 * lądują na stronie, na którą klient wszedł, a zamówienie składa kilka kliknięć
 * później — do tego czasu adres dawno ich nie zawiera.
 */
export default function ZapiszZrodlo() {
  useEffect(() => {
    try {
      const zapisane = zJson(window.localStorage.getItem(KLUCZ_ZRODLA))
      const biezace = czytajZrodlo(window.location.href, document.referrer)
      const wynik = scal(zapisane, biezace)
      if (wynik !== zapisane) {
        window.localStorage.setItem(KLUCZ_ZRODLA, JSON.stringify(wynik))
      }
    } catch {
      // Tryb prywatny i zablokowane dane witryny rzucają przy dostępie do
      // localStorage. Atrybucja jest miłym dodatkiem — nigdy nie może
      // przeszkodzić w złożeniu zamówienia.
    }
  }, [])

  return null
}
