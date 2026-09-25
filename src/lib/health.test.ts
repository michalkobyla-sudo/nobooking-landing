import { describe, it, expect } from 'vitest'
import { ocenStan, wymagaUwagi, raportHtml, tematRaportu, odmien, type StanSystemu } from './health'

const zdrowy: StanSystemu = {
  ostatniaKopiaGodzinTemu: 5,
  zamowieniaUtkniete: 0,
  rezerwacjePendingStare: 0,
  stronyBezStripe: [],
  wygasajaceSubskrypcje: [],
  zdarzeniaStripe7dni: 3,
  rezerwacje7dni: 2,
  brakiSchematu: [],
  mailDziala: true,
  modelDziala: true,
  botWlaczony: false,
  botToken: null,
}

const tytuly = (s: Partial<StanSystemu>) => ocenStan({ ...zdrowy, ...s }).map(z => z.tytul)

describe('ocenStan', () => {
  it('zdrowy system nie daje żadnych znalezisk', () => {
    expect(ocenStan(zdrowy)).toEqual([])
  })

  // Wszystkie poniższe to sytuacje, które faktycznie wystąpiły i nikt ich
  // nie zauważył przez cztery miesiące.
  it('wykrywa brak kopii zapasowej', () => {
    expect(tytuly({ ostatniaKopiaGodzinTemu: null })).toContain('Brak jakiejkolwiek kopii zapasowej')
    expect(tytuly({ ostatniaKopiaGodzinTemu: 40 })).toContain('Kopia zapasowa nieaktualna')
    expect(tytuly({ ostatniaKopiaGodzinTemu: 30 })).toEqual([])
  })

  // Awaria, która sama siebie ukrywa: maile lecą w try/catch, więc system
  // działa dalej, a powiadomienia po prostu nie docierają.
  it('wykrywa niedziałającą wysyłkę e-maili', () => {
    const z = ocenStan({ ...zdrowy, mailDziala: false })
    expect(z[0].waga).toBe('krytyczne')
    expect(z[0].tytul).toBe('Wysyłka e-maili nie działa')
  })

  it('nie alarmuje, gdy stanu poczty nie dało się sprawdzić', () => {
    expect(tytuly({ mailDziala: null })).toEqual([])
  })

  it('wykrywa nieważny klucz do generowania stron', () => {
    const z = ocenStan({ ...zdrowy, modelDziala: false })
    expect(z[0].waga).toBe('krytyczne')
    expect(z[0].tytul).toBe('Generowanie stron nie działa')
  })

  it('zgłasza martwy token bota tylko gdy bot jest włączony', () => {
    expect(tytuly({ botWlaczony: true, botToken: false })).toContain('Bot Facebooka nie odpowiada')
    expect(tytuly({ botWlaczony: false, botToken: false })).toEqual([])
  })

  it('wykrywa nieuruchomioną migrację', () => {
    const z = ocenStan({ ...zdrowy, brakiSchematu: ['sites.expires_at'] })
    expect(z[0].waga).toBe('krytyczne')
    expect(z[0].szczegol).toContain('sites.expires_at')
  })

  it('wykrywa zamówienia bez wygenerowanej strony', () => {
    expect(tytuly({ zamowieniaUtkniete: 2 })).toContain('Zamówienia bez wygenerowanej strony')
  })

  it('wykrywa niedziałający webhook po braku zdarzeń mimo ruchu', () => {
    expect(tytuly({ zdarzeniaStripe7dni: 0, rezerwacje7dni: 5 }))
      .toContain('Webhook Stripe prawdopodobnie nie działa')
  })

  it('nie alarmuje o webhooku, gdy po prostu nie było rezerwacji', () => {
    expect(tytuly({ zdarzeniaStripe7dni: 0, rezerwacje7dni: 0 })).toEqual([])
  })

  it('wykrywa wiszące rezerwacje pending', () => {
    expect(tytuly({ rezerwacjePendingStare: 1 })).toContain('Rezerwacje wiszą w stanie pending')
  })

  it('wykrywa strony bez połączonego Stripe', () => {
    const z = ocenStan({ ...zdrowy, stronyBezStripe: ['apart-sunny'] })
    expect(z[0].szczegol).toContain('apart-sunny')
    expect(z[0].waga).toBe('ostrzezenie')
  })

  it('stopniuje wagę wygasających subskrypcji', () => {
    const z = ocenStan({ ...zdrowy, wygasajaceSubskrypcje: [{ slug: 'a', dni: 7 }, { slug: 'b', dni: 45 }] })
    expect(z.find(x => x.tytul.endsWith(': a'))?.waga).toBe('ostrzezenie')
    expect(z.find(x => x.tytul.endsWith(': b'))?.waga).toBe('info')
  })
})

describe('wymagaUwagi', () => {
  it('sama informacja nie generuje maila', () => {
    expect(wymagaUwagi(ocenStan({ ...zdrowy, wygasajaceSubskrypcje: [{ slug: 'a', dni: 45 }] }))).toBe(false)
  })

  it('ostrzeżenie i problem krytyczny generują maila', () => {
    expect(wymagaUwagi(ocenStan({ ...zdrowy, rezerwacjePendingStare: 1 }))).toBe(true)
    expect(wymagaUwagi(ocenStan({ ...zdrowy, ostatniaKopiaGodzinTemu: null }))).toBe(true)
  })
})

describe('raportHtml', () => {
  it('opisuje brak znalezisk', () => {
    expect(raportHtml([], '2026-09-25')).toContain('nic nie wymaga uwagi')
  })

  it('zawiera treść znalezisk i datę', () => {
    const html = raportHtml(ocenStan({ ...zdrowy, zamowieniaUtkniete: 3 }), '2026-09-25')
    expect(html).toContain('2026-09-25')
    expect(html).toContain('KRYTYCZNE')
    expect(html).toContain('provision-sites')
  })
})

describe('tematRaportu i odmiana', () => {
  it('odmienia rzeczownik przez liczbę', () => {
    const f: [string, string, string] = ['problem', 'problemy', 'problemów']
    expect([1, 2, 4, 5, 12, 14, 22, 25].map(n => odmien(n, f)))
      .toEqual(['problem', 'problemy', 'problemy', 'problemów', 'problemów', 'problemów', 'problemy', 'problemów'])
  })

  it('temat wyróżnia problemy krytyczne', () => {
    expect(tematRaportu(ocenStan({ ...zdrowy, mailDziala: false })))
      .toBe('Nobooking: 1 problem krytyczny')
    expect(tematRaportu(ocenStan({ ...zdrowy, rezerwacjePendingStare: 1 })))
      .toBe('Nobooking: 1 rzecz do sprawdzenia')
  })
})
