import { describe, it, expect } from 'vitest'
import { zbudujMailOdnowienia } from './sendRenewalEmail'

const ETAPY = [90, 30, 14, 7, 1, -14] as const

const params = (daysBefore: number) => ({
  ownerEmail: 'wlasciciel@example.com',
  apartmentName: 'Apart Sunny',
  slug: 'apart-sunny',
  expiresAt: new Date('2028-05-11T16:43:59.103Z'),
  renewalPricePln: 79900,
  renewalPriceEur: 19900,
  renewalCurrency: 'pln',
  daysBefore,
})

describe('zbudujMailOdnowienia', () => {
  /**
   * Sedno sprawy. Przycisk w mailu D-14 miał etykietę w apostrofach zamiast
   * w odwrotnych ukośnikach, więc właściciel dostawał guzik z napisem
   * „Odnów teraz — ${priceStr} →" — surowe wyrażenie zamiast kwoty, w mailu
   * o płatności. Ten test łapie każdy taki placeholder, nie tylko tamten.
   */
  it.each(ETAPY)('mail D-%i nie zawiera niepodstawionego wyrażenia', (d) => {
    const { subject, html } = zbudujMailOdnowienia(params(d))
    expect(subject).not.toContain('${')
    expect(html).not.toContain('${')
  })

  it.each(ETAPY)('mail D-%i ma temat i treść', (d) => {
    const { subject, html } = zbudujMailOdnowienia(params(d))
    expect(subject.length).toBeGreaterThan(5)
    expect(html).toContain('Apart Sunny')
  })

  it('podaje kwotę w walucie zapisanej przy stronie', () => {
    expect(zbudujMailOdnowienia(params(14)).html).toContain('799 zł')
    expect(zbudujMailOdnowienia({ ...params(14), renewalCurrency: 'eur' }).html).toContain('199 €')
  })

  // Strony sprzed wprowadzenia cen odnowienia nie mają zapisanej kwoty.
  // Mail ma wtedy wyjść bez kwoty, a nie z „null zł".
  it('bez zapisanej ceny nie wypisuje pustej kwoty', () => {
    const { html } = zbudujMailOdnowienia({
      ...params(14), renewalPricePln: null, renewalPriceEur: null,
    })
    expect(html).not.toContain('null')
    expect(html).not.toContain('NaN')
  })

  it('odnośnik prowadzi do zakładki subskrypcji tej strony', () => {
    expect(zbudujMailOdnowienia(params(30)).html).toContain('/sites/apart-sunny/admin/subskrypcja')
  })
})
