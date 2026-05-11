'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import type { ApartmentConfig, Lang } from '@/lib/apartmentTypes'

// ─── UI translations ──────────────────────────────────────────────────────────

const UI = {
  pl: {
    navGallery: 'Galeria', navAmenities: 'Udogodnienia', navCalendar: 'Ceny', navReviews: 'Opinie', navContact: 'Kontakt', navBook: 'Zarezerwuj',
    heroCTA: 'Sprawdź dostępność', heroGallery: 'Zobacz galerię',
    aboutOverline: 'O apartamencie', aboutTitle: 'Opis', amenitiesTitle: 'Udogodnienia',
    specsRooms: 'Sypialnie', specsGuests: 'Gości', specsBath: 'Łazienki', specsArea: 'Powierzchnia',
    priceFrom: 'Pobyt od', priceFromUnit: '/noc', minNights: 'Min.',
    galleryOverline: 'zdjęć', galleryTitle: 'Galeria zdjęć', galleryShowAll: 'Pokaż wszystkie',
    videoOverline: 'Wideo', videoTitle: 'Zobacz apartament w akcji',
    calTitle: 'Dostępność i ceny', calFree: 'Wolne', calBooked: 'Zajęte',
    pricerTitle: 'Kalkulator ceny', pricerNights: 'noce', pricerSeason: 'Sezon',
    pricerPerNight: '/ noc', pricerMin: 'Min. nocy:', pricerTotal: 'Łącznie:', pricerCleaning: 'Sprzątanie:', pricerBook: 'Zarezerwuj →',
    reviewsOverline: 'Opinie', reviewsTitle: 'Opinie gości', reviewsOf: 'opinii',
    mapOverline: 'Lokalizacja', mapTitle: 'Lokalizacja i okolica',
    portalOverline: 'Panel gościa', portalTitle: 'Twoja rezerwacja — zawsze pod ręką',
    portalDesc: 'Loguj się do panelu gościa aby sprawdzić szczegóły pobytu, pobrać fakturę i skontaktować się z właścicielem.',
    portalBtn: 'Zaloguj się →',
    portalFeatures: ['📋 Szczegóły rezerwacji', '🧾 Faktura PDF', '✉️ Wiadomości z właścicielem', '🔑 Online check-in', '🏷️ Kody rabatowe', '📊 Historia pobytów'],
    bookOverline: 'Rezerwacja', bookTitle: 'Wyślij zapytanie',
    bookArrival: 'Data przyjazdu', bookDeparture: 'Data wyjazdu',
    bookGuests: 'Liczba gości', bookName: 'Imię i nazwisko',
    bookEmail: 'Email', bookPhone: 'Telefon',
    bookMsg: 'Wiadomość (opcjonalnie)', bookDiscount: 'Kod rabatowy (opcjonalnie)',
    bookSubmit: 'Wyślij zapytanie',
    bookSuccess: '✅ Dziękujemy! Odpiszemy w ciągu 24 godzin.',
    bookSuccessNote: 'Email z potwierdzeniem zostanie wysłany automatycznie.',
    footerPowered: 'Strona stworzona przez',
    demoBanner: '👁 To jest demo strony stworzonej przez Nobooking',
    demoOrder: 'Zamów własną →',
    months: ['Styczeń','Luty','Marzec','Kwiecień','Maj','Czerwiec','Lipiec','Sierpień','Wrzesień','Październik','Listopad','Grudzień'],
    days: ['Pn','Wt','Śr','Cz','Pt','Sb','Nd'],
    checkIn: 'Online check-in', checkInDesc: 'Formularz przedprzyjazdowy — wypełnij dane zanim dotrzesz na miejsce.',
    stripeNote: 'Bezpieczna płatność · Stripe · BLIK · Karta',
  },
  en: {
    navGallery: 'Gallery', navAmenities: 'Amenities', navCalendar: 'Prices', navReviews: 'Reviews', navContact: 'Contact', navBook: 'Book now',
    heroCTA: 'Check availability', heroGallery: 'View gallery',
    aboutOverline: 'About', aboutTitle: 'Description', amenitiesTitle: 'Amenities',
    specsRooms: 'Bedrooms', specsGuests: 'Guests', specsBath: 'Bathrooms', specsArea: 'Area',
    priceFrom: 'Stays from', priceFromUnit: '/night', minNights: 'Min.',
    galleryOverline: 'photos', galleryTitle: 'Photo gallery', galleryShowAll: 'Show all',
    videoOverline: 'Video', videoTitle: 'See the apartment in action',
    calTitle: 'Availability & prices', calFree: 'Available', calBooked: 'Booked',
    pricerTitle: 'Price calculator', pricerNights: 'nights', pricerSeason: 'Season',
    pricerPerNight: '/ night', pricerMin: 'Min. nights:', pricerTotal: 'Total:', pricerCleaning: 'Cleaning:', pricerBook: 'Book online →',
    reviewsOverline: 'Reviews', reviewsTitle: 'Guest reviews', reviewsOf: 'reviews',
    mapOverline: 'Location', mapTitle: 'Location & surroundings',
    portalOverline: 'Guest portal', portalTitle: 'Your booking — always at hand',
    portalDesc: 'Log in to the guest portal to check your stay details, download invoice and contact the host.',
    portalBtn: 'Log in →',
    portalFeatures: ['📋 Booking details', '🧾 PDF Invoice', '✉️ Messages with host', '🔑 Online check-in', '🏷️ Discount codes', '📊 Stay history'],
    bookOverline: 'Book', bookTitle: 'Send inquiry',
    bookArrival: 'Arrival date', bookDeparture: 'Departure date',
    bookGuests: 'Number of guests', bookName: 'Full name',
    bookEmail: 'Email', bookPhone: 'Phone',
    bookMsg: 'Message (optional)', bookDiscount: 'Discount code (optional)',
    bookSubmit: 'Send inquiry',
    bookSuccess: '✅ Thank you! We\'ll reply within 24 hours.',
    bookSuccessNote: 'A confirmation email will be sent automatically.',
    footerPowered: 'Website created by',
    demoBanner: '👁 This is a demo site created by Nobooking',
    demoOrder: 'Order yours →',
    months: ['January','February','March','April','May','June','July','August','September','October','November','December'],
    days: ['Mo','Tu','We','Th','Fr','Sa','Su'],
    checkIn: 'Online check-in', checkInDesc: 'Pre-arrival form — fill in your details before you arrive.',
    stripeNote: 'Secure payment · Stripe · Card · Bank transfer',
  },
  es: {
    navGallery: 'Galería', navAmenities: 'Comodidades', navCalendar: 'Precios', navReviews: 'Opiniones', navContact: 'Contacto', navBook: 'Reservar',
    heroCTA: 'Ver disponibilidad', heroGallery: 'Ver galería',
    aboutOverline: 'Sobre nosotros', aboutTitle: 'Descripción', amenitiesTitle: 'Comodidades',
    specsRooms: 'Dormitorios', specsGuests: 'Huéspedes', specsBath: 'Baños', specsArea: 'Superficie',
    priceFrom: 'Estancias desde', priceFromUnit: '/noche', minNights: 'Mín.',
    galleryOverline: 'fotos', galleryTitle: 'Galería de fotos', galleryShowAll: 'Ver todas',
    videoOverline: 'Vídeos', videoTitle: 'El apartamento en acción',
    calTitle: 'Disponibilidad y precios', calFree: 'Disponible', calBooked: 'Reservado',
    pricerTitle: 'Calculadora de precio', pricerNights: 'noches', pricerSeason: 'Temporada',
    pricerPerNight: '/ noche', pricerMin: 'Mín. noches:', pricerTotal: 'Total:', pricerCleaning: 'Limpieza:', pricerBook: 'Reservar online →',
    reviewsOverline: 'Opiniones', reviewsTitle: 'Opiniones de huéspedes', reviewsOf: 'opiniones',
    mapOverline: 'Ubicación', mapTitle: 'Ubicación y alrededores',
    portalOverline: 'Portal huésped', portalTitle: 'Tu reserva — siempre disponible',
    portalDesc: 'Accede al portal del huésped para consultar los detalles de tu estancia, descargar factura y contactar al propietario.',
    portalBtn: 'Acceder →',
    portalFeatures: ['📋 Detalles de reserva', '🧾 Factura PDF', '✉️ Mensajes con propietario', '🔑 Check-in online', '🏷️ Códigos descuento', '📊 Historial de estancias'],
    bookOverline: 'Reserva', bookTitle: 'Enviar consulta',
    bookArrival: 'Fecha de llegada', bookDeparture: 'Fecha de salida',
    bookGuests: 'Número de huéspedes', bookName: 'Nombre completo',
    bookEmail: 'Email', bookPhone: 'Teléfono',
    bookMsg: 'Mensaje (opcional)', bookDiscount: 'Código descuento (opcional)',
    bookSubmit: 'Enviar consulta',
    bookSuccess: '✅ ¡Gracias! Responderemos en 24 horas.',
    bookSuccessNote: 'Se enviará un email de confirmación automáticamente.',
    footerPowered: 'Sitio creado por',
    demoBanner: '👁 Este es un sitio demo creado por Nobooking',
    demoOrder: 'Pide el tuyo →',
    months: ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'],
    days: ['Lu','Ma','Mi','Ju','Vi','Sá','Do'],
    checkIn: 'Check-in online', checkInDesc: 'Formulario previo a la llegada — rellena tus datos antes de llegar.',
    stripeNote: 'Pago seguro · Stripe · Tarjeta · Transferencia',
  },
  de: {
    navGallery: 'Galerie', navAmenities: 'Ausstattung', navCalendar: 'Preise', navReviews: 'Bewertungen', navContact: 'Kontakt', navBook: 'Buchen',
    heroCTA: 'Verfügbarkeit prüfen', heroGallery: 'Galerie ansehen',
    aboutOverline: 'Über uns', aboutTitle: 'Beschreibung', amenitiesTitle: 'Ausstattung',
    specsRooms: 'Schlafzimmer', specsGuests: 'Personen', specsBath: 'Bäder', specsArea: 'Fläche',
    priceFrom: 'Aufenthalte ab', priceFromUnit: '/Nacht', minNights: 'Min.',
    galleryOverline: 'Fotos', galleryTitle: 'Fotogalerie', galleryShowAll: 'Alle anzeigen',
    videoOverline: 'Videos', videoTitle: 'Das Apartment in Aktion',
    calTitle: 'Verfügbarkeit und Preise', calFree: 'Frei', calBooked: 'Belegt',
    pricerTitle: 'Preisrechner', pricerNights: 'Nächte', pricerSeason: 'Saison',
    pricerPerNight: '/ Nacht', pricerMin: 'Min. Nächte:', pricerTotal: 'Gesamt:', pricerCleaning: 'Endreinigung:', pricerBook: 'Online buchen →',
    reviewsOverline: 'Bewertungen', reviewsTitle: 'Gästebewertungen', reviewsOf: 'Bewertungen',
    mapOverline: 'Lage', mapTitle: 'Lage & Umgebung',
    portalOverline: 'Gästeportal', portalTitle: 'Ihre Buchung — immer griffbereit',
    portalDesc: 'Loggen Sie sich ins Gästeportal ein, um Ihre Aufenthaltsdetails zu prüfen, eine Rechnung herunterzuladen und dem Gastgeber zu schreiben.',
    portalBtn: 'Einloggen →',
    portalFeatures: ['📋 Buchungsdetails', '🧾 PDF-Rechnung', '✉️ Nachrichten an Gastgeber', '🔑 Online-Check-in', '🏷️ Rabattcodes', '📊 Aufenthaltsverlauf'],
    bookOverline: 'Buchung', bookTitle: 'Anfrage senden',
    bookArrival: 'Anreisedatum', bookDeparture: 'Abreisedatum',
    bookGuests: 'Anzahl Gäste', bookName: 'Vollständiger Name',
    bookEmail: 'E-Mail', bookPhone: 'Telefon',
    bookMsg: 'Nachricht (optional)', bookDiscount: 'Rabattcode (optional)',
    bookSubmit: 'Anfrage senden',
    bookSuccess: '✅ Danke! Wir melden uns innerhalb von 24 Stunden.',
    bookSuccessNote: 'Eine Bestätigungs-E-Mail wird automatisch versendet.',
    footerPowered: 'Website erstellt von',
    demoBanner: '👁 Dies ist eine Demo-Website von Nobooking',
    demoOrder: 'Bestellen Sie Ihre →',
    months: ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'],
    days: ['Mo','Di','Mi','Do','Fr','Sa','So'],
    checkIn: 'Online-Check-in', checkInDesc: 'Vorankündigungsformular — füllen Sie Ihre Daten vor der Ankunft aus.',
    stripeNote: 'Sichere Zahlung · Stripe · Karte · Überweisung',
  },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function t(obj: { pl: string; en: string; es: string; de: string }, lang: Lang) {
  return obj[lang]
}

function stars(score: number) {
  const full = Math.round(score)
  return '★'.repeat(full) + '☆'.repeat(5 - full)
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return isMobile
}

function Overline({ children, color }: { children: string; color: string }) {
  return (
    <p style={{ color, fontWeight: 700, fontSize: '0.75rem', letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: '0.6rem' }}>
      {children}
    </p>
  )
}

// ─── Demo banner ──────────────────────────────────────────────────────────────

function DemoBanner({ ui, showDemo, isMobile }: { ui: typeof UI.pl; showDemo: boolean; isMobile: boolean }) {
  const [visible, setVisible] = useState(true)
  if (!showDemo || !visible) return null
  return (
    <div style={{
      background: '#059669', color: 'white',
      padding: isMobile ? '0.5rem 1rem' : '0.6rem 1.5rem',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      gap: '0.5rem', fontSize: '0.82rem', fontWeight: 600,
      position: 'sticky', top: 0, zIndex: 100, flexWrap: 'wrap',
    }}>
      <span style={{ flex: 1 }}>{ui.demoBanner}</span>
      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexShrink: 0 }}>
        <a href="https://nobooking.eu/#cennik" style={{ color: 'white', fontWeight: 800, textDecoration: 'underline', whiteSpace: 'nowrap' }}>{ui.demoOrder}</a>
        <button onClick={() => setVisible(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontSize: '1.1rem', lineHeight: 1 }}>×</button>
      </div>
    </div>
  )
}

