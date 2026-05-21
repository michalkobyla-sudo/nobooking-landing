import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  enabled: process.env.NODE_ENV === 'production',

  tracesSampleRate: 0.1,

  // Alert immediately on these critical paths
  beforeSend(event) {
    // Tag critical cron failures so we can set up dedicated alerts
    const url = event.request?.url ?? ''
    if (url.includes('/api/cron/provision-sites')) {
      event.tags = { ...event.tags, critical: 'provision_failed' }
    }
    if (url.includes('/api/stripe/webhook')) {
      event.tags = { ...event.tags, critical: 'webhook_failed' }
    }
    return event
  },
})
