/**
 * Weryfikacja podpisu webhooka Stripe przy DWÓCH endpointach pod jednym URL-em.
 *
 * Przy direct charges potrzebne są dwa endpointy w Stripe Dashboard:
 *   - Account — zdarzenia konta platformy (zamówienia stron, odnowienia),
 *   - Connect — zdarzenia kont połączonych (rezerwacje gości).
 * Stripe nadaje każdemu endpointowi osobny sekret podpisu (whsec_…), więc
 * jeden STRIPE_WEBHOOK_SECRET nie wystarczy: po wpisaniu sekretu Connect
 * przestałyby przechodzić zdarzenia Account i odwrotnie.
 *
 * Próbujemy kolejno każdego skonfigurowanego sekretu. Podpis jest HMAC-em
 * treści, więc pasuje do dokładnie jednego z nich — kolejność nie ma
 * znaczenia dla bezpieczeństwa.
 */

// Minimalny kształt tego, czego potrzebujemy z klienta Stripe — pozwala
// testować bez sieci i bez prawdziwego klucza.
export interface StripeWebhooks {
  webhooks: {
    constructEvent(body: string, signature: string, secret: string): unknown
  }
}

export function webhookSecrets(env: NodeJS.ProcessEnv = process.env): string[] {
  return [env.STRIPE_WEBHOOK_SECRET, env.STRIPE_CONNECT_WEBHOOK_SECRET]
    .map(s => (s ?? '').trim())
    .filter(Boolean)
}

/**
 * Zwraca zweryfikowane zdarzenie albo rzuca, gdy podpis nie pasuje do
 * żadnego sekretu (lub gdy żaden sekret nie jest skonfigurowany).
 */
export function verifyStripeEvent(
  stripe: StripeWebhooks,
  body: string,
  signature: string | null,
  secrets: string[],
): unknown {
  if (!signature) throw new Error('brak nagłówka stripe-signature')
  if (secrets.length === 0) throw new Error('brak skonfigurowanego sekretu webhooka')

  let ostatniBlad: unknown
  for (const secret of secrets) {
    try {
      return stripe.webhooks.constructEvent(body, signature, secret)
    } catch (err) {
      ostatniBlad = err
    }
  }
  throw ostatniBlad instanceof Error ? ostatniBlad : new Error('invalid signature')
}
