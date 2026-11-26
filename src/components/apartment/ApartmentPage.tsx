'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { ApartmentConfig, Lang } from '@/lib/apartmentTypes'
import { sezonDla, opisMiesiecy } from '@/lib/bookingPricing'
import { adresOdtwarzacza } from '@/lib/galeria'
import { ETYKIETY } from '@/lib/informacjeDlaGosci'
import { koloryMarki } from '@/lib/koloryMarki'
import Kafelek from '@/components/ui/Kafelek'
import {
  ArrowSquareOut, Bathtub, Bed, CalendarCheck, CaretLeft, CaretRight, ChatCircleText, Check,
  HouseLine, IdentificationCard, Images, List, Lock, MapPin, Minus, PlayCircle, Plus, Ruler,
  Star, Users, WarningCircle, X,
} from '@/components/ui/ikony'

/*
 * Strona apartamentu w stylu iOS (2026-11-22) — ten sam język co reszta
 * Nobooking (szare tło, białe karty, listy jak w Ustawieniach), ale w kolorze
 * właściciela: `config.theme.primary` trafia do CSS jako --a-primary.
 * Style: sekcja „STRONA APARTAMENTU” w `src/app/ios.css`.
 *
 * Układ zależy wyłącznie od CSS (media queries), nie od szerokości okna
 * mierzonej w JS — wcześniejsze `useIsMobile` dawało mignięcie wersji
 * komputerowej na telefonie przy każdym wejściu.
 */

// ─── Teksty interfejsu ───────────────────────────────────────────────────────
// `{n}` w tekście zastępuje funkcja `wstaw`.

