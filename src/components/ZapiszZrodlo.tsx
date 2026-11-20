'use client'

import { useEffect } from 'react'
import { czytajZrodlo } from '@/lib/attribution'
import { zapamietajZrodlo } from '@/lib/zrodloWPamieci'

/** Klucz, pod którym do 2026-11-20 zapisywaliśmy źródło w `localStorage`. */
const STARY_KLUCZ = 'nobooking_zrodlo'

/**
 * Zapamiętuje źródło wejścia przy pierwszym załadowaniu strony. Nic nie renderuje
 * i niczego nie zapisuje w przeglądarce — patrz `lib/zrodloWPamieci.ts`.
 *
 * Musi siedzieć w layoucie, a nie w formularzu zamówienia: parametry kampanii
 * lądują na stronie, na którą klient wszedł, a zamówienie składa kilka kliknięć
 * później — do tego czasu adres dawno ich nie zawiera. Layout nie odmontowuje się
 * przy nawigacji wewnątrz serwisu, więc efekt biegnie raz na załadowanie.
 */
export default function ZapiszZrodlo() {
  useEffect(() => {
    zapamietajZrodlo(czytajZrodlo(window.location.href, document.referrer))
    try {
      // Sprzątanie po wcześniejszej wersji: usunięcie zapisu nie wymaga zgody,
      // a zostawiony leżałby w przeglądarkach odwiedzających bez końca.
      window.localStorage.removeItem(STARY_KLUCZ)
    } catch {
      // Tryb prywatny i zablokowane dane witryny rzucają przy dostępie.
    }
  }, [])

  return null
}
