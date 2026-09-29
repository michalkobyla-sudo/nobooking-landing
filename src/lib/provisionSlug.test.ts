import { describe, it, expect } from 'vitest'
import { slugZamowienia } from './provision-site'
import { toSlug } from './generate-site'

type Zamowienie = Parameters<typeof slugZamowienia>[0]

const zam = (site_slug: string | null, apartment_name: string): Zamowienie =>
  ({ site_slug, apartment_name }) as Zamowienie

describe('slugZamowienia', () => {
  it('używa sluga zapisanego przy provisioningu', () => {
    expect(slugZamowienia(zam('apart-sunny-2', 'Apart Sunny'))).toBe('apart-sunny-2')
  })

  /**
   * Sedno sprawy. `insertSiteWithFreeSlug` nadaje drugiemu klientowi o tej samej
   * nazwie apartamentu slug `nazwa-2`. Liczenie sluga z nazwy zwracałoby `nazwa`,
   * czyli stronę **pierwszego** klienta — regeneracja poprawek nadpisywałaby
   * cudzą stronę, a mail prowadziłby pod zły adres.
   */
  it('nie pozwala drugiemu klientowi trafić na stronę pierwszego', () => {
    const pierwszy = zam('apart-sunny', 'Apart Sunny')
    const drugi = zam('apart-sunny-2', 'Apart Sunny')

    expect(toSlug(pierwszy.apartment_name)).toBe(toSlug(drugi.apartment_name))
    expect(slugZamowienia(pierwszy)).not.toBe(slugZamowienia(drugi))
  })

  it('bez zapisanego sluga liczy go z nazwy — strona jeszcze nie powstała', () => {
    expect(slugZamowienia(zam(null, 'Apart Sunny'))).toBe(toSlug('Apart Sunny'))
  })

  it('pusty i biały slug traktuje jak brak', () => {
    expect(slugZamowienia(zam('', 'Apart Sunny'))).toBe(toSlug('Apart Sunny'))
    expect(slugZamowienia(zam('   ', 'Apart Sunny'))).toBe(toSlug('Apart Sunny'))
  })
})
