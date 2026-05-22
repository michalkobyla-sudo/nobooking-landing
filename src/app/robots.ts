import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/sites/*/admin',
          '/api/',
          '/onboarding/',
          '/admin/',
        ],
      },
    ],
    sitemap: 'https://nobooking.eu/sitemap.xml',
  }
}