const UI = {
  pl: {
    navGallery: 'Galeria', navAbout: 'Apartament', navCalendar: 'Ceny', navReviews: 'Opinie', navMap: 'Okolica', navBook: 'Zarezerwuj', menu: 'Menu',
    heroCTA: 'Sprawdź dostępność', heroGallery: 'Zdjęcia',
    photoPrev: 'Poprzednie zdjęcie', photoNext: 'Następne zdjęcie', close: 'Zamknij',
    specsRooms: 'sypialnie', specsGuests: 'gości', specsBath: 'łazienki', specsArea: 'powierzchni',
    aboutTitle: 'O apartamencie', amenitiesTitle: 'Udogodnienia',
    priceFrom: 'Pobyt od', priceUnit: '/ noc', minNights: 'Minimalna liczba nocy: {n}',
    galleryTitle: 'Zdjęcia', galleryShowAll: 'Pokaż wszystkie zdjęcia ({n})',
    videoTitle: 'Wideo',
    calTitle: 'Dostępność i ceny', calSub: 'Zajęte dni są przekreślone. Ceny zależą od sezonu przyjazdu.',
    calFree: 'Wolne', calBooked: 'Zajęte', calPrev: 'Poprzedni miesiąc', calNext: 'Następny miesiąc',
    pricerSeason: 'Sezon', pricerNights: 'Liczba nocy', pricerNightsHint: 'W tym sezonie minimum {n}',
    pricerPerNight: '/ noc', pricerTotal: 'Łącznie', pricerCleaning: 'Sprzątanie', pricerBook: 'Zarezerwuj',
    reviewsTitle: 'Opinie gości', reviewsOf: 'Opinie: {n}',
    mapTitle: 'Lokalizacja', nearbyTitle: 'W okolicy',
    mapShow: 'Pokaż mapę', mapOpen: 'Otwórz w Mapach Google', mapNote: 'Mapa ładuje się z serwerów Google, które mogą zapisać pliki cookie.',
    portalTitle: 'Po rezerwacji wszystko masz w jednym miejscu',
    portalDesc: 'Po opłaceniu rezerwacji dostaniesz mailem link do panelu gościa.',
    portalDetails: 'Szczegóły pobytu', portalDetailsDesc: 'Daty, liczba gości, kwota',
    portalMap: 'Adres i dojazd', portalMapDesc: 'Z przyciskiem do mapy',
    portalContact: 'Kontakt z gospodarzem', portalContactDesc: 'Telefon i email',
    portalCheckin: 'Check-in online', portalCheckinDesc: 'Dane do zameldowania przed przyjazdem',
    portalReview: 'Opinia po pobycie', portalReviewDesc: 'Jedna na rezerwację',
    bookTitle: 'Rezerwacja', bookLead: 'Wybierz termin i przejdź do płatności. Potwierdzenie przyjdzie mailem.',
    bookStay: 'Termin', bookYou: 'Twoje dane',
    bookArrival: 'Przyjazd', bookDeparture: 'Wyjazd', bookGuests: 'Liczba gości',
    bookName: 'Imię i nazwisko', bookEmail: 'Email', bookPhone: 'Telefon',
    bookMsg: 'Wiadomość do gospodarza', bookOptional: 'nieobowiązkowe',
    bookDiscount: 'Kod rabatowy', bookDiscountCheck: 'Sprawdź', bookDiscountOk: 'Kod działa: {n}% zniżki', bookDiscountBad: 'Ten kod nie działa',
    bookDiscountLine: 'Rabat', bookTotal: 'Łącznie',
    bookSubmit: 'Przejdź do płatności', bookRedirecting: 'Przekierowuję do płatności…',
    bookSuccess: 'Rezerwacja przyjęta', bookSuccessNote: 'Szczegóły wyślemy mailem.',
    errInvalidDates: 'Sprawdź daty: wyjazd musi być po przyjeździe, a przyjazd nie wcześniej niż dziś.',
    errUnavailable: 'Ten termin jest już zajęty. Wybierz inne daty.',
    errMinNights: 'W tym sezonie minimalny pobyt to {n} nocy.', errTooLong: 'Najdłuższy pobyt to {n} nocy.',
    errGuests: 'Sprawdź liczbę gości.', errMissing: 'Uzupełnij imię i email.',
    errPayment: 'Nie udało się przygotować płatności. Spróbuj ponownie.', errNoPayments: 'Płatności online są chwilowo wyłączone. Skontaktuj się z gospodarzem.',
    errGeneric: 'Coś poszło nie tak. Spróbuj ponownie.', errNetwork: 'Brak połączenia. Sprawdź internet i spróbuj ponownie.',
    noStripeTitle: 'Rezerwacje bezpośrednio u gospodarza', noStripeText: 'Płatności online są chwilowo niedostępne. Napisz albo zadzwoń.',
    stripeNote: 'Bezpieczna płatność przez Stripe',
    footerPowered: 'Strona zrobiona w', footerTagline: 'Własna strona rezerwacji bez prowizji',
    demoBanner: 'To demo strony, którą robi Nobooking.', demoOrder: 'Zamów własną',
    months: ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'],
    days: ['Pn','Wt','Śr','Cz','Pt','So','Nd'],
  },
  en: {
    navGallery: 'Photos', navAbout: 'Apartment', navCalendar: 'Prices', navReviews: 'Reviews', navMap: 'Area', navBook: 'Book', menu: 'Menu',
    heroCTA: 'Check availability', heroGallery: 'Photos',
    photoPrev: 'Previous photo', photoNext: 'Next photo', close: 'Close',
    specsRooms: 'bedrooms', specsGuests: 'guests', specsBath: 'bathrooms', specsArea: 'floor area',
    aboutTitle: 'About the apartment', amenitiesTitle: 'Amenities',
    priceFrom: 'Stays from', priceUnit: '/ night', minNights: 'Minimum nights: {n}',
    galleryTitle: 'Photos', galleryShowAll: 'Show all photos ({n})',
    videoTitle: 'Video',
    calTitle: 'Availability and prices', calSub: 'Booked days are crossed out. Prices depend on the season of arrival.',
    calFree: 'Available', calBooked: 'Booked', calPrev: 'Previous month', calNext: 'Next month',
    pricerSeason: 'Season', pricerNights: 'Nights', pricerNightsHint: 'Minimum {n} in this season',
    pricerPerNight: '/ night', pricerTotal: 'Total', pricerCleaning: 'Cleaning', pricerBook: 'Book',
    reviewsTitle: 'Guest reviews', reviewsOf: 'Reviews: {n}',
    mapTitle: 'Location', nearbyTitle: 'Nearby',
    mapShow: 'Show map', mapOpen: 'Open in Google Maps', mapNote: 'The map loads from Google servers, which may set cookies.',
    portalTitle: 'After booking, everything is in one place',
    portalDesc: 'Once your booking is paid, you will get a link to the guest portal by email.',
    portalDetails: 'Stay details', portalDetailsDesc: 'Dates, guests, amount',
    portalMap: 'Address and directions', portalMapDesc: 'With a map button',
    portalContact: 'Host contact', portalContactDesc: 'Phone and email',
    portalCheckin: 'Online check-in', portalCheckinDesc: 'Registration details before arrival',
    portalReview: 'Review after the stay', portalReviewDesc: 'One per booking',
    bookTitle: 'Book your stay', bookLead: 'Choose your dates and continue to payment. Confirmation arrives by email.',
    bookStay: 'Dates', bookYou: 'Your details',
    bookArrival: 'Arrival', bookDeparture: 'Departure', bookGuests: 'Guests',
    bookName: 'Full name', bookEmail: 'Email', bookPhone: 'Phone',
    bookMsg: 'Message to the host', bookOptional: 'optional',
    bookDiscount: 'Discount code', bookDiscountCheck: 'Apply', bookDiscountOk: 'Code applied: {n}% off', bookDiscountBad: 'This code does not work',
    bookDiscountLine: 'Discount', bookTotal: 'Total',
    bookSubmit: 'Continue to payment', bookRedirecting: 'Redirecting to payment…',
    bookSuccess: 'Booking received', bookSuccessNote: 'We will send the details by email.',
    errInvalidDates: 'Check the dates: departure must be after arrival, and arrival cannot be in the past.',
    errUnavailable: 'These dates are already booked. Please choose others.',
    errMinNights: 'The minimum stay in this season is {n} nights.', errTooLong: 'The longest possible stay is {n} nights.',
    errGuests: 'Check the number of guests.', errMissing: 'Please enter your name and email.',
    errPayment: 'We could not prepare the payment. Please try again.', errNoPayments: 'Online payments are switched off right now. Please contact the host.',
    errGeneric: 'Something went wrong. Please try again.', errNetwork: 'No connection. Check your internet and try again.',
    noStripeTitle: 'Book directly with the host', noStripeText: 'Online payments are temporarily unavailable. Write or call.',
    stripeNote: 'Secure payment via Stripe',
    footerPowered: 'Website made with', footerTagline: 'Your own booking website, no commission',
    demoBanner: 'This is a demo of a site made by Nobooking.', demoOrder: 'Order yours',
    months: ['January','February','March','April','May','June','July','August','September','October','November','December'],
    days: ['Mo','Tu','We','Th','Fr','Sa','Su'],
  },
  es: {
    navGallery: 'Fotos', navAbout: 'Apartamento', navCalendar: 'Precios', navReviews: 'Opiniones', navMap: 'Zona', navBook: 'Reservar', menu: 'Menú',
    heroCTA: 'Ver disponibilidad', heroGallery: 'Fotos',
    photoPrev: 'Foto anterior', photoNext: 'Foto siguiente', close: 'Cerrar',
    specsRooms: 'dormitorios', specsGuests: 'huéspedes', specsBath: 'baños', specsArea: 'de superficie',
    aboutTitle: 'Sobre el apartamento', amenitiesTitle: 'Comodidades',
    priceFrom: 'Estancias desde', priceUnit: '/ noche', minNights: 'Noches mínimas: {n}',
    galleryTitle: 'Fotos', galleryShowAll: 'Ver todas las fotos ({n})',
    videoTitle: 'Vídeo',
    calTitle: 'Disponibilidad y precios', calSub: 'Los días ocupados aparecen tachados. El precio depende de la temporada de llegada.',
    calFree: 'Libre', calBooked: 'Ocupado', calPrev: 'Mes anterior', calNext: 'Mes siguiente',
    pricerSeason: 'Temporada', pricerNights: 'Noches', pricerNightsHint: 'Mínimo {n} en esta temporada',
    pricerPerNight: '/ noche', pricerTotal: 'Total', pricerCleaning: 'Limpieza', pricerBook: 'Reservar',
    reviewsTitle: 'Opiniones de huéspedes', reviewsOf: 'Opiniones: {n}',
    mapTitle: 'Ubicación', nearbyTitle: 'Cerca',
    mapShow: 'Mostrar mapa', mapOpen: 'Abrir en Google Maps', mapNote: 'El mapa se carga desde los servidores de Google, que pueden guardar cookies.',
    portalTitle: 'Después de reservar, todo en un solo lugar',
    portalDesc: 'Cuando la reserva esté pagada, recibirás por email el enlace al portal del huésped.',
    portalDetails: 'Detalles de la estancia', portalDetailsDesc: 'Fechas, huéspedes, importe',
    portalMap: 'Dirección y cómo llegar', portalMapDesc: 'Con botón al mapa',
    portalContact: 'Contacto del anfitrión', portalContactDesc: 'Teléfono y email',
    portalCheckin: 'Check-in online', portalCheckinDesc: 'Datos de registro antes de llegar',
    portalReview: 'Opinión tras la estancia', portalReviewDesc: 'Una por reserva',
    bookTitle: 'Reserva tu estancia', bookLead: 'Elige las fechas y continúa al pago. La confirmación llega por email.',
    bookStay: 'Fechas', bookYou: 'Tus datos',
    bookArrival: 'Llegada', bookDeparture: 'Salida', bookGuests: 'Huéspedes',
    bookName: 'Nombre completo', bookEmail: 'Email', bookPhone: 'Teléfono',
    bookMsg: 'Mensaje para el anfitrión', bookOptional: 'opcional',
    bookDiscount: 'Código de descuento', bookDiscountCheck: 'Aplicar', bookDiscountOk: 'Código aplicado: {n}% de descuento', bookDiscountBad: 'Este código no funciona',
    bookDiscountLine: 'Descuento', bookTotal: 'Total',
    bookSubmit: 'Continuar al pago', bookRedirecting: 'Redirigiendo al pago…',
    bookSuccess: 'Reserva recibida', bookSuccessNote: 'Te enviaremos los detalles por email.',
    errInvalidDates: 'Revisa las fechas: la salida debe ser posterior a la llegada y la llegada no puede ser pasada.',
    errUnavailable: 'Estas fechas ya están ocupadas. Elige otras.',
    errMinNights: 'La estancia mínima en esta temporada es de {n} noches.', errTooLong: 'La estancia máxima es de {n} noches.',
    errGuests: 'Revisa el número de huéspedes.', errMissing: 'Introduce tu nombre y email.',
    errPayment: 'No se pudo preparar el pago. Inténtalo de nuevo.', errNoPayments: 'Los pagos online están desactivados ahora. Contacta con el anfitrión.',
    errGeneric: 'Algo salió mal. Inténtalo de nuevo.', errNetwork: 'Sin conexión. Revisa internet e inténtalo de nuevo.',
    noStripeTitle: 'Reserva directamente con el anfitrión', noStripeText: 'Los pagos online no están disponibles temporalmente. Escribe o llama.',
    stripeNote: 'Pago seguro con Stripe',
    footerPowered: 'Web hecha con', footerTagline: 'Web de reservas propia, sin comisiones',
    demoBanner: 'Esta es una demo de una web hecha por Nobooking.', demoOrder: 'Pide la tuya',
    months: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
    days: ['Lu','Ma','Mi','Ju','Vi','Sá','Do'],
  },
  de: {
    navGallery: 'Fotos', navAbout: 'Apartment', navCalendar: 'Preise', navReviews: 'Bewertungen', navMap: 'Umgebung', navBook: 'Buchen', menu: 'Menü',
    heroCTA: 'Verfügbarkeit prüfen', heroGallery: 'Fotos',
    photoPrev: 'Vorheriges Foto', photoNext: 'Nächstes Foto', close: 'Schließen',
    specsRooms: 'Schlafzimmer', specsGuests: 'Gäste', specsBath: 'Bäder', specsArea: 'Wohnfläche',
    aboutTitle: 'Über das Apartment', amenitiesTitle: 'Ausstattung',
    priceFrom: 'Aufenthalte ab', priceUnit: '/ Nacht', minNights: 'Mindestanzahl Nächte: {n}',
    galleryTitle: 'Fotos', galleryShowAll: 'Alle Fotos anzeigen ({n})',
    videoTitle: 'Video',
    calTitle: 'Verfügbarkeit und Preise', calSub: 'Belegte Tage sind durchgestrichen. Der Preis richtet sich nach der Saison der Anreise.',
    calFree: 'Frei', calBooked: 'Belegt', calPrev: 'Vorheriger Monat', calNext: 'Nächster Monat',
    pricerSeason: 'Saison', pricerNights: 'Nächte', pricerNightsHint: 'In dieser Saison mindestens {n}',
    pricerPerNight: '/ Nacht', pricerTotal: 'Gesamt', pricerCleaning: 'Endreinigung', pricerBook: 'Buchen',
    reviewsTitle: 'Gästebewertungen', reviewsOf: 'Bewertungen: {n}',
    mapTitle: 'Lage', nearbyTitle: 'In der Nähe',
    mapShow: 'Karte anzeigen', mapOpen: 'In Google Maps öffnen', mapNote: 'Die Karte wird von Google-Servern geladen, die Cookies setzen können.',
    portalTitle: 'Nach der Buchung alles an einem Ort',
    portalDesc: 'Nach der Zahlung bekommen Sie per E-Mail den Link zum Gästeportal.',
    portalDetails: 'Aufenthaltsdetails', portalDetailsDesc: 'Daten, Gäste, Betrag',
    portalMap: 'Adresse und Anfahrt', portalMapDesc: 'Mit Kartenlink',
    portalContact: 'Kontakt zum Gastgeber', portalContactDesc: 'Telefon und E-Mail',
    portalCheckin: 'Online-Check-in', portalCheckinDesc: 'Meldedaten vor der Anreise',
    portalReview: 'Bewertung nach dem Aufenthalt', portalReviewDesc: 'Eine pro Buchung',
    bookTitle: 'Aufenthalt buchen', bookLead: 'Wählen Sie die Daten und gehen Sie weiter zur Zahlung. Die Bestätigung kommt per E-Mail.',
    bookStay: 'Reisedaten', bookYou: 'Ihre Angaben',
    bookArrival: 'Anreise', bookDeparture: 'Abreise', bookGuests: 'Gäste',
    bookName: 'Vollständiger Name', bookEmail: 'E-Mail', bookPhone: 'Telefon',
    bookMsg: 'Nachricht an den Gastgeber', bookOptional: 'optional',
    bookDiscount: 'Rabattcode', bookDiscountCheck: 'Einlösen', bookDiscountOk: 'Code aktiv: {n}% Rabatt', bookDiscountBad: 'Dieser Code funktioniert nicht',
    bookDiscountLine: 'Rabatt', bookTotal: 'Gesamt',
    bookSubmit: 'Weiter zur Zahlung', bookRedirecting: 'Weiterleitung zur Zahlung…',
    bookSuccess: 'Buchung erhalten', bookSuccessNote: 'Die Details schicken wir per E-Mail.',
    errInvalidDates: 'Bitte Daten prüfen: Die Abreise muss nach der Anreise liegen, die Anreise nicht in der Vergangenheit.',
    errUnavailable: 'Diese Tage sind bereits belegt. Bitte andere wählen.',
    errMinNights: 'Der Mindestaufenthalt in dieser Saison beträgt {n} Nächte.', errTooLong: 'Der längste Aufenthalt beträgt {n} Nächte.',
    errGuests: 'Bitte die Anzahl der Gäste prüfen.', errMissing: 'Bitte Name und E-Mail angeben.',
    errPayment: 'Die Zahlung konnte nicht vorbereitet werden. Bitte erneut versuchen.', errNoPayments: 'Online-Zahlungen sind gerade ausgeschaltet. Bitte den Gastgeber kontaktieren.',
    errGeneric: 'Etwas ist schiefgelaufen. Bitte erneut versuchen.', errNetwork: 'Keine Verbindung. Bitte Internet prüfen und erneut versuchen.',
    noStripeTitle: 'Direkt beim Gastgeber buchen', noStripeText: 'Online-Zahlungen sind vorübergehend nicht verfügbar. Schreiben oder rufen Sie an.',
    stripeNote: 'Sichere Zahlung über Stripe',
    footerPowered: 'Website erstellt mit', footerTagline: 'Eigene Buchungswebsite ohne Provision',
    demoBanner: 'Dies ist eine Demo einer Website von Nobooking.', demoOrder: 'Eigene bestellen',
    months: ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'],
    days: ['Mo','Di','Mi','Do','Fr','Sa','So'],
  },
}

