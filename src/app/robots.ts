import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/sites/*/admin',
          // Portal gościa: imię i nazwisko, daty pobytu, status płatności,
          // a w formularzu check-in dane dokumentu. Chroni je wyłącznie
          // nieodgadywalny identyfikator rezerwacji — a to nie powód, żeby
          // wpuszczać tam wyszukiwarki. Każdy z tych adresów ma dodatkowo
          // `noindex` w metadanych, bo robots.txt jest prośbą, nie zakazem,
          // i nie powstrzymuje zaindeksowania adresu wskazanego z zewnątrz.
          '/sites/*/guest',
          '/api/',
          '/onboarding/',
          '/admin/',
          // Podgląd zamówienia po płatności — adres zawiera identyfikator sesji.
          '/sukces',
          // Poprawki strony otwierane z maila; token w adresie.
          '/poprawki/',
        ],
      },
    ],
    sitemap: 'https://nobooking.eu/sitemap.xml',
  }
}
