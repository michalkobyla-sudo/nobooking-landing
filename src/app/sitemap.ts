import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://nobooking.eu',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    // Bez /zamow (bez parametrów przekierowuje na cennik) i /demo (noindex) –
    // w mapie mają być tylko adresy, które Google ma pokazywać.
    // Dokumenty prawne — niska waga, ale mają być indeksowalne: Stripe i inni
    // weryfikujący szukają ich wprost, a klient powinien móc je znaleźć,
    // zanim zapłaci.
    {
      url: 'https://nobooking.eu/regulamin',
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: 'https://nobooking.eu/polityka-prywatnosci',
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]
}
