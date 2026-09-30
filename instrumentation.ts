import * as Sentry from '@sentry/nextjs'

/**
 * Punkt wejścia obserwowalności po stronie serwera.
 *
 * **To jest brakujące ogniwo.** Pliki `sentry.server.config.ts` i
 * `sentry.edge.config.ts` istniały od początku, `next.config.ts` owijał build
 * przez `withSentryConfig`, a DSN był ustawiony w Vercelu — ale bez tego pliku
 * `Sentry.init` nigdy się nie wykonywał. Next uruchamia konfigurację serwerową
 * wyłącznie przez `register()` z `instrumentation.ts`
 * (`node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/instrumentation.md`).
 *
 * Skutek: Sentry nie zbierało niczego. Wszystkie ciche awarie, które w tym
 * projekcie trzeba było wyłapywać ręcznie — martwy backup, rozjechane sekrety
 * webhooków, niedziałająca poczta, dwa crony kończące się sukcesem bez żadnego
 * działania — nie miały kanału zgłoszeniowego, mimo że wyglądało, iż mają.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}

/**
 * Błędy rzucone w trakcie obsługi żądania po stronie serwera.
 *
 * Bez tego eksportu Sentry widziałoby wyłącznie to, co aplikacja zgłosi sama —
 * a nasze trasy łapią większość wyjątków, żeby nie wywracać płatności. Właśnie
 * dlatego ten haczyk jest tu ważniejszy niż w typowej aplikacji.
 */
export const onRequestError = Sentry.captureRequestError
