import { Lang } from '@/context/LangContext'

export const TR: Record<Lang, {
  // Hero
  heroH1: string
  heroSub: string
  heroTrust: string[]
  // Calculator
  calcTitle: string
  calcRateLabel: string
  calcNightsLabel: string
  calcCommissionLabel: string
  calcLossLabel: string
  calcSavingLabel: string
  calcRoiNote: string
  calcDirectLabel: string
  calcAssumptions: string
  // HowItWorks
  howStep1Title: string
  howStep1Desc: string
  howStep2Title: string
  howStep2Desc: string
  howStep3Title: string
  howStep3Desc: string
  // Comparison
  compFeature: string
  compBooking: string
  compAirbnb: string
  compDomain: string
  compPrice: string
  // Pricing
  pricingPeriod: string
  pricingRenewal: string
  pricingRecommended: string
  pricingCtaBasic: string
  pricingCtaPro: string
  basicFeatures: string[]
  proFeatures: string[]
  // Testimonials
  testimonialsTitle: string
  testimonials: { text: string; author: string; location: string }[]
  // DemoCTA
  demoText: string
  demoCta: string
  // FAQ
  faqs: { q: string; a: string }[]
  // Footer
  footerCopyright: string
}> = {
  pl: {
    heroH1: 'Twoja strona.\nTwoje pieniądze.\nZero prowizji.',
    heroSub: 'Własna strona rezerwacyjna dla Twojego apartamentu. Płacisz raz za 2 lata, a każda rezerwacja jest w całości Twoja.',
    heroTrust: [
      'Zero prowizji od rezerwacji',
      'Płatność gościa trafia wprost na Twoje konto Stripe',
      'Ceny, kalendarz i galerię zmieniasz sam w panelu',
    ],
    calcTitle: 'Ile tracisz na prowizjach?',
    calcRateLabel: 'Średnia cena za noc (PLN)',
    calcNightsLabel: 'Liczba nocy w miesiącu',
    calcCommissionLabel: 'Prowizja Booking.com (%)',
    calcLossLabel: 'Prowizja Booking.com rocznie:',
    calcSavingLabel: 'Zostaje u Ciebie rocznie:',
    calcRoiNote: 'Nobooking Basic kosztuje 799 zł jednorazowo. Zwrot inwestycji w ~{days} dni.',
    calcDirectLabel: 'Ile rezerwacji przejmiesz bezpośrednio (%)',
    calcAssumptions: 'Liczymy tylko te rezerwacje, które przejdą na Twoją stronę — resztę nadal przyprowadza Booking.com i pobiera za nie prowizję. Od przejętych odejmujemy opłaty Stripe ({fee}, stawka standardowa dla kart europejskich; zależy od Twojego konta i kraju karty gościa) i zakładamy średnio 7 nocy na rezerwację.',
    howStep1Title: 'Wybierz plan i zapłać',
    howStep1Desc: 'Płatność kartą, BLIK lub Apple Pay. Bezpiecznie przez Stripe.',
    howStep2Title: 'Wypełnij formularz',
    howStep2Desc: 'Zbieramy dane o apartamencie: zdjęcia, opisy, ceny, zasady. Ty nic nie musisz konfigurować.',
    howStep3Title: 'Gotowa strona w 24 godziny',
    howStep3Desc: 'Własny adres nazwa.nobooking.eu, panel właściciela, strona gotowa do przyjmowania rezerwacji.',
    compFeature: 'Funkcja',
    compBooking: 'Booking.com',
    compAirbnb: 'Airbnb',
    compDomain: 'Własny adres strony',
    compPrice: 'Cena',
    pricingPeriod: 'na 2 lata',
    pricingRenewal: 'Po 2 latach — odnowienie od 299 zł / 99 € za kolejne 2 lata',
    pricingRecommended: 'Polecany',
    pricingCtaBasic: 'Kup Basic',
    pricingCtaPro: 'Kup Pro',
    basicFeatures: [
      'Hosting i adres nazwa.nobooking.eu na 2 lata',
      'Kalendarz i rezerwacje online',
      'Synchronizacja kalendarza z Booking.com i Airbnb',
      'Płatności online przez Stripe (karta, Apple Pay)',
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
    testimonialsTitle: 'Co mówią właściciele',
    // Puste, dopoki nie ma prawdziwych opinii klientow. Sekcja sama sie chowa.
    // Wczesniej staly tu trzy wymyslone opinie z nazwiskami, miejscowosciami
    // i konkretnymi kwotami oszczednosci — przy zerowej liczbie klientow.
    testimonials: [],
    demoText: 'Działająca strona apartamentu, taka jak Twoja. Bez rejestracji.',
    demoCta: 'Otwórz demo',
    faqs: [
      {
        q: 'Czy potrzebuję konta Stripe?',
        a: 'Tak. Zakładasz konto za darmo na stripe.com — to tam trafiają pieniądze od Twoich gości. Konfiguracja trwa ok. 15 minut, pomagamy w tym procesie.',
      },
      {
        q: 'Czy mogę sam zmienić zdjęcia i opisy?',
        a: 'Zdjęcia, filmy, ceny, kalendarz, dane kontaktowe i opinie zmieniasz sam w panelu — od razu, bez pytania nas. Teksty strony (opis apartamentu, udogodnienia, okolica) poprawiamy my: w cenie masz cztery rundy poprawek po odbiorze strony.',
      },
      {
        q: 'Co się dzieje po 2 latach?',
        a: 'Na 90, 30, 14, 7 i 1 dzień przed końcem dostajesz maila z przypomnieniem i linkiem do płatności. Odnowienie kosztuje od 299 zł / 99 € i pokrywa kolejne 2 lata — tę cenę zapisujemy w dniu zakupu i nie wzrośnie. Po wygaśnięciu masz jeszcze 14 dni; jeśli w tym czasie nie odnowisz, strona przestaje być dostępna dla gości. Twoje dane — rezerwacje, zdjęcia, opinie — zostają, więc odnowienie przywraca stronę w tym stanie, w jakim była.',
      },
      {
        q: 'Czy strona działa na telefonie?',
        a: 'Tak, strona jest w pełni responsywna i zoptymalizowana pod urządzenia mobilne — zarówno dla Ciebie (panel admina) jak i Twoich gości.',
      },
      {
        q: 'Ile trwa wdrożenie?',
        a: 'Zwykle 24 godziny od przesłania wypełnionego formularza onboardingowego ze wszystkimi materiałami (zdjęcia, opisy, ceny). Najpóźniej 7 dni roboczych.',
      },
      {
        q: 'Jakie są opcje płatności dla moich gości?',
        a: 'Karta kredytowa lub debetowa i Apple Pay, a Stripe może dodać inne metody popularne w kraju gościa. Pieniądze trafiają na nie zazwyczaj w ciągu 2 dni roboczych.',
      },
    ],
    footerCopyright: '© 2026 Nobooking',
  },
  en: {
    heroH1: 'Your site.\nYour money.\nZero commission.',
    heroSub: 'Your own booking site for your apartment. Pay once for 2 years and every booking is entirely yours.',
    heroTrust: [
      'No commission on bookings',
      'Guest payments go straight to your own Stripe account',
      'You change prices, calendar and gallery yourself',
    ],
    calcTitle: 'How much are you losing to commissions?',
    calcRateLabel: 'Average nightly rate (PLN)',
    calcNightsLabel: 'Nights per month',
    calcCommissionLabel: 'Booking.com commission (%)',
    calcLossLabel: 'Booking.com commission per year:',
    calcSavingLabel: 'Stays with you per year:',
    calcRoiNote: 'Nobooking Basic costs €199 one-time. ROI in ~{days} days.',
    calcDirectLabel: 'Share of bookings you take direct (%)',
    calcAssumptions: 'We only count bookings that move to your own site — the rest still come through Booking.com and still pay its commission. From the ones you take direct we subtract Stripe fees ({fee}, standard rate for European cards; it depends on your account and the card country) and assume 7 nights per booking on average.',
    howStep1Title: 'Choose plan and pay',
    howStep1Desc: 'Payment by card or Apple Pay. Securely via Stripe.',
    howStep2Title: 'Fill in the form',
    howStep2Desc: 'We collect apartment details: photos, descriptions, prices, rules. You configure nothing.',
    howStep3Title: 'Live site in 24 hours',
    howStep3Desc: 'Your own address name.nobooking.eu, owner panel, site ready to accept bookings.',
    compFeature: 'Feature',
    compBooking: 'Booking.com',
    compAirbnb: 'Airbnb',
    compDomain: 'Your own web address',
    compPrice: 'Price',
    pricingPeriod: 'for 2 years',
    pricingRenewal: 'After 2 years — renewal from €99 / 299 PLN for another 2 years',
    pricingRecommended: 'Recommended',
    pricingCtaBasic: 'Buy Basic',
    pricingCtaPro: 'Buy Pro',
    basicFeatures: [
      'Hosting and a name.nobooking.eu address for 2 years',
      'Online calendar and reservations',
      'Calendar sync with Booking.com and Airbnb',
      'Online payments via Stripe (card, Apple Pay)',
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
    testimonialsTitle: 'What owners say',
    // Puste, dopoki nie ma prawdziwych opinii klientow. Sekcja sama sie chowa.
    // Wczesniej staly tu trzy wymyslone opinie z nazwiskami, miejscowosciami
    // i konkretnymi kwotami oszczednosci — przy zerowej liczbie klientow.
    testimonials: [],
    demoText: 'A working apartment site, just like yours will be. No sign-up.',
    demoCta: 'Open demo',
    faqs: [
      {
        q: 'Do I need a Stripe account?',
        a: "Yes. Create a free account at stripe.com — that's where your guests' payments land. Setup takes about 15 minutes and we help you through the process.",
      },
      {
        q: 'Can I change photos and descriptions myself?',
        a: 'Photos, videos, prices, calendar, contact details and reviews you change yourself in the owner panel — instantly, without asking us. Page copy (apartment description, amenities, the area) we edit for you: four rounds of revisions are included after handover.',
      },
      {
        q: 'What happens after 2 years?',
        a: 'You get a reminder email with a payment link 90, 30, 14, 7 and 1 day before the end. Renewal starts at €99 / 299 PLN and covers another 2 years — we lock that price on the day you buy and it will not go up. After expiry you have 14 more days; if you do not renew by then, the site stops being available to guests. Your data — bookings, photos, reviews — stays, so renewing brings the site back exactly as it was.',
      },
      {
        q: 'Does the site work on mobile?',
        a: 'Yes, the site is fully responsive and optimised for mobile — both for you (admin panel) and your guests.',
      },
      {
        q: 'How long does setup take?',
        a: 'Usually 24 hours from when you submit the completed onboarding form with all materials (photos, descriptions, prices). At most 7 business days.',
      },
      {
        q: 'What payment options do my guests have?',
        a: 'Credit or debit card and Apple Pay, and Stripe may add other methods popular in the guest\'s country. Funds reach your account typically within 2 business days.',
      },
    ],
    footerCopyright: '© 2026 Nobooking',
  },
}
