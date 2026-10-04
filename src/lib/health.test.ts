import { describe, it, expect } from 'vitest'
import { ocenStan, wymagaUwagi, raportHtml, tematRaportu, odmien, opisSrodowiska, type StanSystemu } from './health'

const zdrowy: StanSystemu = {
  ostatniaKopiaGodzinTemu: 5,
  zamowieniaUtkniete: 0,
  zamowieniaPoddane: [],
  stronyDoPrzegladu: [],
  smsNieudane: [],
  smsDziala: null,
  smsNadawcaOk: null,
  checkinyPoRetencji: 0,
  przypomnieniaZalegle: 0,
  rezerwacjePendingStare: 0,
  stronyBezStripe: [],
  connectDziala: null,
  connectPowod: '',
  stripeKonto: null,
  stronyZeZdjeciamiZastepczymi: [],
  wygasajaceSubskrypcje: [],
  zdarzeniaStripe7dni: 3,
  rezerwacje7dni: 2,
  brakiSchematu: [],
  cronyMilczace: [],
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

  // Wstrzymana strona wygląda w bazie jak udana — ma wypełniony `site_slug`.
  // Gdyby raport jej nie pokazywał, klient czekałby bez końca na dane logowania.
  it('zgłasza strony wstrzymane do przeglądu razem z powodem', () => {
    const z = ocenStan({
      ...zdrowy,
      stronyDoPrzegladu: [{ slug: 'apart-sunny', powod: '✗ photos: Zero zdjęć.' }],
    })
    expect(z).toHaveLength(1)
    expect(z[0].waga).toBe('krytyczne')
    expect(z[0].tytul).toContain('1')
    expect(z[0].szczegol).toContain('apart-sunny')
    expect(z[0].szczegol).toContain('Zero zdjęć')
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

describe('ocenStan — SMS', () => {
  // SMS kosztuje za sztuke i jest funkcja platnego pakietu. Nieudana wysylka
  // jest niewidoczna dla wlasciciela: nic mu nie przychodzi i nic go o tym
  // nie informuje.
  it('zglasza nieudane wysylki z podzialem na powody', () => {
    const z = ocenStan({
      ...zdrowy,
      smsNieudane: [{ powod: 'limit_dzienny', ile: 3 }, { powod: '101: invalid token', ile: 1 }],
    })
    expect(z).toHaveLength(1)
    expect(z[0].waga).toBe('ostrzezenie')
    expect(z[0].tytul).toContain('4')
    expect(z[0].szczegol).toContain('limit_dzienny × 3')
    expect(z[0].szczegol).toContain('101: invalid token × 1')
  })

  it('milczy, gdy nic nie padlo', () => {
    expect(ocenStan({ ...zdrowy, smsNieudane: [] })).toEqual([])
  })
})

describe('ocenStan — poswiadczenia Twilio', () => {
  it('zglasza odrzucone poswiadczenia', () => {
    const z = ocenStan({ ...zdrowy, smsDziala: false })
    expect(z).toHaveLength(1)
    expect(z[0].tytul).toContain('SMS')
  })

  // Brak konfiguracji to nie awaria: SMS-y sa funkcja pakietu Pro, wiec dopoki
  // nikt go nie ma, ich brak jest w porzadku. Alarm bylby tu szumem.
  it('milczy, gdy SMS-y nie sa skonfigurowane', () => {
    expect(ocenStan({ ...zdrowy, smsDziala: null })).toEqual([])
  })

  it('milczy, gdy dzialaja', () => {
    expect(ocenStan({ ...zdrowy, smsDziala: true })).toEqual([])
  })
})

describe('ocenStan — retencja i zaleglosci', () => {
  // Numery dokumentow po pobycie nie sluza niczemu, a ich trzymanie jest samym
  // ryzykiem. Nikt nie zaglada do tabeli, ktorej nie uzywa, wiec zacięty cron
  // sprzatajacy bylby niewidoczny.
  it('zglasza dane check-in trzymane po terminie jako krytyczne', () => {
    const z = ocenStan({ ...zdrowy, checkinyPoRetencji: 3 })
    expect(z).toHaveLength(1)
    expect(z[0].waga).toBe('krytyczne')
    expect(z[0].tytul).toContain('3')
  })

  it('zglasza zalegle przypomnienia jako ostrzezenie', () => {
    const z = ocenStan({ ...zdrowy, przypomnieniaZalegle: 2 })
    expect(z).toHaveLength(1)
    expect(z[0].waga).toBe('ostrzezenie')
    expect(z[0].szczegol).toContain('guest-reminders')
  })

  it('milczy, gdy obie liczby sa zerowe', () => {
    expect(ocenStan({ ...zdrowy, checkinyPoRetencji: 0, przypomnieniaZalegle: 0 })).toEqual([])
  })
})

describe('ocenStan - zdjecia zastepcze', () => {
  // Informacja, nie alarm: strona dziala, tylko pokazuje cudzy apartament.
  // Przy ostrzezeniu kazda nowa strona wysylalaby maila co tydzien, az klient
  // wgra swoje zdjecia — i caly raport przestalby byc czytany.
  it('zglasza strony ze zdjeciami z Unsplasha jako info', () => {
    const z = ocenStan({ ...zdrowy, stronyZeZdjeciamiZastepczymi: ['apart-sunny'] })
    expect(z).toHaveLength(1)
    expect(z[0].waga).toBe('info')
    expect(z[0].szczegol).toContain('apart-sunny')
    expect(wymagaUwagi(z)).toBe(false)
  })

  it('milczy, gdy wszystkie strony maja wlasne zdjecia', () => {
    expect(ocenStan({ ...zdrowy, stronyZeZdjeciamiZastepczymi: [] })).toEqual([])
  })
})

describe('ocenStan - nadawca SMS', () => {
  it('zglasza zly nadawce jako ostrzezenie', () => {
    const z = ocenStan({ ...zdrowy, smsNadawcaOk: false })
    expect(z).toHaveLength(1)
    expect(z[0].waga).toBe('ostrzezenie')
    expect(z[0].szczegol).toContain('TWILIO_FROM_NUMBER')
  })

  it('milczy, gdy nadawca jest poprawny albo nieskonfigurowany', () => {
    expect(ocenStan({ ...zdrowy, smsNadawcaOk: true })).toEqual([])
    expect(ocenStan({ ...zdrowy, smsNadawcaOk: null })).toEqual([])
  })
})

describe('ocenStan - provisioning poddany', () => {
  // Cron przestal probowac po wyczerpaniu limitu. Bez tego wpisu klient,
  // ktory zaplacil, czekalby na strone w nieskonczonosc.
  it('zglasza wyczerpane proby jako krytyczne, razem z powodem', () => {
    const z = ocenStan({
      ...zdrowy,
      zamowieniaPoddane: [{ id: 'ord_1', powod: 'Anthropic API: 401 invalid key' }],
    })
    expect(z).toHaveLength(1)
    expect(z[0].waga).toBe('krytyczne')
    expect(z[0].szczegol).toContain('ord_1')
    expect(z[0].szczegol).toContain('invalid key')
  })

  it('radzi sobie z brakiem zapisanego powodu', () => {
    const z = ocenStan({ ...zdrowy, zamowieniaPoddane: [{ id: 'ord_2', powod: '' }] })
    expect(z[0].szczegol).toContain('nie zapisano')
  })

  it('milczy, gdy nic sie nie poddalo', () => {
    expect(ocenStan({ ...zdrowy, zamowieniaPoddane: [] })).toEqual([])
  })
})

describe('ocenStan - crony, ktore stanely', () => {
  // Jedyna awaria, ktorej nie zlapie ani Sentry, ani zaden objawowy wykrywacz:
  // kod, ktory sie nie wykonal, nie zostawia po sobie nic.
  it('zglasza spozniony cron jako krytyczny', () => {
    const z = ocenStan({ ...zdrowy, cronyMilczace: [{ nazwa: 'backup-bookings', godzinTemu: 50 }] })
    expect(z).toHaveLength(1)
    expect(z[0].waga).toBe('krytyczne')
    expect(z[0].tytul).toContain('backup-bookings')
    expect(z[0].szczegol).toContain('50')
  })

  it('odroznia cron, ktory nigdy sie nie uruchomil', () => {
    const z = ocenStan({ ...zdrowy, cronyMilczace: [{ nazwa: 'health', godzinTemu: null }] })
    expect(z[0].szczegol).toContain('ani jednego uruchomienia')
    expect(z[0].szczegol).toContain('vercel.json')
  })

  it('milczy, gdy wszystkie chodza', () => {
    expect(ocenStan({ ...zdrowy, cronyMilczace: [] })).toEqual([])
  })
})

describe('ocenStan - blokada Connect', () => {
  it('zglasza blokade razem z odpowiedzia Stripe', () => {
    const z = ocenStan({
      ...zdrowy,
      connectDziala: false,
      connectPowod: 'account_invalid: You must complete your platform profile',
    })
    expect(z).toHaveLength(1)
    expect(z[0].waga).toBe('ostrzezenie')
    expect(z[0].szczegol).toContain('platform profile')
  })

  // Zmiana na lepsze tez musi byc widoczna tego samego dnia — bez tego
  // odblokowanie wyszloby dopiero wtedy, gdy ktos zajrzy do panelu.
  it('zglasza odblokowanie jako informacje', () => {
    const z = ocenStan({ ...zdrowy, connectDziala: true })
    expect(z).toHaveLength(1)
    expect(z[0].waga).toBe('info')
    expect(z[0].szczegol).toContain('ETAP-2')
    expect(wymagaUwagi(z)).toBe(false)
  })

  it('milczy, gdy proby nie wykonano', () => {
    expect(ocenStan({ ...zdrowy, connectDziala: null })).toEqual([])
  })
})

describe('opisSrodowiska i stopka raportu', () => {
  it('nazywa konto i tryb', () => {
    expect(opisSrodowiska({ konto: 'acct_123', tryb: 'live', aktywne: true }))
      .toBe('Stripe: acct_123 (tryb live, aktywne).')
    expect(opisSrodowiska({ konto: 'acct_123', tryb: 'test', aktywne: true }))
      .toBe('Stripe: acct_123 (tryb testowy, aktywne).')
  })

  // Konto nieaktywne nie zalozy konta polaczonego, choc odczyt przez nie
  // przechodzi. Stopka ma to krzyczec, a nie szeptac.
  it('krzyczy, gdy konto nie ukończyło aktywacji', () => {
    expect(opisSrodowiska({ konto: 'acct_9', tryb: 'live', aktywne: false }))
      .toBe('Stripe: acct_9 (tryb live, NIEAKTYWNE).')
  })

  it('nie udaje, że wie, gdy odczyt się nie powiódł', () => {
    expect(opisSrodowiska(null)).toBe('Stripe: nie udało się odczytać konta.')
  })

  // Czysty raport to jedno zdanie — bez stopki nie dałoby się zauważyć,
  // że przez tydzień chwalił się zdrowiem nie ten Stripe, co trzeba.
  it('dokleja stopkę także do czystego raportu', () => {
    const html = raportHtml([], '2026-10-04', 'Stripe: acct_123 (tryb live).')
    expect(html).toContain('nic nie wymaga uwagi')
    expect(html).toContain('acct_123')
  })

  it('dokleja stopkę do raportu ze znaleziskami', () => {
    const html = raportHtml(ocenStan({ ...zdrowy, connectDziala: false }), '2026-10-04', 'Stripe: acct_9 (tryb live).')
    expect(html).toContain('acct_9')
  })

  it('bez stopki raport wygląda jak dotąd', () => {
    expect(raportHtml([], '2026-10-04')).toBe('<p>Raport z 2026-10-04: nic nie wymaga uwagi.</p>')
  })
})