type Teksty = typeof UI.pl

// ─── Pomocnicze ──────────────────────────────────────────────────────────────

function t(obj: { pl: string; en: string; es: string; de: string }, lang: Lang) {
  return obj[lang]
}

function wstaw(tekst: string, n: number | string) {
  return tekst.replace('{n}', String(n))
}

function Gwiazdki({ ocena }: { ocena: number }) {
  const pelne = Math.round(ocena)
  return (
    <span className="a-stars" aria-label={`${ocena} / 5`}>
      {[0, 1, 2, 3, 4].map(i => <Star key={i} weight="fill" className={i < pelne ? undefined : 'is-off'} aria-hidden />)}
    </span>
  )
}

// ─── Pasek demo ──────────────────────────────────────────────────────────────

/** Pasek demo z własną treścią — podgląd strony klienta (`/podglad/[token]`). */
export interface BanerDemo {
  tekst: string
  etykieta: string
  /** Ścieżka wewnętrzna — przejście przez router, żeby źródło wejścia przeżyło. */
  sciezka: string
}

function DemoBanner({ ui, baner }: { ui: Teksty; baner?: BanerDemo }) {
  const [visible, setVisible] = useState(true)
  const router = useRouter()
  if (!visible) return null

  if (baner) {
    return (
      <div className="a-demo" data-demo-banner>
        <div className="a-wrap">
          <span>{baner.tekst}</span>
          <a href={baner.sciezka} onClick={e => { e.preventDefault(); router.push(baner.sciezka) }}>{baner.etykieta}</a>
          <button type="button" onClick={() => setVisible(false)} aria-label={ui.close}><X weight="bold" aria-hidden /></button>
        </div>
      </div>
    )
  }

  // Demo pod ścieżką `/demo` stoi w tej samej aplikacji co strona sprzedażowa
  // (nobooking.eu, localhost, podgląd Vercela) — przejście bez przeładowania,
  // bo źródło wejścia żyje tylko w pamięci karty (`lib/zrodloWPamieci.ts`).
  // Na subdomenie demo.nobooking.eu ścieżka to `/`, więc zostaje zwykły link.
  const doCennika = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (window.location.pathname.startsWith('/demo')) {
      e.preventDefault()
      router.push('/#cennik')
    }
  }
  return (
    <div className="a-demo" data-demo-banner>
      <div className="a-wrap">
        <span>{ui.demoBanner}</span>
        <a href="https://nobooking.eu/#cennik" onClick={doCennika}>{ui.demoOrder}</a>
        <button type="button" onClick={() => setVisible(false)} aria-label={ui.close}><X weight="bold" aria-hidden /></button>
      </div>
    </div>
  )
}

// ─── Nagłówek ────────────────────────────────────────────────────────────────

