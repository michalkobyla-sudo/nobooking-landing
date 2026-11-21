/**
 * Generuje płytki ikon do maili: public/mail/<nazwa>.png (144×144, wyświetlane jako 36×36).
 *
 * Maile nie mogą używać SVG (Gmail i Outlook go nie pokazują), więc te same glify
 * Phosphor co na stronie (wariant fill) zapisujemy jako PNG na kolorowej płytce
 * w stylu iOS. Kolory i ich znaczenie: src/components/ui/Kafelek.tsx.
 *
 * Uruchom po zmianie listy: node scripts/ikony-maili.mjs
 */
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import * as P from '@phosphor-icons/react/ssr'
import sharp from 'sharp'
import { mkdirSync } from 'node:fs'

const KOLORY = {
  emerald: ['#10B981', '#059669', '#FFFFFF'],
  blue: ['#3B9BFF', '#007AFF', '#FFFFFF'],
  orange: ['#FFB23F', '#FF9500', '#FFFFFF'],
  yellow: ['#FFD93D', '#FFC500', '#5C4300'],
  red: ['#FF6259', '#FF3B30', '#FFFFFF'],
  indigo: ['#7A79F0', '#5856D6', '#FFFFFF'],
  teal: ['#4FC3D6', '#2AA3B8', '#FFFFFF'],
  graphite: ['#A1A1A6', '#7C7C82', '#FFFFFF'],
  ink: ['#3A3A3C', '#1D1D1F', '#FFFFFF'],
}

/** nazwa pliku → [ikona Phosphor, kolor płytki] */
export const IKONY_MAILI = {
  dom: ['HouseLineIcon', 'emerald'],
  panel: ['SquaresFourIcon', 'graphite'],
  platnosci: ['CreditCardIcon', 'orange'],
  poprawki: ['PencilSimpleIcon', 'graphite'],
  pro: ['CrownSimpleIcon', 'ink'],
  kalendarz: ['CalendarCheckIcon', 'blue'],
  formularz: ['ListChecksIcon', 'emerald'],
  gosc: ['UserIcon', 'emerald'],
  opinia: ['StarIcon', 'yellow'],
  anulowanie: ['XCircleIcon', 'red'],
  checkin: ['IdentificationCardIcon', 'ink'],
  klucz: ['KeyIcon', 'emerald'],
  koperta: ['EnvelopeSimpleIcon', 'red'],
  zegar: ['TimerIcon', 'emerald'],
  kwota: ['MoneyIcon', 'orange'],
  noc: ['MoonIcon', 'indigo'],
  zamowienie: ['ReceiptIcon', 'orange'],
  lupa: ['MagnifyingGlassIcon', 'graphite'],
}

const R = 144
mkdirSync('public/mail', { recursive: true })

for (const [plik, [nazwa, kolor]] of Object.entries(IKONY_MAILI)) {
  const Ikona = P[nazwa]
  if (!Ikona) throw new Error(`Brak ikony ${nazwa}`)
  const [gora, dol, glif] = KOLORY[kolor]
  const wnetrze = renderToStaticMarkup(createElement(Ikona, { weight: 'fill', color: glif, size: 84 }))
    .replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${R}" height="${R}" viewBox="0 0 ${R} ${R}">
    <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${gora}"/><stop offset="1" stop-color="${dol}"/></linearGradient></defs>
    <rect width="${R}" height="${R}" rx="34" fill="url(#g)"/>
    <svg x="30" y="30" width="84" height="84" viewBox="0 0 256 256" fill="${glif}">${wnetrze}</svg>
  </svg>`
  await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(`public/mail/${plik}.png`)
}
console.log(`Zapisano ${Object.keys(IKONY_MAILI).length} ikon w public/mail/`)
