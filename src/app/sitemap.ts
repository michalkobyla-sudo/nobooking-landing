import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: 'https://nobooking.eu',
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: 'https://nobooking.eu/zamow',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: 'https://nobooking.eu/demo',
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
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