function Naglowek({ config, lang, setLang, ui, linki }: {
  config: ApartmentConfig; lang: Lang; setLang: (l: Lang) => void; ui: Teksty
  linki: { href: string; tekst: string }[]
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const langs: Lang[] = ['pl', 'en', 'es', 'de']
  const przelacznik = (
    <div className="n-seg n-seg--sm" role="group" aria-label="Język / Language">
      {langs.map(l => (
        <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}>{l.toUpperCase()}</button>
      ))}
    </div>
  )

  return (
    <header className="a-head">
      <div className="a-wrap">
        <a href="#" className="a-brand" onClick={e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }}>
          <i><HouseLine weight="fill" aria-hidden /></i>
          <span>{config.name}</span>
        </a>
        <nav className="a-nav">
          {linki.map(l => <a key={l.href} href={l.href}>{l.tekst}</a>)}
        </nav>
        <div className="a-head__right">
          <div className="a-head__langs">{przelacznik}</div>
          <a href="#kontakt" className="n-btn n-btn--sm a-btn--primary a-head__book">{ui.navBook}</a>
          <button type="button" className="a-menu-btn" onClick={() => setMenuOpen(o => !o)} aria-expanded={menuOpen} aria-label={ui.menu}>
            {menuOpen ? <X weight="bold" aria-hidden /> : <List weight="bold" aria-hidden />}
          </button>
        </div>
      </div>
      {menuOpen && (
        <div className="a-menu">
          <div className="a-menu__langs">{przelacznik}</div>
          <div className="n-list">
            {[...linki, { href: '#kontakt', tekst: ui.navBook }].map(l => (
              <a key={l.href} href={l.href} className="n-row" onClick={() => setMenuOpen(false)}>
                <span style={{ flex: 1 }}>{l.tekst}</span>
                <CaretRight weight="bold" color="#C7C7CC" aria-hidden />
              </a>
            ))}
          </div>
        </div>
      )}
    </header>
  )
}

// ─── Zdjęcie główne ──────────────────────────────────────────────────────────