// ─── Header ───────────────────────────────────────────────────────────────────

function ApartmentHeader({ config, lang, setLang, ui, primary, isMobile, demoBannerHeight }: {
  config: ApartmentConfig; lang: Lang; setLang: (l: Lang) => void
  ui: typeof UI.pl; primary: string; isMobile: boolean; demoBannerHeight: number
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const langs: Lang[] = ['pl', 'en', 'es', 'de']
  const anchors = ['#galeria','#udogodnienia','#kalendarz','#opinie','#kontakt']
  const navKeys = ['navGallery','navAmenities','navCalendar','navReviews','navContact'] as const

  return (
    <header style={{ background: 'rgba(255,255,255,0.96)', backdropFilter: 'blur(8px)', borderBottom: '1px solid rgba(0,0,0,0.08)', position: 'sticky', top: demoBannerHeight, zIndex: 50 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: 64 }}>
        <div style={{ fontWeight: 900, fontSize: '1rem', letterSpacing: '-0.03em', color: primary, flexShrink: 0 }}>
          {config.name}
        </div>

        {!isMobile && (
          <nav style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            {navKeys.map((key, i) => (
              <a key={key} href={anchors[i]} style={{ fontSize: '0.82rem', color: '#374151', textDecoration: 'none', fontWeight: 500 }}
                onMouseEnter={e => (e.currentTarget.style.color = primary)}
                onMouseLeave={e => (e.currentTarget.style.color = '#374151')}
              >{ui[key]}</a>
            ))}
          </nav>
        )}

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '2px', background: '#f3f4f6', borderRadius: 8, padding: '2px' }}>
            {langs.map(l => (
              <button key={l} onClick={() => setLang(l)} style={{
                padding: isMobile ? '0.2rem 0.4rem' : '0.25rem 0.5rem',
                borderRadius: 6, border: 'none', cursor: 'pointer',
                fontFamily: 'inherit', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                background: lang === l ? primary : 'transparent',
                color: lang === l ? 'white' : '#6b7280',
              }}>{l}</button>
            ))}
          </div>

          {!isMobile && (
            <a href="#kontakt" style={{ background: primary, color: 'white', padding: '0.45rem 1.1rem', borderRadius: 8, fontWeight: 700, fontSize: '0.82rem', textDecoration: 'none' }}>
              {ui.navBook}
            </a>
          )}

          {isMobile && (
            <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: 'none', border: '1px solid #e5e7eb', cursor: 'pointer', padding: '0.4rem 0.5rem', borderRadius: 6 }}>
              <div style={{ width: 18, height: 2, background: '#374151', margin: '3px 0' }} />
              <div style={{ width: 18, height: 2, background: '#374151', margin: '3px 0' }} />
              <div style={{ width: 18, height: 2, background: '#374151', margin: '3px 0' }} />
            </button>
          )}
        </div>
      </div>

      {isMobile && menuOpen && (
        <div style={{ borderTop: '1px solid #e5e7eb', background: 'white', padding: '0.75rem 1.25rem', display: 'flex', flexDirection: 'column' }}>
          {navKeys.map((key, i) => (
            <a key={key} href={anchors[i]} onClick={() => setMenuOpen(false)}
              style={{ display: 'block', padding: '0.75rem 0', fontSize: '0.95rem', color: '#374151', textDecoration: 'none', fontWeight: 500, borderBottom: '1px solid #f3f4f6' }}>
              {ui[key]}
            </a>
          ))}
          <a href="#kontakt" onClick={() => setMenuOpen(false)}
            style={{ display: 'block', marginTop: '0.75rem', textAlign: 'center', background: primary, color: 'white', padding: '0.75rem', borderRadius: 8, fontWeight: 700, textDecoration: 'none' }}>
            {ui.navBook}
          </a>
        </div>
      )}
    </header>
  )
}

