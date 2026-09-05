import type { NextConfig } from "next";
import { withSentryConfig } from '@sentry/nextjs';

const isDev = process.env.NODE_ENV !== 'production'

/**
 * Content-Security-Policy.
 *
 * Kompromisy, świadomie:
 *  - script-src ma 'unsafe-inline' i 'unsafe-eval', bo Next.js bez nonce'ów
 *    inaczej nie wystartuje. CSP nadal blokuje najważniejszy wektor: wczytanie
 *    skryptu z obcego hosta (np. podmienionego formularza płatności).
 *  - img-src dopuszcza dowolne https, bo zdjęcia apartamentów podaje właściciel
 *    i mogą leżeć gdziekolwiek.
 *  - frame-src wymienia hosty, które faktycznie osadzamy: mapy Google
 *    (config.map.embedUrl) i filmy YouTube (galeria wideo).
 */
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  [
    "connect-src 'self'",
    'https://*.supabase.co',
    'https://*.sentry.io',
    'https://*.ingest.sentry.io',
    isDev ? 'ws: http://localhost:*' : '',
  ].filter(Boolean).join(' '),
  "frame-src 'self' https://www.google.com https://maps.google.com https://www.youtube.com https://www.youtube-nocookie.com",
  'upgrade-insecure-requests',
].join('; ')

const nextConfig: NextConfig = {
  serverExternalPackages: ['stripe'],

  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'Content-Security-Policy', value: csp },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          // X-XSS-Protection celowo usunięty: nagłówek jest wycofany, ignorowany
          // przez współczesne przeglądarki, a w starszych sam bywał źródłem
          // podatności. Jego rolę przejmuje CSP powyżej.
        ],
      },
    ]
  },
};

export default withSentryConfig(nextConfig, {
  org: 'michal-kobylinski',
  project: 'nobooking-landing',

  // Only upload source maps when SENTRY_AUTH_TOKEN is set (i.e. in CI/Vercel)
  silent: !process.env.CI,

  // Upload source maps so stack traces show real code, not minified
  widenClientFileUpload: true,

  // Hide Sentry logs during build
  disableLogger: true,

  // Automatically instrument Next.js data fetching
  automaticVercelMonitors: true,
});
