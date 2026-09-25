import { describe, it, expect } from 'vitest'
import Stripe from 'stripe'
import { verifyStripeEvent, webhookSecrets } from './stripeWebhook'

const stripe = new Stripe('sk_test_tylko_do_testow')
const SEKRET_ACCOUNT = 'whsec_account_testowy'
const SEKRET_CONNECT = 'whsec_connect_testowy'

function podpisane(secret: string, id = 'evt_1') {
  const body = JSON.stringify({ id, object: 'event', type: 'checkout.session.completed' })
  const signature = stripe.webhooks.generateTestHeaderString({ payload: body, secret })
  return { body, signature }
}

describe('verifyStripeEvent', () => {
  it('przyjmuje zdarzenie z endpointu Account', () => {
    const { body, signature } = podpisane(SEKRET_ACCOUNT)
    const ev = verifyStripeEvent(stripe, body, signature, [SEKRET_ACCOUNT, SEKRET_CONNECT]) as { id: string }
    expect(ev.id).toBe('evt_1')
  })

  // Regresja: przy jednym STRIPE_WEBHOOK_SECRET podpisy drugiego endpointu
  // były odrzucane — rezerwacje albo zamówienia przestawały się potwierdzać.
  it('przyjmuje zdarzenie z endpointu Connect', () => {
    const { body, signature } = podpisane(SEKRET_CONNECT, 'evt_2')
    const ev = verifyStripeEvent(stripe, body, signature, [SEKRET_ACCOUNT, SEKRET_CONNECT]) as { id: string }
    expect(ev.id).toBe('evt_2')
  })

  it('odrzuca podpis nieznanym sekretem', () => {
    const { body, signature } = podpisane('whsec_obcy')
    expect(() => verifyStripeEvent(stripe, body, signature, [SEKRET_ACCOUNT, SEKRET_CONNECT])).toThrow()
  })

  it('odrzuca podmienioną treść przy poprawnym podpisie', () => {
    const { signature } = podpisane(SEKRET_ACCOUNT)
    const podmieniona = JSON.stringify({ id: 'evt_falszywy', object: 'event', type: 'checkout.session.completed' })
    expect(() => verifyStripeEvent(stripe, podmieniona, signature, [SEKRET_ACCOUNT])).toThrow()
  })

  it('odrzuca brak nagłówka i brak sekretów', () => {
    const { body, signature } = podpisane(SEKRET_ACCOUNT)
    expect(() => verifyStripeEvent(stripe, body, null, [SEKRET_ACCOUNT])).toThrow()
    expect(() => verifyStripeEvent(stripe, body, signature, [])).toThrow()
  })
})

describe('webhookSecrets', () => {
  it('zbiera oba sekrety, pomija puste i przycina białe znaki', () => {
    expect(webhookSecrets({ STRIPE_WEBHOOK_SECRET: ' a ', STRIPE_CONNECT_WEBHOOK_SECRET: 'b\n' } as unknown as NodeJS.ProcessEnv)).toEqual(['a', 'b'])
    expect(webhookSecrets({ STRIPE_WEBHOOK_SECRET: 'a' } as unknown as NodeJS.ProcessEnv)).toEqual(['a'])
    expect(webhookSecrets({} as unknown as NodeJS.ProcessEnv)).toEqual([])
  })
})