// ─── Hero slideshow ───────────────────────────────────────────────────────────

function Hero({ config, lang, ui, primary, onGallery, isMobile }: {
  config: ApartmentConfig; lang: Lang; ui: typeof UI.pl
  primary: string; onGallery: () => void; isMobile: boolean
}) {
  const [current, setCurrent] = useState(0)
  const photos = config.photos

  useEffect(() => {
    const timer = setInterval(() => setCurrent(c => (c + 1) % photos.length), 5000)
    return () => clearInterval(timer)
  }, [photos.length])

  const prev = () => setCurrent(c => (c - 1 + photos.length) % photos.length)
  const next = () => setCurrent(c => (c + 1) % photos.length)

  const specs = [
    { value: `${config.specs.bedrooms}`, label: ui.specsRooms },
    { value: `${config.specs.guests}`, label: ui.specsGuests },
    { value: `${config.specs.bathrooms}`, label: ui.specsBath },
    { value: `${config.specs.sqm} m²`, label: ui.specsArea },
  ]

  return (
    <section style={{ position: 'relative', height: isMobile ? '100vw' : '100vh', minHeight: isMobile ? 300 : 560, overflow: 'hidden', background: '#111' }}>
      {/* Slideshow */}
      {photos.map((p, i) => (
        <div key={i} style={{
          position: 'absolute', inset: 0,
          backgroundImage: `url(${p.url})`, backgroundSize: 'cover', backgroundPosition: 'center',
          opacity: i === current ? 1 : 0, transition: 'opacity 1.2s ease-in-out',
        }} />
      ))}

      {/* Gradient overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.55) 70%, rgba(0,0,0,0.75) 100%)' }} />

      {/* Content */}
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 1.5rem', color: 'white' }}>
        <div style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, padding: '0.35rem 1rem', marginBottom: '1.25rem', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          {config.location}
        </div>
        <h1 style={{ fontSize: isMobile ? '2rem' : 'clamp(2.5rem, 6vw, 4.5rem)', fontWeight: 900, letterSpacing: '-0.04em', margin: '0 0 0.5rem', lineHeight: 1.05, textShadow: '0 2px 20px rgba(0,0,0,0.3)' }}>
          {config.name}
        </h1>
        <p style={{ fontSize: isMobile ? '0.9rem' : '1.1rem', opacity: 0.9, marginBottom: isMobile ? '1.25rem' : '2rem', maxWidth: 520, textShadow: '0 1px 8px rgba(0,0,0,0.4)' }}>
          {t(config.tagline, lang)}
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="#kontakt" style={{ background: primary, color: 'white', padding: isMobile ? '0.65rem 1.4rem' : '0.9rem 2.2rem', borderRadius: 50, fontWeight: 800, fontSize: isMobile ? '0.875rem' : '1rem', textDecoration: 'none', boxShadow: `0 4px 20px ${primary}66` }}>
            {ui.heroCTA}
          </a>
          <button onClick={onGallery} style={{ border: '2px solid rgba(255,255,255,0.65)', color: 'white', background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(4px)', padding: isMobile ? '0.6rem 1.2rem' : '0.85rem 2rem', borderRadius: 50, fontWeight: 600, fontSize: isMobile ? '0.875rem' : '1rem', cursor: 'pointer', fontFamily: 'inherit' }}>
            {ui.heroGallery}
          </button>
        </div>

        {/* Stats bar */}
        {!isMobile && (
          <div style={{ display: 'flex', gap: '2rem', marginTop: '2.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            {specs.map(s => (
              <div key={s.label} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'white', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: '0.72rem', opacity: 0.75, marginTop: '0.2rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Arrow buttons */}
      {!isMobile && (<>
        <button onClick={prev} aria-label="Poprzednie" style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white', fontSize: '1.4rem', zIndex: 10 }}>‹</button>
        <button onClick={next} aria-label="Następne" style={{ position: 'absolute', right: '1.25rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white', fontSize: '1.4rem', zIndex: 10 }}>›</button>
      </>)}

      {/* Dots */}
      <div style={{ position: 'absolute', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '0.4rem', zIndex: 10 }}>
        {photos.map((_, i) => (
          <button key={i} onClick={() => setCurrent(i)} style={{ width: i === current ? 24 : 8, height: 8, borderRadius: 4, background: i === current ? 'white' : 'rgba(255,255,255,0.45)', border: 'none', cursor: 'pointer', padding: 0, transition: 'all 0.3s' }} />
        ))}
      </div>
    </section>
  )
}

// ─── About + Amenities ────────────────────────────────────────────────────────

function ApartmentInfo({ config, lang, ui, primary, isMobile }: {
  config: ApartmentConfig; lang: Lang; ui: typeof UI.pl; primary: string; isMobile: boolean
}) {
  const lowestPrice = Math.min(...Object.values(config.pricing.tiers).map(t => t.pricePerNight))
  const minNights = Math.min(...Object.values(config.pricing.tiers).map(t => t.minNights))

  const specs = [
    { icon: '🛏', label: `${config.specs.bedrooms} ${ui.specsRooms}` },
    { icon: '👥', label: `${config.specs.guests} ${ui.specsGuests}` },
    { icon: '🛁', label: `${config.specs.bathrooms} ${ui.specsBath}` },
    { icon: '📐', label: `${config.specs.sqm} m²` },
  ]

  return (
    <section id="udogodnienia" style={{ background: 'white', padding: isMobile ? '3rem 1.25rem' : '6rem 1.5rem' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '2rem' : '4rem', alignItems: 'start' }}>

          {/* Left: description + specs */}
          <div>
            <Overline color={primary}>{ui.aboutOverline}</Overline>
            <h2 style={{ fontSize: isMobile ? '1.6rem' : '2.2rem', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: '1.25rem', lineHeight: 1.1 }}>
              {config.name}
            </h2>
            <p style={{ color: '#4B5563', lineHeight: 1.8, fontSize: '0.95rem', marginBottom: '2rem' }}>
              {t(config.description, lang)}
            </p>

            {/* Specs grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
              {specs.map(s => (
                <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '1rem', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 12 }}>
                  <span style={{ fontSize: '1.5rem', flexShrink: 0 }}>{s.icon}</span>
                  <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#111827' }}>{s.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right: amenities + price teaser */}
          <div>
            {/* Price teaser */}
            <div style={{ background: `linear-gradient(135deg, ${primary}12, ${primary}06)`, border: `1.5px solid ${primary}30`, borderRadius: 16, padding: '1.5rem', marginBottom: '1.5rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: '0.25rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{ui.priceFrom}</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem', marginBottom: '0.25rem' }}>
                <span style={{ fontSize: '2.2rem', fontWeight: 900, color: primary, letterSpacing: '-0.03em' }}>{lowestPrice} {config.pricing.currency}</span>
                <span style={{ fontSize: '0.9rem', color: '#6B7280', fontWeight: 500 }}>{ui.priceFromUnit}</span>
              </div>
              <div style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>{ui.minNights} {minNights} nocy</div>
              <a href="#kontakt" style={{ display: 'block', textAlign: 'center', background: primary, color: 'white', padding: '0.75rem', borderRadius: 10, fontWeight: 700, textDecoration: 'none', fontSize: '0.875rem', marginTop: '1rem' }}>
                {ui.heroCTA}
              </a>
            </div>

            {/* Amenities */}
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.875rem', color: '#111827' }}>{ui.amenitiesTitle}</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {config.amenities.map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.625rem', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8 }}>
                  <span style={{ fontSize: '1rem', flexShrink: 0 }}>{a.icon}</span>
                  <span style={{ fontSize: '0.8rem', color: '#374151', fontWeight: 500, lineHeight: 1.3 }}>{t(a.label, lang)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Gallery ──────────────────────────────────────────────────────────────────

function Gallery({ config, ui, primary, isMobile }: {
  config: ApartmentConfig; ui: typeof UI.pl; primary: string; isMobile: boolean
}) {
  const [lightbox, setLightbox] = useState<number | null>(null)
  const photos = config.photos
  const gridPhotos = photos.slice(0, 6)

  return (
    <section id="galeria" style={{ padding: isMobile ? '3rem 1.25rem' : '6rem 1.5rem', background: '#F8F5EF' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: isMobile ? '1.5rem' : '2.5rem' }}>
          <Overline color={primary}>{`${photos.length} ${ui.galleryOverline}`}</Overline>
          <h2 style={{ fontSize: isMobile ? '1.6rem' : '2.2rem', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1 }}>{ui.galleryTitle}</h2>
        </div>

        {/* 3×2 grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
          gridTemplateRows: isMobile ? 'repeat(3, 160px)' : 'repeat(2, 280px)',
          gap: '0.625rem',
        }}>
          {gridPhotos.map((photo, i) => (
            <div key={i} onClick={() => setLightbox(i)} style={{
              position: 'relative', borderRadius: 12, overflow: 'hidden',
              cursor: 'pointer', background: '#ddd',
            }}
              onMouseEnter={e => { const img = e.currentTarget.querySelector('img') as HTMLImageElement; if (img) img.style.transform = 'scale(1.05)' }}
              onMouseLeave={e => { const img = e.currentTarget.querySelector('img') as HTMLImageElement; if (img) img.style.transform = 'scale(1)' }}
            >
              <img src={photo.url} alt={photo.alt} style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s ease', display: 'block' }} />
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', transition: 'background 0.3s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.25)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'rgba(0,0,0,0)' }}
              />
            </div>
          ))}
        </div>

        {photos.length > 6 && (
          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <button onClick={() => setLightbox(0)} style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'white', color: '#111827', border: '1.5px solid #D1D5DB', borderRadius: 50, padding: '0.65rem 1.5rem', fontFamily: 'inherit', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer' }}>
              📷 {ui.galleryShowAll} ({photos.length - 6} więcej)
            </button>
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div onClick={() => setLightbox(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.93)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <button onClick={e => { e.stopPropagation(); setLightbox(l => l! > 0 ? l! - 1 : photos.length - 1) }}
            style={{ position: 'fixed', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', fontSize: '2rem', cursor: 'pointer', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>‹</button>
          <img src={photos[lightbox].url} alt={photos[lightbox].alt} onClick={e => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: 8 }} />
          <button onClick={e => { e.stopPropagation(); setLightbox(l => l! < photos.length - 1 ? l! + 1 : 0) }}
            style={{ position: 'fixed', right: '0.75rem', top: '50%', transform: 'translateY(-50%)', background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', fontSize: '2rem', cursor: 'pointer', borderRadius: '50%', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>›</button>
          <button onClick={() => setLightbox(null)} style={{ position: 'fixed', top: '1rem', right: '1rem', background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}>×</button>
          <div style={{ position: 'fixed', bottom: '1rem', left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,0.6)', fontSize: '0.875rem' }}>{lightbox + 1} / {photos.length}</div>
        </div>
      )}
    </section>
  )
}

// ─── Video section ────────────────────────────────────────────────────────────

function VideoSection({ config, lang, ui, primary, isMobile }: {
  config: ApartmentConfig; lang: Lang; ui: typeof UI.pl; primary: string; isMobile: boolean
}) {
  const [activeVideo, setActiveVideo] = useState<string | null>(null)
  const videos = config.videos
  if (!videos || videos.length === 0) return null

  return (
    <section style={{ padding: isMobile ? '3rem 1.25rem' : '6rem 1.5rem', background: 'white' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: isMobile ? '1.5rem' : '2.5rem' }}>
          <Overline color={primary}>{ui.videoOverline}</Overline>
          <h2 style={{ fontSize: isMobile ? '1.6rem' : '2.2rem', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1 }}>{ui.videoTitle}</h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)', gap: '0.875rem' }}>
          {videos.map((video, i) => (
            <button key={i} onClick={() => setActiveVideo(video.embedUrl)}
              style={{ position: 'relative', aspectRatio: '16/9', borderRadius: 12, overflow: 'hidden', border: 'none', cursor: 'pointer', background: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
            >
              {video.thumbnail && (
                <img src={video.thumbnail} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.65 }} />
              )}
              <div style={{ position: 'relative', zIndex: 2, background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(4px)', border: '2px solid rgba(255,255,255,0.4)', borderRadius: '50%', width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: 'white', fontSize: '1.5rem', marginLeft: 4 }}>▶</span>
              </div>
              <span style={{ position: 'absolute', bottom: '0.875rem', left: '1rem', zIndex: 2, color: 'white', fontSize: '0.82rem', fontWeight: 600, opacity: 0.9 }}>
                {t(video.title, lang)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Modal */}
      {activeVideo && (
        <div onClick={() => setActiveVideo(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.92)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <button onClick={() => setActiveVideo(null)} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '50%', width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'white', fontSize: '1.5rem', zIndex: 10 }}>×</button>
          <iframe
            src={`${activeVideo}?autoplay=1`}
            onClick={(e) => e.stopPropagation()}
            allow="autoplay; fullscreen"
            allowFullScreen
            style={{ width: isMobile ? '95vw' : '80vw', aspectRatio: '16/9', maxHeight: '85vh', borderRadius: 12, border: 'none' }}
          />
        </div>
      )}
    </section>
  )
}

// ─── Calendar + price calculator ─────────────────────────────────────────────

function CalendarPricer({ config, lang, ui, primary, isMobile, slug }: {
  config: ApartmentConfig; lang: Lang; ui: typeof UI.pl; primary: string; isMobile: boolean
  siteId: string; slug: string
}) {
  const today = new Date()
  const [year, setYear] = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [nights, setNights] = useState(7)
  const [season, setSeason] = useState<'low' | 'mid' | 'high'>('high')

  const bookedSet = new Set(config.bookedDates)
  const tier = config.pricing.tiers[season]
  const total = nights * tier.pricePerNight + config.pricing.cleaningFee
  const curr = config.pricing.currency

  function isBooked(d: number) {
    const str = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    return bookedSet.has(str)
  }

  const firstDay = new Date(year, month, 1).getDay()
  const startOffset = firstDay === 0 ? 6 : firstDay - 1
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  function prevMonth() { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  function nextMonth() { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }

  return (
    <section id="kalendarz" style={{ padding: isMobile ? '3rem 1.25rem' : '6rem 1.5rem', background: '#F8F5EF' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <Overline color={primary}>{ui.calTitle}</Overline>
        <h2 style={{ fontSize: isMobile ? '1.6rem' : '2.2rem', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: isMobile ? '1.5rem' : '2.5rem', lineHeight: 1.1 }}>{ui.pricerTitle}</h2>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '1rem' : '2rem', alignItems: 'start' }}>
          {/* Calendar */}
          <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 16, padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <button onClick={prevMonth} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#374151', padding: '0.2rem 0.5rem' }}>‹</button>
              <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{ui.months[month]} {year}</span>
              <button onClick={nextMonth} style={{ background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: '#374151', padding: '0.2rem 0.5rem' }}>›</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
              {ui.days.map(d => <div key={d} style={{ textAlign: 'center', fontSize: '0.62rem', fontWeight: 700, color: '#9CA3AF', padding: '0.2rem 0' }}>{d}</div>)}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
              {Array.from({ length: startOffset }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1
                const booked = isBooked(day)
                const isPast = new Date(year, month, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate())
                return (
                  <div key={day} style={{ textAlign: 'center', padding: '0.4rem 0', fontSize: '0.8rem', fontWeight: 600, borderRadius: 6, background: booked ? '#FEE2E2' : isPast ? '#F9FAFB' : '#F0FDF4', color: booked ? '#DC2626' : isPast ? '#D1D5DB' : '#15803D', textDecoration: booked ? 'line-through' : 'none' }}>{day}</div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', justifyContent: 'center' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: '#6B7280' }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: '#F0FDF4', border: '1px solid #BBF7D0', display: 'inline-block' }} /> {ui.calFree}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.72rem', color: '#6B7280' }}>
                <span style={{ width: 10, height: 10, borderRadius: 3, background: '#FEE2E2', border: '1px solid #FECACA', display: 'inline-block' }} /> {ui.calBooked}
              </span>
            </div>
          </div>

          {/* Price calculator */}
          <div style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 16, padding: '1.5rem' }}>
            <h3 style={{ fontWeight: 800, fontSize: '1rem', marginBottom: '1.25rem' }}>{ui.pricerTitle}</h3>
            <div style={{ marginBottom: '1.125rem' }}>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{ui.pricerSeason}</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {(['low', 'mid', 'high'] as const).map(s => {
                  const tier2 = config.pricing.tiers[s]
                  return (
                    <label key={s} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: season === s ? '#EFF6FF' : '#F9FAFB', border: `1.5px solid ${season === s ? primary : '#E5E7EB'}`, borderRadius: 8, padding: '0.5rem 0.75rem', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <input type="radio" name="season" value={s} checked={season === s} onChange={() => setSeason(s)} style={{ accentColor: primary }} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{t(tier2.label, lang)}</span>
                        <span style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>{tier2.months}</span>
                      </div>
                      <span style={{ fontWeight: 800, color: primary, fontSize: '0.9rem' }}>{tier2.pricePerNight} {curr}<span style={{ fontSize: '0.7rem', fontWeight: 500, color: '#9CA3AF' }}>{ui.pricerPerNight}</span></span>
                    </label>
                  )
                })}
              </div>
            </div>
            <div style={{ marginBottom: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{ui.pricerNights}</label>
                <span style={{ fontWeight: 800, fontSize: '1rem', color: primary }}>{nights}</span>
              </div>
              <input type="range" min={tier.minNights} max={28} value={nights} onChange={e => setNights(+e.target.value)} style={{ width: '100%', accentColor: primary }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#9CA3AF', marginTop: '0.2rem' }}>
                <span>{ui.pricerMin} {tier.minNights}</span><span>28</span>
              </div>
            </div>
            <div style={{ background: '#F9FAFB', borderRadius: 10, padding: '0.875rem', marginBottom: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.85rem' }}>
                <span style={{ color: '#6B7280' }}>{nights} × {tier.pricePerNight} {curr}</span>
                <span>{nights * tier.pricePerNight} {curr}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.85rem' }}>
                <span style={{ color: '#6B7280' }}>{ui.pricerCleaning}</span>
                <span>{config.pricing.cleaningFee} {curr}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E5E7EB', paddingTop: '0.4rem', fontWeight: 800, fontSize: '1rem' }}>
                <span>{ui.pricerTotal}</span>
                <span style={{ color: primary }}>{total} {curr}</span>
              </div>
            </div>
            <a href="#kontakt" style={{ display: 'block', textAlign: 'center', background: primary, color: 'white', padding: '0.825rem', borderRadius: 10, fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none' }}>
              {ui.pricerBook}
            </a>
            <div style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.72rem', color: '#9CA3AF' }}>🔒 {ui.stripeNote}</div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Reviews ──────────────────────────────────────────────────────────────────

function Reviews({ config, lang, ui, primary, isMobile }: {
  config: ApartmentConfig; lang: Lang; ui: typeof UI.pl; primary: string; isMobile: boolean
}) {
  const items = config.reviews.items
  if (items.length === 0) return null

  return (
    <section id="opinie" style={{ padding: isMobile ? '3rem 1.25rem' : '6rem 1.5rem', background: 'white' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: isMobile ? '1.5rem' : '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <Overline color={primary}>{ui.reviewsOverline}</Overline>
            <h2 style={{ fontSize: isMobile ? '1.6rem' : '2.2rem', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1 }}>{ui.reviewsTitle}</h2>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 12, padding: '0.875rem 1.25rem' }}>
            <span style={{ fontSize: '2rem', fontWeight: 900, color: primary, letterSpacing: '-0.03em' }}>{config.reviews.score}</span>
            <div>
              <div style={{ color: '#F59E0B', fontSize: '1.1rem', letterSpacing: '0.05em' }}>{stars(config.reviews.score)}</div>
              <div style={{ fontSize: '0.72rem', color: '#6B7280', marginTop: '0.1rem' }}>{config.reviews.count} {ui.reviewsOf}</div>
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(270px, 1fr))', gap: '1rem' }}>
          {items.map((review, i) => (
            <div key={i} style={{ background: '#FAFAFA', border: '1px solid #F3F4F6', borderRadius: 16, padding: '1.25rem' }}>
              <div style={{ color: '#F59E0B', fontSize: '0.95rem', marginBottom: '0.625rem' }}>{stars(review.score)}</div>
              <p style={{ fontSize: '0.875rem', color: '#374151', lineHeight: 1.7, marginBottom: '1rem' }}>"{t(review.text, lang)}"</p>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#111827' }}>{review.author}</div>
                  <div style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>{review.location}</div>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>{review.date}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Guest portal (Pro features showcase) ────────────────────────────────────

function GuestPortal({ config, lang, ui, primary, isMobile }: {
  config: ApartmentConfig; lang: Lang; ui: typeof UI.pl; primary: string; isMobile: boolean
}) {
  void lang
  void config
  return (
    <section style={{ background: primary, padding: isMobile ? '3rem 1.25rem' : '5rem 1.5rem' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '2rem' : '4rem', alignItems: 'center' }}>
        {/* Left */}
        <div style={{ color: 'white' }}>
          <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.7, marginBottom: '0.75rem' }}>{ui.portalOverline}</div>
          <h2 style={{ fontSize: isMobile ? '1.6rem' : '2rem', fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.1, marginBottom: '1rem' }}>{ui.portalTitle}</h2>
          <p style={{ opacity: 0.85, lineHeight: 1.7, fontSize: '0.95rem', marginBottom: '1.5rem' }}>{ui.portalDesc}</p>
          <a href="#" onClick={e => { e.preventDefault(); alert('Panel gościa — aktywny po rezerwacji') }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', background: 'white', color: primary, padding: '0.8rem 2rem', borderRadius: 50, fontWeight: 800, textDecoration: 'none', fontSize: '0.9rem' }}>
            {ui.portalBtn}
          </a>
        </div>

        {/* Right: feature grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
          {ui.portalFeatures.map((f, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.12)', backdropFilter: 'blur(4px)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, padding: '0.875rem 1rem', color: 'white', fontSize: '0.82rem', fontWeight: 600 }}>
              {f}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Online check-in banner ───────────────────────────────────────────────────

function CheckInBanner({ ui, primary, isMobile }: { ui: typeof UI.pl; primary: string; isMobile: boolean }) {
  return (
    <div style={{ background: `${primary}0D`, border: `1px solid ${primary}25`, borderRadius: 12, padding: isMobile ? '1rem 1.25rem' : '1.25rem 1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
      <span style={{ fontSize: '1.5rem' }}>🔑</span>
      <div style={{ flex: 1, minWidth: 200 }}>
        <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#111827' }}>{ui.checkIn}</div>
        <div style={{ fontSize: '0.8rem', color: '#6B7280', marginTop: '0.1rem' }}>{ui.checkInDesc}</div>
      </div>
      <a href="#" onClick={e => { e.preventDefault(); alert('Online check-in — dostępny po potwierdzeniu rezerwacji') }}
        style={{ background: primary, color: 'white', padding: '0.5rem 1.1rem', borderRadius: 8, fontWeight: 700, fontSize: '0.82rem', textDecoration: 'none', whiteSpace: 'nowrap' }}>
        {ui.checkIn} →
      </a>
    </div>
  )
}

// ─── Map section ─────────────────────────────────────────────────────────────

function MapSection({ config, lang, ui, primary, isMobile }: {
  config: ApartmentConfig; lang: Lang; ui: typeof UI.pl; primary: string; isMobile: boolean
}) {
  return (
    <section style={{ padding: isMobile ? '3rem 1.25rem' : '6rem 1.5rem', background: '#F8F5EF' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <Overline color={primary}>{ui.mapOverline}</Overline>
        <h2 style={{ fontSize: isMobile ? '1.6rem' : '2.2rem', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: isMobile ? '1.5rem' : '2.5rem', lineHeight: 1.1 }}>{ui.mapTitle}</h2>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: isMobile ? '1rem' : '2rem', alignItems: 'start' }}>
          <div style={{ borderRadius: 16, overflow: 'hidden', border: '1px solid #E5E7EB' }}>
            <iframe src={config.map.embedUrl} width="100%" height={isMobile ? '240' : '400'} style={{ border: 'none', display: 'block' }} loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade" />
          </div>
          <div>
            <p style={{ fontSize: '0.82rem', color: '#6B7280', marginBottom: '1rem' }}>📍 {config.address}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {config.map.nearby.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'white', border: '1px solid #E5E7EB', borderRadius: 10, padding: '0.625rem 0.875rem' }}>
                  <span style={{ fontSize: '0.875rem' }}>{item.icon} {t(item.name, lang)}</span>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: primary, flexShrink: 0, marginLeft: '0.5rem' }}>{item.distance}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Booking form ─────────────────────────────────────────────────────────────

function BookingForm({ config, lang, ui, primary, isMobile, slug }: {
  config: ApartmentConfig; lang: Lang; ui: typeof UI.pl; primary: string; isMobile: boolean
  siteId: string; slug: string
}) {
  void lang
  const [form, setForm] = useState({ arrival: '', departure: '', guests: '2', name: '', email: '', phone: '', message: '', discount: '' })
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [discountValid, setDiscountValid] = useState<boolean | null>(null)

  function set(k: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm(f => ({ ...f, [k]: e.target.value }))
      if (k === 'discount') setDiscountValid(null)
    }
  }

  function checkDiscount() {
    if (form.discount.trim().toUpperCase() === 'DEMO10') {
      setDiscountValid(true)
    } else if (form.discount.trim()) {
      setDiscountValid(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSending(true)
    await new Promise(r => setTimeout(r, 900))
    setSent(true)
    setSending(false)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.75rem 1rem', border: '1.5px solid #D1D5DB',
    borderRadius: 10, fontSize: '0.9rem', fontFamily: 'inherit', outline: 'none',
    boxSizing: 'border-box', background: 'white', height: '48px',
    WebkitAppearance: 'none', appearance: 'none',
  }

  return (
    <section id="kontakt" style={{ padding: isMobile ? '3rem 1.25rem' : '6rem 1.5rem', background: 'white' }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        <Overline color={primary}>{ui.bookOverline}</Overline>
        <h2 style={{ fontSize: isMobile ? '1.6rem' : '2.2rem', fontWeight: 900, letterSpacing: '-0.04em', marginBottom: '0.5rem', lineHeight: 1.1 }}>{ui.bookTitle}</h2>
        <p style={{ color: '#6B7280', fontSize: '0.875rem', marginBottom: '2rem' }}>
          ✉️ {ui.bookSuccessNote}
        </p>

        {/* Online check-in banner */}
        <div style={{ marginBottom: '1.5rem' }}>
          <CheckInBanner ui={ui} primary={primary} isMobile={isMobile} />
        </div>

        {sent ? (
          <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 16, padding: '2.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>✅</div>
            <div style={{ fontWeight: 700, fontSize: '1.2rem', color: '#15803D', marginBottom: '0.5rem' }}>{ui.bookSuccess}</div>
            <div style={{ color: '#6B7280', fontSize: '0.875rem' }}>{ui.bookSuccessNote}</div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ background: '#FAFAFA', border: '1px solid #E5E7EB', borderRadius: 20, padding: isMobile ? '1.5rem' : '2.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0.875rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>{ui.bookArrival}</label>
                <input type="date" value={form.arrival} onChange={set('arrival')} style={inputStyle} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>{ui.bookDeparture}</label>
                <input type="date" value={form.departure} onChange={set('departure')} style={inputStyle} required />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>{ui.bookGuests}</label>
              <select value={form.guests} onChange={set('guests')} style={inputStyle}>
                {[1,2,3,4,5,6,7,8].map(n => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>{ui.bookName}</label>
              <input type="text" value={form.name} onChange={set('name')} style={inputStyle} required />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0.875rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>{ui.bookEmail}</label>
                <input type="email" value={form.email} onChange={set('email')} style={inputStyle} required />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>{ui.bookPhone}</label>
                <input type="tel" value={form.phone} onChange={set('phone')} style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>{ui.bookMsg}</label>
              <textarea value={form.message} onChange={set('message')} rows={3} style={{ ...inputStyle, height: 'auto', resize: 'vertical' }} />
            </div>

            {/* Discount code */}
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#374151', marginBottom: '0.35rem' }}>🏷️ {ui.bookDiscount}</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input type="text" value={form.discount} onChange={set('discount')} placeholder="np. WIOSNA10" style={{ ...inputStyle, flex: 1, textTransform: 'uppercase', borderColor: discountValid === true ? '#16A34A' : discountValid === false ? '#DC2626' : '#D1D5DB' }} />
                <button type="button" onClick={checkDiscount} style={{ background: '#F3F4F6', border: '1.5px solid #D1D5DB', borderRadius: 10, padding: '0 1rem', fontFamily: 'inherit', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', color: '#374151', whiteSpace: 'nowrap' }}>
                  Sprawdź
                </button>
              </div>
              {discountValid === true && <p style={{ fontSize: '0.78rem', color: '#16A34A', marginTop: '0.3rem' }}>✓ Kod rabatowy aktywny — 10% zniżki</p>}
              {discountValid === false && <p style={{ fontSize: '0.78rem', color: '#DC2626', marginTop: '0.3rem' }}>✗ Nieprawidłowy kod rabatowy</p>}
              {discountValid === null && form.discount === '' && <p style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: '0.3rem' }}>Demo: wpisz DEMO10 aby przetestować</p>}
            </div>

            <button type="submit" disabled={sending} style={{ background: primary, color: 'white', border: 'none', borderRadius: 12, padding: '0.95rem', fontSize: '1rem', fontWeight: 800, cursor: sending ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: sending ? 0.75 : 1, marginTop: '0.25rem' }}>
              {sending ? '⏳ Wysyłanie...' : ui.bookSubmit}
            </button>

            <div style={{ textAlign: 'center', fontSize: '0.72rem', color: '#9CA3AF' }}>🔒 {ui.stripeNote}</div>
          </form>
        )}
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function ApartmentFooter({ config, ui, primary }: { config: ApartmentConfig; ui: typeof UI.pl; primary: string }) {
  return (
    <footer style={{ background: '#111827', color: 'rgba(255,255,255,0.65)', padding: '3rem 1.5rem', textAlign: 'center' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ fontWeight: 900, fontSize: '1.3rem', color: 'white', marginBottom: '0.5rem', letterSpacing: '-0.03em' }}>{config.name}</div>
        <p style={{ marginBottom: '0.4rem', fontSize: '0.85rem' }}>📍 {config.address}</p>
        <p style={{ marginBottom: '0.4rem', fontSize: '0.85rem' }}>
          <a href={`mailto:${config.contact.email}`} style={{ color: 'rgba(255,255,255,0.65)', textDecoration: 'none' }}>{config.contact.email}</a>
          {config.contact.phone && <> · <a href={`tel:${config.contact.phone}`} style={{ color: 'rgba(255,255,255,0.65)', textDecoration: 'none' }}>{config.contact.phone}</a></>}
        </p>
        {config.contact.instagram && (
          <p style={{ marginBottom: '1rem', fontSize: '0.82rem', color: 'rgba(255,255,255,0.45)' }}>@{config.contact.instagram}</p>
        )}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '1.25rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', flexWrap: 'wrap' }}>
          <span>{ui.footerPowered}</span>
          <a href="https://nobooking.eu" style={{ color: 'white', fontWeight: 700, textDecoration: 'none' }}>
            <span style={{ color: 'rgba(255,255,255,0.4)' }}>No</span>booking
          </a>
          <span style={{ color: 'rgba(255,255,255,0.3)' }}>·</span>
          <span style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.35)' }}>Własna strona rezerwacji bez prowizji</span>
        </div>
      </div>
    </footer>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function ApartmentPage({ config, siteId = '', slug = '', showDemoBanner = false }: {
  config: ApartmentConfig
  siteId?: string
  slug?: string
  showDemoBanner?: boolean
}) {
  const [lang, setLang] = useState<Lang>('pl')
  const isMobile = useIsMobile()
  const ui = UI[lang]
  const primary = config.theme?.primary ?? '#1A5276'

  // Calculate demo banner height for sticky header offset
  const [bannerHeight, setBannerHeight] = useState(showDemoBanner ? 44 : 0)
  const bannerRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!showDemoBanner) { setBannerHeight(0); return }
    const obs = new ResizeObserver(entries => setBannerHeight(entries[0].contentRect.height))
    const el = document.querySelector('[data-demo-banner]') as HTMLElement
    if (el) obs.observe(el)
    return () => obs.disconnect()
  }, [showDemoBanner])

  const scrollToGallery = useCallback(() => {
    document.getElementById('galeria')?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', color: '#111827', background: 'white' }}>
      {showDemoBanner && (
        <div data-demo-banner>
          <DemoBanner ui={ui} showDemo={showDemoBanner} isMobile={isMobile} />
        </div>
      )}
      <ApartmentHeader config={config} lang={lang} setLang={setLang} ui={ui} primary={primary} isMobile={isMobile} demoBannerHeight={bannerHeight} />
      <Hero config={config} lang={lang} ui={ui} primary={primary} onGallery={scrollToGallery} isMobile={isMobile} />
      <ApartmentInfo config={config} lang={lang} ui={ui} primary={primary} isMobile={isMobile} />
      <Gallery config={config} ui={ui} primary={primary} isMobile={isMobile} />
      <VideoSection config={config} lang={lang} ui={ui} primary={primary} isMobile={isMobile} />
      <CalendarPricer config={config} lang={lang} ui={ui} primary={primary} isMobile={isMobile} siteId={siteId} slug={slug} />
      <Reviews config={config} lang={lang} ui={ui} primary={primary} isMobile={isMobile} />
      <GuestPortal config={config} lang={lang} ui={ui} primary={primary} isMobile={isMobile} />
      <MapSection config={config} lang={lang} ui={ui} primary={primary} isMobile={isMobile} />
      <BookingForm config={config} lang={lang} ui={ui} primary={primary} isMobile={isMobile} siteId={siteId} slug={slug} />
      <ApartmentFooter config={config} ui={ui} primary={primary} />
    </div>
  )
}
