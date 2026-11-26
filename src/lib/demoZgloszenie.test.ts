import { describe, it, expect } from 'vitest'
import { walidujZgloszenie, daneDoGeneracji, poprawnyToken } from './demoZgloszenie'

const POPRAWNE = {
  first_name: 'Anna',
  email: 'Anna@Example.com ',
  apartment_name: 'Casa Mar',
  apartment_location: 'Torrevieja, Costa Blanca',
  zgoda: true,
}

describe('walidujZgloszenie', () => {
  it('przyjmuje minimum i normalizuje e-mail', () => {
    const w = walidujZgloszenie(POPRAWNE)
    expect(w.ok).toBe(true)
    if (!w.ok) return
    expect(w.dane.email).toBe('anna@example.com')
    expect(w.dane.currency).toBe('pln')
    expect(w.dane.price_per_night).toBeNull()
    expect(w.dane.offer_link).toBeNull()
  })

  it('wymaga zgody podanej ściśle jako true', () => {
    expect(walidujZgloszenie({ ...POPRAWNE, zgoda: 'true' })).toEqual({ ok: false, blad: 'missing_consent' })
  })

  it('odrzuca brakujące pola i zły e-mail', () => {
    expect(walidujZgloszenie({ ...POPRAWNE, first_name: '  ' })).toMatchObject({ blad: 'missing_first_name' })
    expect(walidujZgloszenie({ ...POPRAWNE, email: 'anna@' })).toMatchObject({ blad: 'invalid_email' })
    expect(walidujZgloszenie({ ...POPRAWNE, apartment_location: '' })).toMatchObject({ blad: 'missing_apartment_location' })
  })

  it('liczby: pusta wartość to brak, poza zakresem to błąd', () => {
    const w = walidujZgloszenie({ ...POPRAWNE, price_per_night: '350,5', max_guests: '', bedrooms: 2 })
    expect(w).toMatchObject({ ok: true, dane: { price_per_night: 351, max_guests: null, bedrooms: 2 } })
    expect(walidujZgloszenie({ ...POPRAWNE, price_per_night: -5 })).toMatchObject({ blad: 'invalid_price' })
    expect(walidujZgloszenie({ ...POPRAWNE, max_guests: 'dużo' })).toMatchObject({ blad: 'invalid_guests' })
  })

  it('link: dopisuje https, odrzuca inne protokoły', () => {
    expect(walidujZgloszenie({ ...POPRAWNE, offer_link: 'booking.com/hotel/es/casa-mar' }))
      .toMatchObject({ ok: true, dane: { offer_link: 'https://booking.com/hotel/es/casa-mar' } })
    expect(walidujZgloszenie({ ...POPRAWNE, offer_link: 'javascript:alert(1)' })).toMatchObject({ blad: 'invalid_link' })
  })

  it('przycina długie teksty', () => {
    const w = walidujZgloszenie({ ...POPRAWNE, apartment_name: 'x'.repeat(500), description: 'y'.repeat(5000) })
    expect(w.ok && w.dane.apartment_name.length).toBe(80)
    expect(w.ok && w.dane.description?.length).toBe(1500)
  })
})

describe('daneDoGeneracji', () => {
  it('nie podaje modelowi telefonu, a kontakt to e-mail klienta', () => {
    const w = walidujZgloszenie(POPRAWNE)
    if (!w.ok) throw new Error('walidacja')
    const d = daneDoGeneracji({ id: 'x', ...w.dane })
    expect(d.phone).toBe('')
    expect(d.ob_contact_phone).toBeNull()
    expect(d.ob_contact_email).toBe('anna@example.com')
    expect(d.revision_notes).toBeNull()
  })
})

describe('poprawnyToken', () => {
  it('przyjmuje tylko 24 znaki base64url', () => {
    expect(poprawnyToken('abcdefghijklmnopqrstuv_-')).toBe(true)
    expect(poprawnyToken('abc')).toBe(false)
    expect(poprawnyToken('abcdefghijklmnopqrstuv/+')).toBe(false)
  })
})
