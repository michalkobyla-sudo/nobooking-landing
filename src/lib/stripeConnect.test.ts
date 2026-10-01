import { describe, it, expect } from 'vitest'
import { cialoKontaV2, KRAJ_DOMYSLNY } from './stripe-connect'

/**
 * Ksztalt zadania zakladajacego konto polaczone. Trzy pola decyduja o tym,
 * kto placi — dlatego maja wlasne testy, a nie tylko komentarz w kodzie.
 */
describe('cialoKontaV2', () => {
  it('oplaty Stripe sciaga z konta wlasciciela, nie z platformy', () => {
    const c = cialoKontaV2('wlasciciel@example.com')
    expect(c.defaults.responsibilities.fees_collector).toBe('stripe')
  })

  // Przy Expressie ujemne saldo konta wlasciciela spadalo na platforme.
  // Tutaj odpowiedzialnosc zostaje u Stripe'a.
  it('nie bierze na platforme odpowiedzialnosci za ujemne saldo', () => {
    const c = cialoKontaV2('wlasciciel@example.com')
    expect(c.defaults.responsibilities.losses_collector).toBe('stripe')
  })

  // Panel express wymusza fees_collector=application, czyli platnosc oplat
  // przez platforme — to wyklucza model, w ktorym placi klient.
  it('zada pelnego panelu, bo express wymusza oplaty po stronie platformy', () => {
    expect(cialoKontaV2('a@b.pl').dashboard).toBe('full')
  })

  it('zaklada konto jako sprzedawce', () => {
    expect(cialoKontaV2('a@b.pl').configuration).toEqual({ merchant: {} })
  })

  it('domyslnie Polska, osoba fizyczna', () => {
    const c = cialoKontaV2('a@b.pl')
    expect(c.identity).toEqual({ country: KRAJ_DOMYSLNY, entity_type: 'individual' })
    expect(cialoKontaV2('a@b.pl', undefined, 'es').identity.country).toBe('es')
  })

  it('nazwa jest opcjonalna i przycinana', () => {
    expect(cialoKontaV2('a@b.pl')).not.toHaveProperty('display_name')
    expect(cialoKontaV2('a@b.pl', 'Apartament Sunny').display_name).toBe('Apartament Sunny')
    expect(cialoKontaV2('a@b.pl', 'x'.repeat(500)).display_name).toHaveLength(200)
  })

  it('e-mail trafia do kontaktu', () => {
    expect(cialoKontaV2('wlasciciel@example.com').contact_email).toBe('wlasciciel@example.com')
  })
})
