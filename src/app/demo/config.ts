import type { ApartmentConfig } from '@/lib/apartmentTypes'

const config: ApartmentConfig = {
  slug: 'demo',
  name: 'Apartament Playa Azul',
  tagline: {
    pl: 'Słoneczny wypoczynek w sercu Costa Blanca',
    en: 'Sunny holidays on the Costa Blanca',
    es: 'Vacaciones soleadas en la Costa Blanca',
    de: 'Sonniger Urlaub an der Costa Blanca',
  },
  location: 'Torrevieja, Costa Blanca',
  address: 'Calle del Mar 15, 03181 Torrevieja, Alicante',
  specs: { bedrooms: 2, guests: 4, sqm: 65, bathrooms: 1 },

  description: {
    pl: 'Słoneczny apartament w centrum Torrevieja, zaledwie 300 m od plaży La Mata. Prywatny taras z widokiem na morze, basen wspólny oraz pełna klimatyzacja sprawiają, że to idealne miejsce na rodzinny wypoczynek lub romantyczny wyjazd. Apartament jest w pełni wyposażony – wszystko czego potrzebujesz na niezapomniany urlop.',
    en: 'Sunny apartment in the heart of Torrevieja, just 300m from La Mata beach. A private terrace with sea views, shared pool and full air conditioning make this the perfect place for a family holiday or romantic break. The apartment is fully equipped – everything you need for an unforgettable holiday.',
    es: 'Apartamento soleado en el centro de Torrevieja, a tan solo 300 m de la playa La Mata. Una terraza privada con vistas al mar, piscina comunitaria y aire acondicionado completo hacen de este lugar el sitio ideal para unas vacaciones en familia o una escapada romántica.',
    de: 'Sonniges Apartment im Herzen von Torrevieja, nur 300 m vom Strand La Mata entfernt. Eine private Terrasse mit Meerblick, Gemeinschaftspool und Klimaanlage machen dieses Apartment zum perfekten Ort für einen Familienurlaub oder romantischen Kurztrip.',
  },

  photos: [
    { url: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=1600&q=80', alt: 'Taras z widokiem na morze' },
    { url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=900&q=80', alt: 'Salon' },
    { url: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=900&q=80', alt: 'Sypialnia' },
    { url: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=900&q=80', alt: 'Kuchnia' },
    { url: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=900&q=80', alt: 'Basen' },
    { url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=900&q=80', alt: 'Plaża' },
    { url: 'https://images.unsplash.com/photo-1582268611958-ebfd161ef9cf?w=900&q=80', alt: 'Balkon' },
    { url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=900&q=80', alt: 'Widok na okolicę' },
  ],

  amenities: [
    { icon: '📶', label: { pl: 'WiFi', en: 'WiFi', es: 'WiFi', de: 'WLAN' } },
    { icon: '❄️', label: { pl: 'Klimatyzacja', en: 'Air conditioning', es: 'Aire acondicionado', de: 'Klimaanlage' } },
    { icon: '🏊', label: { pl: 'Basen', en: 'Swimming pool', es: 'Piscina', de: 'Pool' } },
    { icon: '🅿️', label: { pl: 'Parking', en: 'Parking', es: 'Aparcamiento', de: 'Parkplatz' } },
    { icon: '🌅', label: { pl: 'Taras', en: 'Terrace', es: 'Terraza', de: 'Terrasse' } },
    { icon: '🌊', label: { pl: 'Widok na morze', en: 'Sea view', es: 'Vistas al mar', de: 'Meerblick' } },
    { icon: '🍳', label: { pl: 'Aneks kuchenny', en: 'Kitchenette', es: 'Cocina equipada', de: 'Küchenzeile' } },
    { icon: '👕', label: { pl: 'Pralka', en: 'Washing machine', es: 'Lavadora', de: 'Waschmaschine' } },
    { icon: '📺', label: { pl: 'Smart TV', en: 'Smart TV', es: 'Smart TV', de: 'Smart TV' } },
    { icon: '🐾', label: { pl: 'Zwierzęta OK', en: 'Pets allowed', es: 'Mascotas OK', de: 'Haustiere erlaubt' } },
    { icon: '🏖️', label: { pl: 'Plaża 300 m', en: 'Beach 300m', es: 'Playa a 300m', de: 'Strand 300m' } },
    { icon: '🔑', label: { pl: 'Samodzielny check-in', en: 'Self check-in', es: 'Check-in autónomo', de: 'Selbst-Check-in' } },
  ],

  pricing: {
    currency: 'EUR',
    cleaningFee: 60,
    tiers: {
      low: {
        pricePerNight: 80,
        minNights: 3,
        label: { pl: 'Niski sezon', en: 'Low season', es: 'Temporada baja', de: 'Nebensaison' },
        months: 'paź–kwi / Oct–Apr',
      },
      mid: {
        pricePerNight: 110,
        minNights: 5,
        label: { pl: 'Średni sezon', en: 'Mid season', es: 'Temporada media', de: 'Zwischensaison' },
        months: 'maj–cze / May–Jun',
      },
      high: {
        pricePerNight: 150,
        minNights: 7,
        label: { pl: 'Wysoki sezon', en: 'High season', es: 'Temporada alta', de: 'Hochsaison' },
        months: 'lip–wrz / Jul–Sep',
      },
    },
  },

  bookedDates: [
    '2026-05-10', '2026-05-11', '2026-05-12', '2026-05-13', '2026-05-14',
    '2026-05-20', '2026-05-21', '2026-05-22', '2026-05-23', '2026-05-24', '2026-05-25', '2026-05-26',
    '2026-06-05', '2026-06-06', '2026-06-07', '2026-06-08', '2026-06-09', '2026-06-10', '2026-06-11', '2026-06-12',
    '2026-06-20', '2026-06-21', '2026-06-22', '2026-06-23', '2026-06-24', '2026-06-25',
    '2026-07-01', '2026-07-02', '2026-07-03', '2026-07-04', '2026-07-05', '2026-07-06', '2026-07-07',
    '2026-07-14', '2026-07-15', '2026-07-16', '2026-07-17', '2026-07-18', '2026-07-19', '2026-07-20', '2026-07-21',
  ],

  reviews: {
    score: 4.9,
    count: 47,
    items: [
      {
        text: {
          pl: 'Przepiękny apartament! Taras z widokiem na morze to coś niesamowitego. Wrócimy na pewno!',
          en: 'Beautiful apartment! The terrace with sea view is amazing. We will definitely be back!',
          es: '¡Apartamento precioso! La terraza con vistas al mar es increíble. ¡Volveremos sin duda!',
          de: 'Wunderschönes Apartment! Die Terrasse mit Meerblick ist einfach toll. Wir kommen bestimmt wieder!',
        },
        author: 'Anna K.',
        location: 'Warszawa',
        score: 5,
        date: '2025-08-15',
      },
      {
        text: {
          pl: 'Doskonała lokalizacja, czysto i schludnie. Komunikacja z właścicielem na najwyższym poziomie.',
          en: 'Excellent location, clean and tidy. Communication with the owner was top notch.',
          es: 'Excelente ubicación, limpio y ordenado. La comunicación con el propietario fue excelente.',
          de: 'Ausgezeichnete Lage, sauber und ordentlich. Die Kommunikation mit dem Eigentümer war erstklassig.',
        },
        author: 'Markus W.',
        location: 'München',
        score: 5,
        date: '2025-07-22',
      },
      {
        text: {
          pl: 'Świetny apartament dla rodziny z dziećmi. Basen i plaża w pobliżu – lepiej nie można!',
          en: 'Great apartment for families with children. Pool and beach nearby – you couldn\'t ask for more!',
          es: 'Estupendo apartamento para familias con niños. ¡Piscina y playa cerca, no se puede pedir más!',
          de: 'Tolles Apartment für Familien mit Kindern. Pool und Strand in der Nähe – besser geht\'s nicht!',
        },
        author: 'Joanna M.',
        location: 'Kraków',
        score: 5,
        date: '2025-08-03',
      },
      {
        text: {
          pl: 'Trzeci raz u tego gospodarza. Zawsze perfekcyjnie. Apartament dokładnie taki jak na zdjęciach.',
          en: 'Third time with this host. Always perfect. The apartment is exactly as in the photos.',
          es: 'Tercera vez con este anfitrión. Siempre perfecto. El apartamento es exactamente como en las fotos.',
          de: 'Das dritte Mal bei diesem Gastgeber. Immer perfekt. Die Wohnung ist genau wie auf den Fotos.',
        },
        author: 'Piotr R.',
        location: 'Gdańsk',
        score: 5,
        date: '2026-04-10',
      },
    ],
  },

  map: {
    embedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d25148.26!2d-0.7032!3d37.9785!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd63485c2a04b81f%3A0x34dab4db5abb18a7!2sTorrevieja%2C%20Alicante!5e0!3m2!1spl!2spl!4v1683000000000!5m2!1spl!2spl',
    nearby: [
      { icon: '🏖️', name: { pl: 'Plaża La Mata', en: 'La Mata beach', es: 'Playa La Mata', de: 'Strand La Mata' }, distance: '300 m' },
      { icon: '🛒', name: { pl: 'Supermarket Mercadona', en: 'Mercadona supermarket', es: 'Supermercado Mercadona', de: 'Supermarkt Mercadona' }, distance: '500 m' },
      { icon: '🍽️', name: { pl: 'Restauracje – promenada', en: 'Restaurants – promenade', es: 'Restaurantes – paseo marítimo', de: 'Restaurants – Promenade' }, distance: '200 m' },
      { icon: '🧂', name: { pl: 'Jezioro Solne (różowy odcień)', en: 'Salt lake (pink hue)', es: 'Lago salado (tonos rosas)', de: 'Salzsee (rosa Farbe)' }, distance: '2 km' },
      { icon: '✈️', name: { pl: 'Lotnisko Alicante', en: 'Alicante airport', es: 'Aeropuerto de Alicante', de: 'Flughafen Alicante' }, distance: '45 km' },
    ],
  },

  videos: [
    {
      embedUrl: 'https://www.youtube.com/embed/QvWMDFqnGrY',
      title: { pl: 'Spacer po apartamencie', en: 'Apartment tour', es: 'Recorrido por el apartamento', de: 'Wohnungsbesichtigung' },
      thumbnail: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
    },
    {
      embedUrl: 'https://www.youtube.com/embed/bKTSRFbTWKo',
      title: { pl: 'Widok z tarasu — zachód słońca', en: 'Terrace sunset view', es: 'Vista del atardecer desde la terraza', de: 'Terrassenblick bei Sonnenuntergang' },
      thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
    },
    {
      embedUrl: 'https://www.youtube.com/embed/hS6Tr4DP7Gc',
      title: { pl: 'Plaża La Mata — 300 m od apartamentu', en: 'La Mata beach — 300m away', es: 'Playa La Mata — a 300m', de: 'La Mata Strand — 300m entfernt' },
      thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80',
    },
    {
      embedUrl: 'https://www.youtube.com/embed/SjKQFvVwSLY',
      title: { pl: 'Torrevieja z lotu ptaka', en: 'Torrevieja from above', es: 'Torrevieja desde el aire', de: 'Torrevieja aus der Luft' },
      thumbnail: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80',
    },
  ],

  contact: {
    email: 'kontakt@playaazul.eu',
    phone: '+48 600 123 456',
    instagram: 'playaazul.torrevieja',
  },

  theme: {
    primary: '#1A5276',
    accent: '#E67E22',
  },
}

export default config
