'use client'

import { useLang } from '@/context/LangContext'
import type { Icon } from '@phosphor-icons/react'
import Kafelek, { type KolorKafelka } from '@/components/ui/Kafelek'
import {
  ArrowsClockwise, BellRinging, ChartLineUp, ChatCircleText, CreditCard, GlobeHemisphereWest,
  IdentificationCard, Images, Key, MapPin, SlidersHorizontal, SquaresFour, Star, Ticket, Translate,
} from '@/components/ui/ikony'

type Funkcja = { ikona: Icon; kolor: KolorKafelka; tytul: string; opis: string }
type Grupa = { nazwa: string; pro?: boolean; funkcje: Funkcja[] }

/**
 * Funkcje pogrupowane jak listy w Ustawieniach iOS. Każda pozycja ma pokrycie
 * w kodzie (panel: `components/owner/OwnerAdminApp.tsx`, strona gościa:
 * `components/apartment/ApartmentPage.tsx`) — nowej nie dopisuj bez sprawdzenia.
 */
function grupy(pl: boolean): Grupa[] {
  return [
    {
      nazwa: pl ? 'Rezerwacje i pieniądze' : 'Bookings and money',
      funkcje: [
        { ikona: CreditCard, kolor: 'orange', tytul: pl ? 'Płatności Stripe' : 'Stripe payments', opis: pl ? 'Pieniądze od gości prosto na Twoje konto Stripe' : 'Guest payments go straight to your Stripe account' },
        { ikona: SlidersHorizontal, kolor: 'orange', tytul: pl ? 'Ceny sezonowe' : 'Seasonal prices', opis: pl ? 'Sezony, minimum nocy i automatyczna wycena' : 'Seasons, minimum stay and automatic quotes' },
        { ikona: SquaresFour, kolor: 'graphite', tytul: pl ? 'Panel właściciela' : 'Owner panel', opis: pl ? 'Rezerwacje, cennik, galeria i opinie w jednym miejscu' : 'Bookings, pricing, gallery and reviews in one place' },
      ],
    },
    {
      nazwa: pl ? 'Goście' : 'Guests',
      funkcje: [
        { ikona: Key, kolor: 'emerald', tytul: pl ? 'Portal gościa' : 'Guest portal', opis: pl ? 'Szczegóły pobytu, dojazd i kontakt do Ciebie' : 'Stay details, directions and your contact details' },
        { ikona: BellRinging, kolor: 'red', tytul: pl ? 'Powiadomienia e-mail' : 'Email notifications', opis: pl ? 'Potwierdzenie, anulowanie, przypomnienie przed przyjazdem' : 'Confirmation, cancellation, pre-arrival reminder' },
        { ikona: Star, kolor: 'yellow', tytul: pl ? 'Opinie gości' : 'Guest reviews', opis: pl ? 'Prośba po pobycie, Ty decydujesz o publikacji' : 'Requested after the stay, you decide what is published' },
        { ikona: Translate, kolor: 'indigo', tytul: pl ? 'Cztery języki' : 'Four languages', opis: pl ? 'Polski, angielski, hiszpański i niemiecki' : 'Polish, English, Spanish and German' },
      ],
    },
    {
      nazwa: pl ? 'Prezentacja apartamentu' : 'Showing your apartment',
      funkcje: [
        { ikona: Images, kolor: 'teal', tytul: pl ? 'Galeria zdjęć i wideo' : 'Photo and video gallery', opis: pl ? 'Zdjęcia i film apartamentu na stronie' : 'Your apartment’s photos and video on the site' },
        { ikona: MapPin, kolor: 'blue', tytul: pl ? 'Mapa i okolica' : 'Map and surroundings', opis: pl ? 'Dojazd i atrakcje w pobliżu' : 'Directions and nearby attractions' },
        { ikona: GlobeHemisphereWest, kolor: 'emerald', tytul: pl ? 'Własny adres strony' : 'Your own site address', opis: pl ? 'twoja-nazwa.nobooking.eu' : 'your-name.nobooking.eu' },
      ],
    },
    {
      nazwa: pl ? 'W pakiecie' : 'Included with',
      pro: true,
      funkcje: [
        { ikona: ChatCircleText, kolor: 'ink', tytul: pl ? 'Powiadomienia SMS' : 'SMS notifications', opis: pl ? 'O każdej nowej rezerwacji, na Twój telefon' : 'For every new booking, on your phone' },
        { ikona: IdentificationCard, kolor: 'ink', tytul: 'Online check-in', opis: pl ? 'Dane gości przed przyjazdem' : 'Guest details before arrival' },
        { ikona: Ticket, kolor: 'ink', tytul: pl ? 'Kody rabatowe' : 'Discount codes', opis: pl ? 'Dla stałych gości i promocji' : 'For returning guests and promotions' },
        { ikona: ChartLineUp, kolor: 'ink', tytul: pl ? 'Dashboard analityczny' : 'Analytics dashboard', opis: pl ? 'Statystyki rezerwacji w panelu' : 'Booking statistics in your panel' },
      ],
    },
  ]
}

export default function FeaturesGrid() {
  const { lang } = useLang()
  const pl = lang === 'pl'

  return (
    <section id="funkcje" className="l-section l-alt">
      <div className="l-wrap">
        <div className="l-head">
          <h2>{pl ? 'Wszystko, czego potrzebuje apartament.' : 'Everything an apartment needs.'}</h2>
          <p>{pl ? 'Strona, panel, płatności i kalendarz. Działa od pierwszego dnia.' : 'Site, panel, payments and calendar. Working from day one.'}</p>
        </div>

        <div className="l-groups">
          <div className="l-feature-hero">
            <div>
              <Kafelek ikona={ArrowsClockwise} kolor="blue" rozmiar="lg" />
              <h3>{pl ? 'Jeden kalendarz dla strony i portali.' : 'One calendar for your site and the portals.'}</h3>
              <p>{pl
                ? 'Terminy z Booking.com i Airbnb blokują się na Twojej stronie same, a rezerwacje ze strony trafiają do portali. Bez przepisywania dat ręcznie.'
                : 'Booking.com and Airbnb dates block your site automatically, and site bookings reach the portals. No copying dates by hand.'}</p>
            </div>
            <div className="l-sync" aria-hidden>
              <div className="l-sync__src"><span className="n-dot" style={{ background: '#003B95' }} />Booking.com<small>{pl ? '6–8 lipca zajęte' : '6–8 July booked'}</small></div>
              <div className="l-sync__src"><span className="n-dot" style={{ background: '#FF5A5F' }} />Airbnb<small>{pl ? '16–17 lipca zajęte' : '16–17 July booked'}</small></div>
              <div className="l-sync__src l-sync__src--us"><span className="n-dot" style={{ background: 'var(--emerald)' }} />{pl ? 'Twoja strona' : 'Your site'}<small>{pl ? '11–14 lipca · opłacone' : '11–14 July · paid'}</small></div>
            </div>
          </div>

          {grupy(pl).map(g => (
            <div key={g.nazwa}>
              <p className="n-group-label">{g.nazwa}{g.pro && <span className="n-badge-pro">PRO</span>}</p>
              <ul className="n-list" style={{ listStyle: 'none' }}>
                {g.funkcje.map(f => (
                  <li key={f.tytul} className="n-row">
                    <Kafelek ikona={f.ikona} kolor={f.kolor} rozmiar="sm" />
                    <div className="n-row__txt"><b>{f.tytul}</b><span>{f.opis}</span></div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
