import * as Sentry from '@sentry/nextjs'

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
