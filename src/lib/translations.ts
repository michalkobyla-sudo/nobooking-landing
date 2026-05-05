import { Lang } from '@/context/LangContext'

export const TR: Record<Lang, {
  // Header
  demo: string
  buyNow: string
  // Hero
  heroH1: string
  heroSub: string
  heroPrimary: string
  heroSecondary: string
  // Calculator
  calcTitle: string
  calcSubtitle: string
  calcRateLabel: string
  calcBookingsLabel: string
  calcNightsNote: string
  calcResultPrefix: string
  calcResultSuffix: string
  calcPain1Title: string
  calcPain1Desc: string
  calcPain2Title: string
  calcPain2Desc: string
  calcPain3Title: string
  calcPain3Desc: string
  // HowItWorks
  howTitle: string
  howStep1Title: string
  howStep1Desc: string
  howStep2Title: string
  howStep2Desc: string
  howStep3Title: string
  howStep3Desc: string
  // Features
  featuresTitle: string
  features: { icon: string; title: string; desc: string }[]
  // Comparison
  compTitle: string
  compFeature: string
  compBasic: string
  compPro: string
  compBooking: string
  compAirbnb: string
  compCommission: string
  compDomain: string
  compPayments: string
  compAdmin: string
  compPortal: string
  compEmail: string
  compMultilang: string
  compSms: string
  compCheckin: string
  compCodes: string
  compAnalytics: string
  compPrice: string
  compNote: string
  // Pricing
  pricingTitle: string
  pricingPeriod: string
  pricingIncludes: string
  pricingRenewal: string
  pricingRecommended: string
  pricingCtaBasic: string
  pricingCtaPro: string
  basicFeatures: string[]
  proFeatures: string[]
  // DemoCTA
  demoText: string
  demoCta: string
  // FAQ
  faqTitle: string
  faqs: { q: string; a: string }[]
  // Footer
  footerPrivacy: string
  footerCopyright: string
  // Success
  successTitle: string
  successText: string
  successCta: string
}> = {
  pl: {
    demo: 'Demo',
    buyNow: 'Kup teraz',
    heroH1: 'Twój apartament.\nTwoje pieniądze.\nZero prowizji.',
    heroSub: 'Własna strona rezerwacyjna gotowa w 7 dni. Płatności trafiają prosto do Ciebie — bez Booking.com, bez Airbnb.',
    heroPrimary: 'Kup teraz',
    heroSecondary: 'Zobacz jak działa →',
    calcTitle: 'Ile tracisz na prowizjach?',
    calcSubtitle: 'Wpisz swoje dane i sprawdź ile Booking.com pobiera od Ciebie rocznie.',
    calcRateLabel: 'Średnia cena za noc (PLN)',
    calcBookingsLabel: 'Liczba rezerwacji rocznie',
    calcNightsNote: 'Zakładamy średnio 7 nocy na rezerwację',
    calcResultPrefix: 'Booking.com pobiera od Ciebie rocznie:',
    calcResultSuffix: 'Nobooking kosztuje jednorazowo 799 zł. Zwrot z inwestycji już po pierwszej rezerwacji.',
    calcPain1Title: '15–20% prowizji',
    calcPain1Desc: 'Od każdej rezerwacji, co roku',
    calcPain2Title: 'Brak kontaktu z gościem',
    calcPain2Desc: 'Dane gości należą do platformy, nie do Ciebie',
    calcPain3Title: 'Zero kontroli',
    calcPain3Desc: 'Ceny, zasady, widoczność — decyduje platforma',
    howTitle: 'Jak to działa?',
    howStep1Title: 'Wybierz plan i zapłać',
    howStep1Desc: 'Płatność kartą, BLIK lub Przelewy24. Bezpiecznie przez Stripe.',
    howStep2Title: 'Wypełnij formularz',
    howStep2Desc: 'Zbieramy dane o apartamencie: zdjęcia, opisy, ceny, zasady. Ty nic nie musisz konfigurować.',
    howStep3Title: 'Gotowa strona w 7 dni',
    howStep3Desc: 'Własna domena, panel admina, strona gotowa do przyjmowania rezerwacji.',
    featuresTitle: 'Co dostajesz?',
    features: [
      { icon: '📅', title: 'Kalendarz dostępności', desc: 'Goście widzą wolne terminy w czasie rzeczywistym' },
      { icon: '💳', title: 'Płatności Stripe', desc: 'Karta, BLIK, Przelewy24 — pieniądze prosto do Ciebie' },
      { icon: '🖥️', title: 'Panel admina', desc: 'Rezerwacje, goście, cennik, opinie — wszystko w jednym miejscu' },
      { icon: '👤', title: 'Portal gościa', desc: 'Gość sprawdza rezerwację, pobiera fakturę, pisze do Ciebie' },
      { icon: '⭐', title: 'System opinii', desc: 'Email → formularz → moderacja → karuzela na stronie głównej' },
      { icon: '📧', title: 'Powiadomienia email', desc: 'Potwierdzenie, anulowanie, przypomnienie przed przyjazdem' },
      { icon: '🌍', title: '4 języki', desc: 'Polski, angielski, hiszpański, niemiecki — automatycznie' },
      { icon: '💰', title: 'Kalkulator ceny', desc: 'Sezony, minimalna liczba nocy, automatyczna wycena' },
      { icon: '🖼️', title: 'Galeria zdjęć i wideo', desc: 'Profesjonalna prezentacja apartamentu' },
      { icon: '🗺️', title: 'Mapa i okolica', desc: 'Google Maps i opis atrakcji w pobliżu' },
    ],
    compTitle: 'Nobooking vs platformy rezerwacyjne',
    compFeature: 'Funkcja',
    compBasic: 'Nobooking Basic',
    compPro: 'Nobooking Pro',
    compBooking: 'Booking.com',
    compAirbnb: 'Airbnb',
    compCommission: 'Prowizja',
    compDomain: 'Własna domena',
    compPayments: 'Płatności bezpośrednie',
    compAdmin: 'Panel admina',
    compPortal: 'Portal gościa',
    compEmail: 'Powiadomienia email',
    compMultilang: '4 języki',
    compSms: 'Powiadomienia SMS',
    compCheckin: 'Online check-in',
    compCodes: 'Kody rabatowe',
    compAnalytics: 'Analityka',
    compPrice: 'Cena',
    compNote: '*bezpłatne, ale pobierają prowizję od każdej rezerwacji',
    pricingTitle: 'Wybierz plan',
    pricingPeriod: 'na 2 lata',
    pricingIncludes: 'W cenie:',
    pricingRenewal: 'Po 2 latach — pakiet odnowieniowy od 299 zł',
    pricingRecommended: 'Polecany',
    pricingCtaBasic: 'Kup Basic',
    pricingCtaPro: 'Kup Pro',
    basicFeatures: [
      'Serwer + domena + mailing na 2 lata',
      'Kalendarz i rezerwacje online',
      'Płatności Stripe (karta, BLIK, P24)',
      'Panel admina',
      'Portal gościa',
      'System opinii',
      'Powiadomienia email',
      '4 języki (PL/EN/ES/DE)',
      'Galeria zdjęć i wideo',
      'Kalkulator ceny z sezonami',
    ],
    proFeatures: [
      'Wszystko z planu Basic',
      'Powiadomienia SMS',
      'Online check-in (formularz przed przyjazdem)',
      'Kody rabatowe',
      'Dashboard analityczny',
    ],
    demoText: 'Nie jesteś pewien? Przetestuj wszystko sam — bez rejestracji.',
    demoCta: 'Otwórz demo →',
    faqTitle: 'Często zadawane pytania',
    faqs: [
      {
        q: 'Czy potrzebuję konta Stripe?',
        a: 'Tak. Zakładasz konto za darmo na stripe.com — to tam trafiają pieniądze od Twoich gości. Konfiguracja trwa ok. 15 minut, pomagamy w tym procesie.',
      },
      {
        q: 'Czy mogę sam zmienić zdjęcia i opisy?',
        a: 'Na razie zmiany wykonujemy my na Twoje zlecenie (zazwyczaj w ciągu 24h). Panel CMS do samodzielnej edycji jest w przygotowaniu.',
      },
      {
        q: 'Co się dzieje po 2 latach?',
        a: 'Wysyłamy Ci fakturę za pakiet odnowieniowy od 299 zł — pokrywa on kolejne 2 lata hostingu i domeny. Bez niego strona nie znika — po prostu czekamy na odnowienie.',
      },
      {
        q: 'Czy strona działa na telefonie?',
        a: 'Tak, strona jest w pełni responsywna i zoptymalizowana pod urządzenia mobilne — zarówno dla Ciebie (panel admina) jak i Twoich gości.',
      },
      {
        q: 'Ile trwa wdrożenie?',
        a: '7 dni roboczych od momentu przesłania wypełnionego formularza onboardingowego ze wszystkimi materiałami (zdjęcia, opisy, ceny).',
      },
      {
        q: 'Jakie są opcje płatności dla moich gości?',
        a: 'Karta kredytowa/debetowa, BLIK, Przelewy24 — wszystko obsługuje Stripe. Pieniądze trafiają na Twoje konto Stripe zazwyczaj w ciągu 2 dni roboczych.',
      },
    ],
    footerPrivacy: 'Polityka prywatności',
    footerCopyright: '© 2026 Nobooking',
    successTitle: 'Dziękujemy za zakup!',
    successText: 'Sprawdź email — wyślemy Ci formularz onboardingowy w ciągu 24 godzin. Wypełnij go, a Twoja strona będzie gotowa w 7 dni.',
    successCta: 'Przetestuj demo →',
  },
  en: {
    demo: 'Demo',
    buyNow: 'Buy now',
    heroH1: 'Your apartment.\nYour money.\nZero commission.',
    heroSub: 'Your own booking site ready in 7 days. Payments go directly to you — no Booking.com, no Airbnb.',
    heroPrimary: 'Buy now',
    heroSecondary: 'See how it works →',
    calcTitle: 'How much are you losing to commissions?',
    calcSubtitle: 'Enter your numbers and see how much Booking.com takes from you annually.',
    calcRateLabel: 'Average nightly rate (PLN)',
    calcBookingsLabel: 'Bookings per year',
    calcNightsNote: 'Assuming average 7 nights per booking',
    calcResultPrefix: 'Booking.com takes from you annually:',
    calcResultSuffix: 'Nobooking costs a one-time 799 PLN. ROI after just one booking.',
    calcPain1Title: '15–20% commission',
    calcPain1Desc: 'From every booking, every year',
    calcPain2Title: 'No guest contact',
    calcPain2Desc: 'Guest data belongs to the platform, not you',
    calcPain3Title: 'Zero control',
    calcPain3Desc: 'Prices, rules, visibility — the platform decides',
    howTitle: 'How does it work?',
    howStep1Title: 'Choose plan and pay',
    howStep1Desc: 'Payment by card, BLIK or Przelewy24. Securely via Stripe.',
    howStep2Title: 'Fill in the form',
    howStep2Desc: 'We collect apartment details: photos, descriptions, prices, rules. You configure nothing.',
    howStep3Title: 'Live site in 7 days',
    howStep3Desc: 'Your own domain, admin panel, site ready to accept bookings.',
    featuresTitle: 'What do you get?',
    features: [
      { icon: '📅', title: 'Availability calendar', desc: 'Guests see free dates in real time' },
      { icon: '💳', title: 'Stripe payments', desc: 'Card, BLIK, Przelewy24 — money straight to you' },
      { icon: '🖥️', title: 'Admin panel', desc: 'Bookings, guests, pricing, reviews — all in one place' },
      { icon: '👤', title: 'Guest portal', desc: 'Guest checks booking, downloads invoice, messages you' },
      { icon: '⭐', title: 'Review system', desc: 'Email → form → moderation → carousel on homepage' },
      { icon: '📧', title: 'Email notifications', desc: 'Confirmation, cancellation, pre-arrival reminder' },
      { icon: '🌍', title: '4 languages', desc: 'Polish, English, Spanish, German — automatically' },
      { icon: '💰', title: 'Price calculator', desc: 'Seasons, minimum nights, automatic quoting' },
      { icon: '🖼️', title: 'Photo & video gallery', desc: 'Professional apartment presentation' },
      { icon: '🗺️', title: 'Map & neighbourhood', desc: 'Google Maps and local attractions guide' },
    ],
    compTitle: 'Nobooking vs booking platforms',
    compFeature: 'Feature',
    compBasic: 'Nobooking Basic',
    compPro: 'Nobooking Pro',
    compBooking: 'Booking.com',
    compAirbnb: 'Airbnb',
    compCommission: 'Commission',
    compDomain: 'Own domain',
    compPayments: 'Direct payments',
    compAdmin: 'Admin panel',
    compPortal: 'Guest portal',
    compEmail: 'Email notifications',
    compMultilang: '4 languages',
    compSms: 'SMS notifications',
    compCheckin: 'Online check-in',
    compCodes: 'Discount codes',
    compAnalytics: 'Analytics',
    compPrice: 'Price',
    compNote: '*free but takes commission from every booking',
    pricingTitle: 'Choose your plan',
    pricingPeriod: 'for 2 years',
    pricingIncludes: 'Included:',
    pricingRenewal: 'After 2 years — renewal package from 299 PLN',
    pricingRecommended: 'Recommended',
    pricingCtaBasic: 'Buy Basic',
    pricingCtaPro: 'Buy Pro',
    basicFeatures: [
      'Server + domain + mailing for 2 years',
      'Online calendar and reservations',
      'Stripe payments (card, BLIK, P24)',
      'Admin panel',
      'Guest portal',
      'Review system',
      'Email notifications',
      '4 languages (PL/EN/ES/DE)',
      'Photo and video gallery',
      'Price calculator with seasons',
    ],
    proFeatures: [
      'Everything in Basic',
      'SMS notifications',
      'Online check-in (form before arrival)',
      'Discount codes',
      'Analytics dashboard',
    ],
    demoText: 'Not sure? Try everything yourself — no registration needed.',
    demoCta: 'Open demo →',
    faqTitle: 'Frequently asked questions',
    faqs: [
      {
        q: 'Do I need a Stripe account?',
        a: "Yes. Create a free account at stripe.com — that's where your guests' payments land. Setup takes about 15 minutes and we help you through the process.",
      },
      {
        q: 'Can I change photos and descriptions myself?',
        a: 'For now, we make changes on your request (usually within 24h). A self-service CMS panel is in development.',
      },
      {
        q: 'What happens after 2 years?',
        a: "We send you an invoice for the renewal package from 299 PLN — it covers another 2 years of hosting and domain. Without it, the site doesn't disappear — we simply wait for renewal.",
      },
      {
        q: 'Does the site work on mobile?',
        a: 'Yes, the site is fully responsive and optimised for mobile — both for you (admin panel) and your guests.',
      },
      {
        q: 'How long does setup take?',
        a: '7 business days from when you submit the completed onboarding form with all materials (photos, descriptions, prices).',
      },
      {
        q: 'What payment options do my guests have?',
        a: 'Credit/debit card, BLIK, Przelewy24 — all handled by Stripe. Funds reach your Stripe account typically within 2 business days.',
      },
    ],
    footerPrivacy: 'Privacy policy',
    footerCopyright: '© 2026 Nobooking',
    successTitle: 'Thank you for your purchase!',
    successText: "Check your email — we'll send you the onboarding form within 24 hours. Fill it in and your site will be ready in 7 days.",
    successCta: 'Try the demo →',
  },
}