function Hero({ config, lang, ui }: { config: ApartmentConfig; lang: Lang; ui: Teksty }) {
  const [current, setCurrent] = useState(0)
  const photos = config.photos ?? []
  const ile = photos.length

  useEffect(() => {
    if (ile < 2) return
    // Bez samoczynnej zmiany zdjęć dla osób, które wyłączyły animacje.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const timer = setInterval(() => setCurrent(c => (c + 1) % ile), 6000)
    return () => clearInterval(timer)
  }, [ile])

  const prev = () => setCurrent(c => (c - 1 + ile) % ile)
  const next = () => setCurrent(c => (c + 1) % ile)

  return (
    <section className="a-hero">
      <div className="a-wrap">
        <div className="a-hero__frame">
          {photos.map((p, i) => (
            <div key={i} className={`a-hero__slide${i === current ? ' is-on' : ''}`} style={{ backgroundImage: `url(${p.url})` }} role="img" aria-label={p.alt} aria-hidden={i !== current} />
          ))}
          <div className="a-hero__shade" />
          {ile > 1 && <div className="a-hero__count">{current + 1} / {ile}</div>}
          <div className="a-hero__body">
            <div>
              <div className="a-hero__pill"><MapPin weight="fill" aria-hidden />{config.location}</div>
              <h1>{config.name}</h1>
              <p>{t(config.tagline, lang)}</p>
              <div className="a-hero__ctas">
                <a href="#kalendarz" className="n-btn a-btn--primary">{ui.heroCTA}</a>
                {ile > 0 && <a href="#galeria" className="n-btn a-btn--glass"><Images weight="fill" aria-hidden />{ui.heroGallery}</a>}
              </div>
            </div>
            {ile > 1 && (
              <div className="a-hero__arrows">
                <button type="button" className="a-round" onClick={prev} aria-label={ui.photoPrev}><CaretLeft weight="bold" aria-hidden /></button>
                <button type="button" className="a-round" onClick={next} aria-label={ui.photoNext}><CaretRight weight="bold" aria-hidden /></button>
              </div>
            )}
          </div>
        </div>

        <div className="a-facts">
          {[
            { ikona: Bed, wartosc: config.specs.bedrooms, opis: ui.specsRooms },
            { ikona: Users, wartosc: config.specs.guests, opis: ui.specsGuests },
            { ikona: Bathtub, wartosc: config.specs.bathrooms, opis: ui.specsBath },
            { ikona: Ruler, wartosc: `${config.specs.sqm} m²`, opis: ui.specsArea },
          ].map(f => (
            <div key={f.opis} className="a-fact">
              <span className="a-emoji"><f.ikona weight="fill" aria-hidden /></span>
              <div><b>{f.wartosc}</b><span>{f.opis}</span></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Opis, udogodnienia, cena ────────────────────────────────────────────────

function OApartamencie({ config, lang, ui, stripeEnabled }: { config: ApartmentConfig; lang: Lang; ui: Teksty; stripeEnabled: boolean }) {
  const tiers = Object.values(config.pricing.tiers)
  const najnizsza = Math.min(...tiers.map(x => x.pricePerNight))
  const minNocy = Math.min(...tiers.map(x => x.minNights))

  return (
    <section id="udogodnienia" className="a-section">
      <div className="a-wrap a-about">
        <div>
          <h2 className="a-h2">{ui.aboutTitle}</h2>
          <p className="a-desc">{t(config.description, lang)}</p>
          {config.amenities.length > 0 && (
            <>
              <p className="n-group-label">{ui.amenitiesTitle}</p>
              <div className="a-amen">
                {config.amenities.map((a, i) => (
                  <div key={i}><span className="a-emoji" aria-hidden>{a.icon}</span>{t(a.label, lang)}</div>
                ))}
              </div>
            </>
          )}
        </div>

        <aside className="a-card a-price">
          <small>{ui.priceFrom}</small>
          <div className="a-price__value">{najnizsza} {config.pricing.currency} <span>{ui.priceUnit}</span></div>
          <small>{wstaw(ui.minNights, minNocy)}</small>
          <a href="#kontakt" className="n-btn n-btn--block a-btn--primary">{ui.navBook}</a>
          <a href="#kalendarz" className="n-btn n-btn--block n-btn--ghost" style={{ marginTop: 8 }}><CalendarCheck weight="fill" aria-hidden />{ui.heroCTA}</a>
          {stripeEnabled && <p className="a-note"><Lock weight="fill" aria-hidden />{ui.stripeNote}</p>}
        </aside>
      </div>
    </section>
  )
}

// ─── Galeria ─────────────────────────────────────────────────────────────────

function Galeria({ config, ui }: { config: ApartmentConfig; ui: Teksty }) {
  const [lightbox, setLightbox] = useState<number | null>(null)
  const photos = config.photos ?? []

  useEffect(() => {
    if (lightbox === null) return
    const klawisz = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setLightbox(null)
      if (e.key === 'ArrowLeft') setLightbox(l => (l === null ? l : (l - 1 + photos.length) % photos.length))
      if (e.key === 'ArrowRight') setLightbox(l => (l === null ? l : (l + 1) % photos.length))
    }
    window.addEventListener('keydown', klawisz)
    return () => window.removeEventListener('keydown', klawisz)
  }, [lightbox, photos.length])

  if (photos.length === 0) return null

  return (
    <section id="galeria" className="a-section">
      <div className="a-wrap">
        <h2 className="a-h2" style={{ marginBottom: 24 }}>{ui.galleryTitle}</h2>
        <div className="a-gallery">
          {photos.slice(0, 5).map((photo, i) => (
            <button key={i} type="button" onClick={() => setLightbox(i)} aria-label={photo.alt || `${i + 1} / ${photos.length}`}>
              <img src={photo.url} alt={photo.alt} loading={i < 3 ? 'eager' : 'lazy'} />
            </button>
          ))}
        </div>
        {photos.length > 5 && (
          <div className="a-gallery__more">
            <button type="button" className="n-btn n-btn--light" onClick={() => setLightbox(0)}>
              <Images weight="fill" aria-hidden />{wstaw(ui.galleryShowAll, photos.length)}
            </button>
          </div>
        )}
      </div>

      {lightbox !== null && (
        <div className="a-lightbox" onClick={() => setLightbox(null)} role="dialog" aria-modal="true">
          <button type="button" className="a-round a-lightbox__prev" aria-label={ui.photoPrev}
            onClick={e => { e.stopPropagation(); setLightbox(l => (l! - 1 + photos.length) % photos.length) }}><CaretLeft weight="bold" aria-hidden /></button>
          <img src={photos[lightbox].url} alt={photos[lightbox].alt} onClick={e => e.stopPropagation()} />
          <button type="button" className="a-round a-lightbox__next" aria-label={ui.photoNext}
            onClick={e => { e.stopPropagation(); setLightbox(l => (l! + 1) % photos.length) }}><CaretRight weight="bold" aria-hidden /></button>
          <button type="button" className="a-round a-lightbox__close" aria-label={ui.close} onClick={() => setLightbox(null)}><X weight="bold" aria-hidden /></button>
          <div className="a-lightbox__count">{lightbox + 1} / {photos.length}</div>
        </div>
      )}
    </section>
  )
}

// ─── Wideo ───────────────────────────────────────────────────────────────────

function Wideo({ config, lang, ui }: { config: ApartmentConfig; lang: Lang; ui: Teksty }) {
  const [activeVideo, setActiveVideo] = useState<string | null>(null)
  const videos = config.videos
  if (!videos || videos.length === 0) return null

  return (
    <section className="a-section">
      <div className="a-wrap">
        <h2 className="a-h2" style={{ marginBottom: 24 }}>{ui.videoTitle}</h2>
        <div className="a-videos">
          {videos.map((video, i) => (
            <button key={i} type="button" className="a-video" onClick={() => setActiveVideo(video.embedUrl)}>
              {video.thumbnail && <img src={video.thumbnail} alt="" />}
              <span className="a-round" aria-hidden><PlayCircle weight="fill" /></span>
              <span>{t(video.title, lang)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Odtwarzacz tylko dla adresów, które umiemy bezpiecznie osadzić. */}
      {activeVideo && adresOdtwarzacza(activeVideo) && (
        <div className="a-lightbox" onClick={() => setActiveVideo(null)} role="dialog" aria-modal="true">
          <button type="button" className="a-round a-lightbox__close" aria-label={ui.close} onClick={() => setActiveVideo(null)}><X weight="bold" aria-hidden /></button>
          <iframe className="a-player" src={adresOdtwarzacza(activeVideo)} onClick={e => e.stopPropagation()} allow="autoplay; fullscreen" allowFullScreen title={ui.videoTitle} />
        </div>
      )}
    </section>
  )
}

// ─── Kalendarz i wycena ──────────────────────────────────────────────────────

function KalendarzICeny({ config, lang, ui, slug, stripeEnabled }: {
  config: ApartmentConfig; lang: Lang; ui: Teksty; slug: string; stripeEnabled: boolean
}) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [nights, setNights] = useState(7)
  const [season, setSeason] = useState<'low' | 'mid' | 'high'>('high')
  const [liveBookedDates, setLiveBookedDates] = useState<string[]>(config.bookedDates ?? [])

  // Dostępność na żywo — łączona ze statycznym `config.bookedDates`.
  useEffect(() => {
    if (!slug) return
    fetch(`/api/sites/${slug}/availability`)
      .then(r => r.json())
      .then((data: { bookedDates: string[] }) => {
        const merged = new Set([...(config.bookedDates ?? []), ...(data.bookedDates ?? [])])
        setLiveBookedDates(Array.from(merged))
      })
      .catch(() => { /* zostają daty z config */ })
  }, [slug, config.bookedDates])

  const bookedSet = new Set(liveBookedDates)
  const tier = config.pricing.tiers[season]
  // Liczba nocy nie schodzi poniżej minimum sezonu — wcześniej suwak pokazywał
  // minimum, a suma liczyła się z mniejszej liczby po zmianie sezonu.
  const noce = Math.max(nights, tier.minNights)
  const total = noce * tier.pricePerNight + config.pricing.cleaningFee
  const curr = config.pricing.currency

  const firstDay = new Date(year, month, 1).getDay()
  const startOffset = firstDay === 0 ? 6 : firstDay - 1
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const dzis = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const toBiezacyMiesiac = year === today.getFullYear() && month === today.getMonth()

  function prevMonth() { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  function nextMonth() { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }

  return (
    <section id="kalendarz" className="a-section">
      <div className="a-wrap">
        <h2 className="a-h2">{ui.calTitle}</h2>
        <p className="a-sub">{ui.calSub}</p>

        <div className="a-plan">
          <div className="a-card">
            <div className="a-cal__head">
              <b>{ui.months[month]} {year}</b>
              <div>
                <button type="button" className="a-icon-btn" onClick={prevMonth} disabled={toBiezacyMiesiac} aria-label={ui.calPrev}><CaretLeft weight="bold" aria-hidden /></button>
                <button type="button" className="a-icon-btn" onClick={nextMonth} aria-label={ui.calNext}><CaretRight weight="bold" aria-hidden /></button>
              </div>
            </div>
            <div className="a-cal">
              {ui.days.map(d => <span key={d}>{d}</span>)}
              {Array.from({ length: startOffset }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const data = new Date(year, month, day)
                const klucz = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                const zajety = bookedSet.has(klucz)
                const minal = data < dzis
                const klasa = minal ? ' a-day--past' : zajety ? ' a-day--booked' : ''
                const dzisiaj = data.getTime() === dzis.getTime()
                return <div key={day} className={`a-day${klasa}${dzisiaj ? ' a-day--today' : ''}`}>{day}</div>
              })}
            </div>
            <div className="a-legend">
              <span><i aria-hidden />{ui.calFree}</span>
              <span><i className="is-booked" aria-hidden />{ui.calBooked}</span>
            </div>
          </div>

          <div className="a-card">
            <p className="n-group-label" style={{ marginLeft: 0 }}>{ui.pricerSeason}</p>
            <div className="a-seasons" role="radiogroup" aria-label={ui.pricerSeason}>
              {(['low', 'mid', 'high'] as const).map(s => {
                const tier2 = config.pricing.tiers[s]
                const wybrany = season === s
                return (
                  <button key={s} type="button" role="radio" aria-checked={wybrany} className="a-season" onClick={() => setSeason(s)}>
                    <span className="a-season__check">{wybrany && <Check weight="bold" aria-hidden />}</span>
                    <span className="a-season__txt">
                      <b>{t(tier2.label, lang)}</b>
                      {/* Z reguły, nie z `tier2.months`: zapisany tekst kłamał
                          na każdej wygenerowanej stronie (październik opisany
                          jako niski sezon, liczony jako średni). */}
                      <span>{opisMiesiecy(s, lang)}</span>
                    </span>
                    <span className="a-season__price">{tier2.pricePerNight} {curr} <small>{ui.pricerPerNight}</small></span>
                  </button>
                )
              })}
            </div>

            <div className="a-stepper-row">
              <div>
                <b>{ui.pricerNights}</b>
                <span>{wstaw(ui.pricerNightsHint, tier.minNights)}</span>
              </div>
              <div className="a-stepper">
                <button type="button" onClick={() => setNights(Math.max(tier.minNights, noce - 1))} disabled={noce <= tier.minNights} aria-label="−"><Minus weight="bold" aria-hidden /></button>
                <output aria-live="polite">{noce}</output>
                <button type="button" onClick={() => setNights(Math.min(28, noce + 1))} disabled={noce >= 28} aria-label="+"><Plus weight="bold" aria-hidden /></button>
              </div>
            </div>

            <div className="a-sum">
              <div><span>{noce} × {tier.pricePerNight} {curr}</span><span>{noce * tier.pricePerNight} {curr}</span></div>
              <div><span>{ui.pricerCleaning}</span><span>{config.pricing.cleaningFee} {curr}</span></div>
              <div className="is-total"><span>{ui.pricerTotal}</span><span>{total} {curr}</span></div>
            </div>
            <a href="#kontakt" className="n-btn n-btn--block a-btn--primary" style={{ marginTop: 18 }}>{ui.pricerBook}</a>
            {stripeEnabled && <p className="a-note"><Lock weight="fill" aria-hidden />{ui.stripeNote}</p>}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Opinie ──────────────────────────────────────────────────────────────────

function Opinie({ config, lang, ui, informacje, demo }: {
  config: ApartmentConfig; lang: Lang; ui: Teksty; informacje: string
  /** Opinie w demo są przykładowe — zdanie o ich pochodzeniu byłoby tam nieprawdą. */
  demo: boolean
}) {
  const items = config.reviews.items
  if (items.length === 0) return null

  return (
    <section id="opinie" className="a-section">
      <div className="a-wrap">
        <div className="a-reviews__head">
          <div>
            <h2 className="a-h2">{ui.reviewsTitle}</h2>
            {/* Przepisy Omnibus: przy opiniach informacja, czy i jak sprawdzamy,
                że pochodzą od gości. Opinię wystawia tylko gość po wyjeździe,
                raz na rezerwację, a publikuje właściciel — mówimy to wprost,
                łącznie z moderacją. */}
            {!demo && (
              <p className="a-sub">
                {ETYKIETY[lang].opinie}
                {informacje && <> <a href={informacje} className="a-link">{ETYKIETY[lang].jakToDziala}</a></>}
              </p>
            )}
          </div>
          <div className="a-score">
            <b>{config.reviews.score}</b>
            <div>
              <Gwiazdki ocena={config.reviews.score} />
              <small>{wstaw(ui.reviewsOf, config.reviews.count)}</small>
            </div>
          </div>
        </div>

        <div className="a-reviews">
          {items.map((review, i) => (
            <article key={i} className="a-review">
              <Gwiazdki ocena={review.score} />
              <p>{t(review.text, lang)}</p>
              <footer>
                <div><b>{review.author}</b>{review.location}</div>
                <time>{review.date}</time>
              </footer>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Panel gościa ────────────────────────────────────────────────────────────

/**
 * Co gość dostaje po rezerwacji. Bez przycisku logowania: panel otwiera się
 * z linku w mailu potwierdzającym (`lib/email.ts`), innego wejścia nie ma.
 * Check-in online jest tylko w pakiecie Pro (`guest/[bookingId]/page.tsx`).
 */
function PanelGoscia({ ui, checkinOnline }: { ui: Teksty; checkinOnline: boolean }) {
  const wiersze = [
    { ikona: CalendarCheck, kolor: 'emerald' as const, tytul: ui.portalDetails, opis: ui.portalDetailsDesc },
    { ikona: MapPin, kolor: 'blue' as const, tytul: ui.portalMap, opis: ui.portalMapDesc },
    { ikona: ChatCircleText, kolor: 'graphite' as const, tytul: ui.portalContact, opis: ui.portalContactDesc },
    ...(checkinOnline ? [{ ikona: IdentificationCard, kolor: 'ink' as const, tytul: ui.portalCheckin, opis: ui.portalCheckinDesc }] : []),
    { ikona: Star, kolor: 'yellow' as const, tytul: ui.portalReview, opis: ui.portalReviewDesc },
  ]
  return (
    <section className="a-section">
      <div className="a-wrap">
        <div className="a-card a-portal">
          <div>
            <h2 className="a-h2">{ui.portalTitle}</h2>
            <p className="a-sub" style={{ marginBottom: 0 }}>{ui.portalDesc}</p>
          </div>
          <div className="n-list">
            {wiersze.map(w => (
              <div key={w.tytul} className="n-row">
                <Kafelek ikona={w.ikona} kolor={w.kolor} rozmiar="sm" />
                <div className="n-row__txt"><b>{w.tytul}</b><span>{w.opis}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Mapa ────────────────────────────────────────────────────────────────────

/**
 * Mapa Google dopiero po kliknięciu.
 *
 * Osadzona mapa ładuje się z serwerów Google, które dostają wtedy adres IP
 * odwiedzającego i mogą zapisać ciasteczka. Art. 399 Prawa komunikacji
 * elektronicznej wymaga na to zgody, chyba że zapis jest niezbędny do usługi,
 * której odwiedzający wyraźnie zażądał — a kliknięcie „Pokaż mapę” jest
 * właśnie takim żądaniem. Do 2026-11-09 mapa ładowała się sama, gdy tylko gość
 * przewinął stronę w jej pobliże.
 *
 * Wybór nie jest zapamiętywany: zapamiętanie wymagałoby kolejnego zapisu
 * w przeglądarce. Link „Otwórz w Mapach Google” działa bez osadzania.
 */
function MapaNaZadanie({ embedUrl, adres, ui }: { embedUrl: string; adres: string; ui: Teksty }) {
  const [pokaz, setPokaz] = useState(false)

  if (pokaz) {
    return (
      <div className="a-map__box">
        <iframe src={embedUrl} title={ui.mapTitle} allowFullScreen referrerPolicy="no-referrer-when-downgrade" />
      </div>
    )
  }

  return (
    <div className="a-map__box">
      {/* Delikatna siatka zamiast zrzutu mapy — zrzut też trzeba by pobrać od Google. */}
      <div className="a-map__ask">
        <Kafelek ikona={MapPin} kolor="blue" rozmiar="lg" />
        {adres && <p style={{ fontSize: 17, fontWeight: 600 }}>{adres}</p>}
        <div className="a-map__btns">
          <button type="button" className="n-btn n-btn--sm a-btn--primary" onClick={() => setPokaz(true)}>{ui.mapShow}</button>
          {adres && (
            <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(adres)}`} target="_blank" rel="noopener noreferrer" className="n-btn n-btn--sm n-btn--light">
              {ui.mapOpen}<ArrowSquareOut weight="bold" aria-hidden />
            </a>
          )}
        </div>
        <p className="n-hint">{ui.mapNote}</p>
      </div>
    </div>
  )
}

function Mapa({ config, lang, ui }: { config: ApartmentConfig; lang: Lang; ui: Teksty }) {
  const wOkolicy = config.map.nearby ?? []
  return (
    <section id="lokalizacja" className="a-section">
      <div className="a-wrap">
        <h2 className="a-h2" style={{ marginBottom: 24 }}>{ui.mapTitle}</h2>
        <div className="a-map">
          <MapaNaZadanie embedUrl={config.map.embedUrl} adres={config.address} ui={ui} />
          {wOkolicy.length > 0 && (
            <div>
              <p className="n-group-label">{ui.nearbyTitle}</p>
              <div className="n-list">
                {wOkolicy.map((item, i) => (
                  <div key={i} className="n-row">
                    <span className="a-emoji" aria-hidden>{item.icon}</span>
                    <div className="n-row__txt"><b style={{ fontWeight: 500 }}>{t(item.name, lang)}</b></div>
                    <span className="a-dist">{item.distance}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

// ─── Formularz rezerwacji ────────────────────────────────────────────────────

function Rezerwacja({ config, lang, ui, slug, stripeEnabled, kodyRabatowe, informacje }: {
  config: ApartmentConfig; lang: Lang; ui: Teksty
  slug: string; stripeEnabled: boolean; kodyRabatowe: boolean; informacje: string
}) {
  const [form, setForm] = useState({ arrival: '', departure: '', guests: '2', name: '', email: '', phone: '', message: '', discount: '' })
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [discountValid, setDiscountValid] = useState<boolean | null>(null)
  const [discountPct, setDiscountPct] = useState(0)
  const [checkingDiscount, setCheckingDiscount] = useState(false)
  const dzis = new Date().toISOString().slice(0, 10)

  function set(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm(f => ({ ...f, [k]: e.target.value }))
      if (k === 'discount') { setDiscountValid(null); setDiscountPct(0) }
    }
  }

  // Szacunek ceny do pokazania przed płatnością.
  function calcPrice() {
    if (!form.arrival || !form.departure) return null
    const nights = Math.round((new Date(form.departure).getTime() - new Date(form.arrival).getTime()) / (1000 * 60 * 60 * 24))
    if (nights <= 0) return null
    // Reguła sezonów ma jedno miejsce (`bookingPricing.ts`). Wcześniej stała
    // tu jej kopia — ta sama co w API, ale osobna, więc rozjazd był kwestią
    // czasu, a rozjazd między ceną pokazaną a policzoną jest nie do obronienia.
    const pricePerNight = config.pricing.tiers[sezonDla(form.arrival)].pricePerNight
    const base = nights * pricePerNight + config.pricing.cleaningFee
    const discount = Math.round(base * discountPct / 100)
    return { nights, pricePerNight, total: base - discount, currency: config.pricing.currency, discount }
  }

  async function checkDiscount() {
    if (!form.discount.trim() || !slug) return
    setCheckingDiscount(true)
    try {
      const res = await fetch(`/api/sites/${slug}/discount`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: form.discount }),
      })
      const data = await res.json() as { valid: boolean; discount_pct: number }
      setDiscountValid(data.valid)
      setDiscountPct(data.valid ? data.discount_pct : 0)
    } catch {
      setDiscountValid(false)
    } finally {
      setCheckingDiscount(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!slug) return
    setSending(true)
    setError(null)

    try {
      const res = await fetch(`/api/sites/${slug}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          check_in: form.arrival,
          check_out: form.departure,
          guests_count: parseInt(form.guests),
          guest_name: form.name,
          guest_email: form.email,
          guest_phone: form.phone,
          notes: form.message || undefined,
          discount_code: discountValid && form.discount ? form.discount : undefined,
        }),
      })
      const data = await res.json() as { checkoutUrl?: string; error?: string; minNights?: number; maxNights?: number }

      if (!res.ok) {
        const msgs: Record<string, string> = {
          invalid_dates: ui.errInvalidDates,
          dates_unavailable: ui.errUnavailable,
          min_nights: wstaw(ui.errMinNights, data.minNights ?? '?'),
          stay_too_long: wstaw(ui.errTooLong, data.maxNights ?? '?'),
          invalid_guests_count: ui.errGuests,
          missing_guest_info: ui.errMissing,
          payment_error: ui.errPayment,
          stripe_not_connected: ui.errNoPayments,
        }
        setError(msgs[data.error ?? ''] ?? ui.errGeneric)
        return
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else {
        setSent(true)
      }
    } catch {
      setError(ui.errNetwork)
    } finally {
      setSending(false)
    }
  }

  const pricePreview = calcPrice()

  return (
    <section id="kontakt" className="a-section a-book">
      <div className="a-wrap a-book__grid">
        <div className="a-book__intro">
          <h2 className="a-h2">{ui.bookTitle}</h2>
          <p className="a-sub">{stripeEnabled ? ui.bookLead : ui.noStripeText}</p>
        </div>
        <div>

        {!stripeEnabled ? (
          <div className="a-card">
            <b style={{ fontSize: 17 }}>{ui.noStripeTitle}</b>
            <div className="a-contact-btns">
              {config.contact.email && (
                <a href={`mailto:${config.contact.email}`} className="n-btn n-btn--sm a-btn--primary">{config.contact.email}</a>
              )}
              {config.contact.phone && (
                <a href={`tel:${config.contact.phone}`} className="n-btn n-btn--sm n-btn--ghost">{config.contact.phone}</a>
              )}
            </div>
          </div>
        ) : sent ? (
          <div className="a-card" style={{ textAlign: 'center' }}>
            <Kafelek ikona={Check} kolor="emerald" rozmiar="lg" />
            <h3 style={{ fontSize: 22, margin: '14px 0 4px' }}>{ui.bookSuccess}</h3>
            <p className="n-hint">{ui.bookSuccessNote}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="n-form-block">
              <p className="n-group-label">{ui.bookStay}</p>
              <div className="n-form-card">
                <div className="n-form-grid">
                  <div className="n-field">
                    <label htmlFor="r-przyjazd">{ui.bookArrival}</label>
                    <input id="r-przyjazd" className="n-input" type="date" value={form.arrival} onChange={set('arrival')} required min={dzis} />
                  </div>
                  <div className="n-field">
                    <label htmlFor="r-wyjazd">{ui.bookDeparture}</label>
                    <input id="r-wyjazd" className="n-input" type="date" value={form.departure} onChange={set('departure')} required min={form.arrival || dzis} />
                  </div>
                </div>
                <div className="n-field">
                  <label htmlFor="r-goscie">{ui.bookGuests}</label>
                  <select id="r-goscie" className="n-input" value={form.guests} onChange={set('guests')}>
                    {Array.from({ length: config.specs.guests }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="n-form-block">
              <p className="n-group-label">{ui.bookYou}</p>
              <div className="n-form-card">
                <div className="n-field">
                  <label htmlFor="r-imie">{ui.bookName}</label>
                  <input id="r-imie" className="n-input" type="text" value={form.name} onChange={set('name')} required autoComplete="name" />
                </div>
                <div className="n-form-grid">
                  <div className="n-field">
                    <label htmlFor="r-email">{ui.bookEmail}</label>
                    <input id="r-email" className="n-input" type="email" value={form.email} onChange={set('email')} required autoComplete="email" />
                  </div>
                  <div className="n-field">
                    <label htmlFor="r-telefon">{ui.bookPhone}</label>
                    <input id="r-telefon" className="n-input" type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" />
                  </div>
                </div>
                <div className="n-field">
                  <label htmlFor="r-wiadomosc">{ui.bookMsg} <span className="n-hint" style={{ fontWeight: 400 }}>· {ui.bookOptional}</span></label>
                  <textarea id="r-wiadomosc" className="n-input" value={form.message} onChange={set('message')} rows={3} />
                </div>

                {/* Kod rabatowy — tylko Pro.
                    Pole stało wcześniej na każdej stronie, także w pakiecie Basic,
                    gdzie `/api/sites/[slug]/discount` z założenia odpowiada
                    `valid: false`. Gość wpisywał kod otrzymany od właściciela
                    i czytał „Nieprawidłowy kod rabatowy" — komunikat sugerujący,
                    że pomylił znaki, choć funkcji po prostu nie ma w tym pakiecie. */}
                {kodyRabatowe && (
                  <div className="n-field">
                    <label htmlFor="r-kod">{ui.bookDiscount} <span className="n-hint" style={{ fontWeight: 400 }}>· {ui.bookOptional}</span></label>
                    <div className="a-discount">
                      <input id="r-kod" className={`n-input${discountValid === true ? ' a-input-ok' : discountValid === false ? ' a-input-bad' : ''}`}
                        type="text" value={form.discount} onChange={set('discount')} autoComplete="off" />
                      <button type="button" className="n-btn n-btn--ghost" onClick={checkDiscount} disabled={checkingDiscount || !form.discount.trim()}>
                        {checkingDiscount ? '…' : ui.bookDiscountCheck}
                      </button>
                    </div>
                    {discountValid === true && <span className="a-ok">{wstaw(ui.bookDiscountOk, discountPct)}</span>}
                    {discountValid === false && <span className="a-bad">{ui.bookDiscountBad}</span>}
                  </div>
                )}
              </div>
            </div>

            {pricePreview && (
              <div className="a-estimate" aria-live="polite">
                <div><span>{pricePreview.nights} × {pricePreview.pricePerNight} {pricePreview.currency}</span><span>{pricePreview.nights * pricePreview.pricePerNight} {pricePreview.currency}</span></div>
                <div><span>{ui.pricerCleaning}</span><span>{config.pricing.cleaningFee} {pricePreview.currency}</span></div>
                {pricePreview.discount > 0 && <div><span>{ui.bookDiscountLine}</span><span>−{pricePreview.discount} {pricePreview.currency}</span></div>}
                <div className="is-total"><span>{ui.bookTotal}</span><span>{pricePreview.total} {pricePreview.currency}</span></div>
              </div>
            )}

            {error && (
              <div className="n-alert n-alert--error" role="alert" style={{ marginBottom: 16 }}>
                <WarningCircle weight="fill" aria-hidden />{error}
              </div>
            )}

            <button type="submit" disabled={sending} className="n-btn n-btn--block a-btn--primary">
              {sending ? <><span className="spinner" />{ui.bookRedirecting}</> : ui.bookSubmit}
            </button>
            <p className="a-note"><Lock weight="fill" aria-hidden />{ui.stripeNote}</p>
            {/* Art. 13 RODO: informacja w chwili zbierania danych. */}
            {informacje && (
              <p className="a-note" style={{ marginTop: 4 }}>
                <span>{ETYKIETY[lang].przedRezerwacja} <a href={informacje} target="_blank" rel="noopener" className="a-link">{ETYKIETY[lang].link}</a></span>
              </p>
            )}
          </form>
        )}
        </div>
      </div>
    </section>
  )
}

// ─── Stopka ──────────────────────────────────────────────────────────────────

function Stopka({ config, ui, informacje, lang }: { config: ApartmentConfig; ui: Teksty; informacje: string; lang: Lang }) {
  return (
    <footer className="a-foot">
      <div className="a-wrap">
        <div>
          <b>{config.name}</b>
          <p>{config.address}</p>
          <p>
            {config.contact.email && <a href={`mailto:${config.contact.email}`}>{config.contact.email}</a>}
            {config.contact.phone && <> · <a href={`tel:${config.contact.phone}`}>{config.contact.phone}</a></>}
          </p>
          {config.contact.instagram && <p>@{config.contact.instagram}</p>}
          {informacje && <p style={{ marginTop: 12 }}><a href={informacje} className="a-link">{ETYKIETY[lang].link}</a></p>}
        </div>
        <div className="a-foot__made">
          <p>{ui.footerPowered} <a href="https://nobooking.eu">Nobooking</a></p>
          <p>{ui.footerTagline}</p>
        </div>
      </div>
    </footer>
  )
}

// ─── Strona ──────────────────────────────────────────────────────────────────

export default function ApartmentPage({ config, slug = '', showDemoBanner = false, baner, stripeEnabled = true, kodyRabatowe = false, checkinOnline = false, jezykStartowy = 'pl' }: {
  config: ApartmentConfig
  /** Zostaje dla zgodności wywołań; strona nie potrzebuje już identyfikatora. */
  siteId?: string
  slug?: string
  showDemoBanner?: boolean
  /** Własna treść paska demo; bez niej pasek reklamuje Nobooking. */
  baner?: BanerDemo
  stripeEnabled?: boolean
  /** Czy pokazywać pole kodu rabatowego. Kody są wyłącznie w pakiecie Pro. */
  kodyRabatowe?: boolean
  /** Czy panel gościa ma check-in online (pakiet Pro). */
  checkinOnline?: boolean
  /**
   * Język z adresu (`?lang=`), ustalony po stronie serwera.
   *
   * Wcześniej strona zawsze zaczynała po polsku, bo `?lang=` czytały wyłącznie
   * metadane. Link udostępniony jako `?lang=es` pokazywał więc hiszpańską
   * zapowiedź, a otwierał polską stronę. Przekazanie języka z serwera usuwa
   * też mignięcie polskiego przed przełączeniem — strona przychodzi już
   * w docelowym języku.
   */
  jezykStartowy?: Lang
}) {
  const [lang, setLang] = useState<Lang>(jezykStartowy)
  // Informacja dla gości: `/sites/[slug]/informacje`, a w demo `/demo/informacje`.
  // Ścieżki z prefiksem działają też na subdomenach — patrz `sciezkaDlaSubdomeny`.
  // Podgląd demo klienta (`baner`) nie ma własnej strony informacji — ta z `/demo` opisuje inny obiekt.
  const baza = slug ? `/sites/${slug}` : showDemoBanner && !baner ? '/demo' : ''
  const informacje = baza ? `${baza}/informacje${lang === 'pl' ? '' : `?lang=${lang}`}` : ''

  /**
   * `<html lang>` musi iść za treścią strony.
   *
   * Korzeń aplikacji (`layout.tsx`) ustawia `lang="pl"` na sztywno, bo obsługuje
   * też stronę sprzedażową. Na stronie apartamentu, która wyświetla się
   * w czterech językach, zostawienie polskiego znaczy, że czytnik ekranu czyta
   * hiszpański tekst polską wymową, a wyszukiwarka dostaje sprzeczny sygnał
   * o języku strony.
   */
  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  /**
   * Przełączenie języka zapisuje wybór w adresie.
   *
   * Bez tego gość, który przełączył na hiszpański i skopiował adres z paska,
   * wysyłał znajomemu link otwierający się po polsku. `replaceState` zamiast
   * nawigacji: zmiana języka nie ma wracać przyciskiem wstecz ani przeładowywać
   * strony, na której gość właśnie wypełnia formularz.
   */
  const zmienJezyk = useCallback((l: Lang) => {
    setLang(l)
    if (typeof window === 'undefined') return
    try {
      const adres = new URL(window.location.href)
      adres.searchParams.set('lang', l)
      window.history.replaceState(null, '', adres.toString())
      document.documentElement.lang = l
    } catch {
      // Adres nie do odczytania albo historia zablokowana — język i tak
      // przełączony, a to jedyne, co jest tu istotne.
    }
  }, [])

  const ui = UI[lang]
  const primary = config.theme?.primary ?? '#1A5276'
  const marka = koloryMarki(primary)

  // Wysokość paska demo — nagłówek przykleja się tuż pod nim.
  const [bannerHeight, setBannerHeight] = useState(showDemoBanner ? 44 : 0)
  useEffect(() => {
    if (!showDemoBanner) { setBannerHeight(0); return }
    const el = document.querySelector('[data-demo-banner]') as HTMLElement | null
    if (!el) { setBannerHeight(0); return }
    const obs = new ResizeObserver(entries => setBannerHeight(entries[0]?.contentRect.height ?? 0))
    obs.observe(el)
    // Po zamknięciu paska element znika z DOM, a obserwator nie dostaje już zmian.
    const mo = new MutationObserver(() => { if (!document.body.contains(el)) setBannerHeight(0) })
    mo.observe(document.body, { childList: true, subtree: true })
    return () => { obs.disconnect(); mo.disconnect() }
  }, [showDemoBanner])

  // Linki w nagłówku tylko do sekcji, które na tej stronie istnieją.
  const linki = [
    ...((config.photos ?? []).length > 0 ? [{ href: '#galeria', tekst: ui.navGallery }] : []),
    { href: '#udogodnienia', tekst: ui.navAbout },
    { href: '#kalendarz', tekst: ui.navCalendar },
    ...(config.reviews.items.length > 0 ? [{ href: '#opinie', tekst: ui.navReviews }] : []),
    { href: '#lokalizacja', tekst: ui.navMap },
  ]

  const zmienne = {
    '--a-primary': primary,
    '--a-on-primary': marka.onPrimary,
    '--a-link': marka.link,
    '--a-demo-h': `${bannerHeight}px`,
  } as React.CSSProperties

  return (
    <div className="a-page" style={zmienne}>
      {showDemoBanner && <DemoBanner ui={ui} baner={baner} />}
      <Naglowek config={config} lang={lang} setLang={zmienJezyk} ui={ui} linki={linki} />
      <main>
        <Hero config={config} lang={lang} ui={ui} />
        <OApartamencie config={config} lang={lang} ui={ui} stripeEnabled={stripeEnabled} />
        <Galeria config={config} ui={ui} />
        <Wideo config={config} lang={lang} ui={ui} />
        <KalendarzICeny config={config} lang={lang} ui={ui} slug={slug} stripeEnabled={stripeEnabled} />
        <Opinie config={config} lang={lang} ui={ui} informacje={informacje} demo={showDemoBanner} />
        <PanelGoscia ui={ui} checkinOnline={checkinOnline} />
        <Mapa config={config} lang={lang} ui={ui} />
        <Rezerwacja config={config} lang={lang} ui={ui} slug={slug} stripeEnabled={stripeEnabled} kodyRabatowe={kodyRabatowe} informacje={informacje} />
      </main>
      <Stopka config={config} ui={ui} informacje={informacje} lang={lang} />
    </div>
  )
}
