import * as Sentry from '@sentry/nextjs'

/**
 * Obserwowalność po stronie przeglądarki.
 *
 * Plik nazywał się wcześniej `sentry.client.config.ts` i przez to **nigdy się
 * nie wykonywał**: Next 16 wczytuje konfigurację kliencką wyłącznie z
 * `instrumentation-client.ts`
 * (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/instrumentation-client.md`).
 *
 * Skutkiem ubocznym było to, że `Sentry.captureException` w `global-error.tsx`
 * trafiało w niezainicjowany SDK — wyglądało na obsługę błędów, a nie było nią.
 */
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Don't send errors in development
  enabled: process.env.NODE_ENV === 'production',

  // Capture 10% of traces for performance monitoring
  tracesSampleRate: 0.1,

  // Capture replays only on errors (0% normal sessions, 100% on error)
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,

  integrations: [
    Sentry.replayIntegration(),
  ],
})

/**
 * Bez tego eksportu Sentry nie widzi przejść między stronami — a w aplikacji
 * z routerem klienckim to znaczy, że większość ruchu jest dla niego niewidoczna.
 * SDK prosi o niego wprost przy starcie (ACTION REQUIRED w logu).
 */
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
