/**
 * Ocena stanu systemu — czysta funkcja, bez dostępu do bazy.
 *
 * Powód istnienia: przez cztery miesiące nikt nie zauważył, że backup nie
 * działa, cron odnowień wywraca się codziennie, a webhooki Stripe odrzucają
 * każde zdarzenie. Wszystkie te dane były dostępne — nikt ich nie oglądał.
 *
 * Zbieranie danych robi trasa `/api/cron/health`; tutaj jest sama ocena, żeby
 * dało się ją przetestować bez produkcji.
 */

export type Waga = 'krytyczne' | 'ostrzezenie' | 'info'

export interface Znalezisko {
  waga: Waga
  tytul: string
  szczegol: string
}

export interface StanSystemu {
  /** Ile godzin temu powstała ostatnia kopia zapasowa. null = nie ma żadnej. */
  ostatniaKopiaGodzinTemu: number | null
  /** Zamówienia z wypełnionym onboardingiem, które nie dostały strony. */
  zamowieniaUtkniete: number
  /** Strony wstrzymane przez sprawdzenie provisioningu — czekają na przegląd. */
  stronyDoPrzegladu: Array<{ slug: string; powod: string }>
  /** Nieudane wysyłki SMS z ostatniej doby, pogrupowane po powodzie. */
  smsNieudane: Array<{ powod: string; ile: number }>
  /** Czy poświadczenia Twilio są ważne. `null` = SMS-y nieskonfigurowane. */
  smsDziala: boolean | null
  /** Czy `TWILIO_FROM_NUMBER` jest poprawnym nadawca. `null` = nieskonfigurowane. */
  smsNadawcaOk: boolean | null
  /** Formularze check-in trzymane dłużej, niż pozwala retencja (RODO). */
  checkinyPoRetencji: number
  /** Rezerwacje, którym wczoraj minął termin przypomnienia, a nic nie poszło. */
  przypomnieniaZalegle: number
  /** Rezerwacje `pending` starsze niż 3 h — cron sprzątający powinien je anulować. */
  rezerwacjePendingStare: number
  /** Aktywne strony bez ukończonego Stripe Connect — nie przyjmą płatności. */
  stronyBezStripe: string[]
  /** Strony, które wciąż mają w galerii zdjęcia zastępcze z generatora. */
  stronyZeZdjeciamiZastepczymi: string[]
  /** Strony z datą wygaśnięcia w ciągu 60 dni. */
  wygasajaceSubskrypcje: Array<{ slug: string; dni: number }>
  /** Zdarzenia Stripe zapisane w ostatnich 7 dniach. */
  zdarzeniaStripe7dni: number
  /** Rezerwacje utworzone w ostatnich 7 dniach. */
  rezerwacje7dni: number
  /** Kolumny lub tabele, których zabrakło przy sprawdzeniu schematu. */
  brakiSchematu: string[]
  /** Czy klucz API poczty jest ważny. null = nie udało się sprawdzić. */
  mailDziala: boolean | null
  /** Czy klucz Anthropic jest ważny — bez niego provisioning nie wygeneruje strony. */
  modelDziala: boolean | null
  /** Czy bot Facebooka jest włączony w ustawieniach. */
  botWlaczony: boolean
  /** Czy token strony Facebooka jest ważny. null = nie sprawdzono. */
  botToken: boolean | null
}

/** Po tylu godzinach bez kopii uznajemy backup za niedziałający.
 *  Cron chodzi raz na dobę, więc 36 h to jedno pominięte uruchomienie. */
const PROG_KOPII_GODZIN = 36

export function ocenStan(s: StanSystemu): Znalezisko[] {
  const z: Znalezisko[] = []

  if (s.ostatniaKopiaGodzinTemu === null) {
    z.push({
      waga: 'krytyczne',
      tytul: 'Brak jakiejkolwiek kopii zapasowej',
      szczegol: 'W buckecie nie ma ani jednego pliku kopii. Sprawdź cron backup-bookings.',
    })
  } else if (s.ostatniaKopiaGodzinTemu > PROG_KOPII_GODZIN) {
    z.push({
      waga: 'krytyczne',
      tytul: 'Kopia zapasowa nieaktualna',
      szczegol: `Ostatnia kopia powstała ${Math.round(s.ostatniaKopiaGodzinTemu)} h temu (próg: ${PROG_KOPII_GODZIN} h).`,
    })
  }

  // Sprawdzane wprost, bo awaria poczty jest niewidoczna: każdy mail leci
  // w try/catch, więc system działa dalej i nikt nie dostaje powiadomień.
  if (s.mailDziala === false) {
    z.push({
      waga: 'krytyczne',
      tytul: 'Wysyłka e-maili nie działa',
      szczegol: 'Klucz BREVO_API_KEY jest odrzucany. Nie wychodzą maile onboardingowe, potwierdzenia rezerwacji ani powitania właścicieli — łącznie z tym raportem.',
    })
  }

  if (s.modelDziala === false) {
    z.push({
      waga: 'krytyczne',
      tytul: 'Generowanie stron nie działa',
      szczegol: 'Klucz ANTHROPIC_API_KEY jest odrzucany. Zamówienia po onboardingu nie dostaną strony.',
    })
  }

  // Ostrzegamy tylko o włączonym bocie — wyłączony z premedytacją nie jest awarią.
  if (s.botWlaczony && s.botToken === false) {
    z.push({
      waga: 'ostrzezenie',
      tytul: 'Bot Facebooka nie odpowiada',
      szczegol: 'Token strony jest odrzucany przez Meta. Bot jest włączony, ale nie odpisuje na wiadomości ani komentarze.',
    })
  }

  if (s.brakiSchematu.length > 0) {
    z.push({
      waga: 'krytyczne',
      tytul: 'Schemat bazy nie zgadza się z kodem',
      szczegol: `Brakuje: ${s.brakiSchematu.join(', ')}. Najpewniej nieuruchomiona migracja.`,
    })
  }

  if (s.zamowieniaUtkniete > 0) {
    z.push({
      waga: 'krytyczne',
      tytul: 'Zamówienia bez wygenerowanej strony',
      szczegol: `${s.zamowieniaUtkniete} klient(ów) wypełnił onboarding i nie dostał strony. Sprawdź cron provision-sites.`,
    })
  }

  // Strona powstała, ale nie przeszła sprawdzenia, więc klient nie dostał maila
  // z danymi logowania. Czeka, nie wiedząc na co — dlatego to jest krytyczne,
  // a nie ostrzeżenie.
  if (s.stronyDoPrzegladu.length > 0) {
    z.push({
      waga: 'krytyczne',
      tytul: `Strony wstrzymane do przeglądu: ${s.stronyDoPrzegladu.length}`,
      szczegol: s.stronyDoPrzegladu
        .map((p) => `${p.slug} — ${p.powod}`)
        .join('; ') + '. Klient nie dostał danych logowania. Popraw config i wyślij ręcznie.',
    })
  }

  // Dane dokumentu tożsamości po pobycie nie służą już niczemu, a ich trzymanie
  // jest samym ryzykiem. Kasuje je cron sprzątający — jeśli przestanie działać,
  // nic tego nie pokaże, bo nikt nie zagląda do tabeli, której nie używa.
  if (s.checkinyPoRetencji > 0) {
    z.push({
      waga: 'krytyczne',
      tytul: `Dane check-in po terminie retencji: ${s.checkinyPoRetencji}`,
      szczegol: 'Formularze z numerami dokumentów powinny zniknąć tydzień po wyjeździe. Sprawdź cron cleanup-pending-bookings.',
    })
  }

  // Cron powiadomień kończy się sukcesem także wtedy, gdy nic nie wyśle —
  // zaległość widać dopiero po tym, że termin minął, a śladu wysyłki nie ma.
  if (s.przypomnieniaZalegle > 0) {
    z.push({
      waga: 'ostrzezenie',
      tytul: `Niewysłane przypomnienia przed przyjazdem: ${s.przypomnieniaZalegle}`,
      szczegol: 'Rezerwacjom minął wczoraj termin przypomnienia, a w guest_notifications nie ma śladu wysyłki. Sprawdź cron guest-reminders.',
    })
  }

  // Zły token byłby niewidoczny aż do pierwszej rezerwacji: wysyłka nie
  // przewraca potwierdzania, tylko cicho nie dochodzi. `null` znaczy
  // „nieskonfigurowane" i nie jest awarią — SMS-y są funkcją pakietu Pro,
  // więc dopóki nikt go nie ma, brak konfiguracji jest w porządku.
  if (s.smsDziala === false) {
    z.push({
      waga: 'ostrzezenie',
      tytul: 'Powiadomienia SMS nie działają',
      szczegol: 'Twilio odrzuca poświadczenia. Właściciele z planem Pro nie dostaną SMS-ów o rezerwacjach, a nic ich o tym nie poinformuje.',
    })
  }

  // Zly nadawca odrzuca kazda wiadomosc tak samo, wiec to awaria konfiguracji,
  // nie pojedynczej wysylki. Sprawdzamy ja bez wysylania czegokolwiek, zeby
  // wyszla przed pierwsza rezerwacja, a nie przy niej.
  if (s.smsNadawcaOk === false) {
    z.push({
      waga: 'ostrzezenie',
      tytul: 'Nadawca SMS jest nieprawidłowy',
      szczegol: 'TWILIO_FROM_NUMBER musi być numerem w formacie +48… albo nazwą do 11 znaków (litery, cyfry, spacja — co najmniej jedna litera). Przy obecnej wartości Twilio odrzuci każdą wiadomość.',
    })
  }

  // SMS kosztuje za sztukę i jest funkcją płatnego pakietu — nieudana wysyłka
  // jest niewidoczna dla właściciela, bo nic mu nie przychodzi i nic go o tym
  // nie informuje.
  if (s.smsNieudane.length > 0) {
    const razem = s.smsNieudane.reduce((a, x) => a + x.ile, 0)
    z.push({
      waga: 'ostrzezenie',
      tytul: `Nieudane SMS-y: ${razem}`,
      szczegol: s.smsNieudane.map((x) => `${x.powod} × ${x.ile}`).join('; ') + '.',
    })
  }

  // Webhook, który nic nie zapisał mimo ruchu, zwykle znaczy rozjechany sekret
  // podpisu — dokładnie to zdarzyło się we wrześniu 2026 na obu projektach.
  if (s.rezerwacje7dni > 0 && s.zdarzeniaStripe7dni === 0) {
    z.push({
      waga: 'krytyczne',
      tytul: 'Webhook Stripe prawdopodobnie nie działa',
      szczegol: `W 7 dni powstało ${s.rezerwacje7dni} rezerwacji, a nie zapisano ani jednego zdarzenia Stripe. Sprawdź dopasowanie STRIPE_WEBHOOK_SECRET.`,
    })
  }

  if (s.rezerwacjePendingStare > 0) {
    z.push({
      waga: 'ostrzezenie',
      tytul: 'Rezerwacje wiszą w stanie pending',
      szczegol: `${s.rezerwacjePendingStare} rezerwacji starszych niż 3 h blokuje terminy. Cron cleanup-pending-bookings powinien je anulować.`,
    })
  }

  if (s.stronyBezStripe.length > 0) {
    z.push({
      waga: 'ostrzezenie',
      tytul: 'Strony bez połączonego Stripe',
      szczegol: `${s.stronyBezStripe.join(', ')} — goście zobaczą dane kontaktowe zamiast płatności.`,
    })
  }

  // Celowo `info`, a nie ostrzeżenie: strona ze zdjęciami zastępczymi działa,
  // tylko pokazuje cudzy apartament. Klient, który nie wgrał swoich, zobaczy
  // to sam — a alarm powtarzany co tydzień przy każdej takiej stronie
  // przestałby być czytany razem z resztą raportu (zasada Z4).
  if (s.stronyZeZdjeciamiZastepczymi.length > 0) {
    z.push({
      waga: 'info',
      tytul: 'Strony ze zdjęciami zastępczymi',
      szczegol: `${s.stronyZeZdjeciamiZastepczymi.join(', ')} — w galerii stoją zdjęcia z Unsplasha wstawione przy generowaniu. Właściciel podmienia je w panelu, zakładka Galeria.`,
    })
  }

  for (const w of s.wygasajaceSubskrypcje) {
    z.push({
      waga: w.dni <= 14 ? 'ostrzezenie' : 'info',
      tytul: `Subskrypcja wygasa: ${w.slug}`,
      szczegol: `Zostało ${w.dni} dni.`,
    })
  }

  return z
}

/** Czy raport zasługuje na maila, czy wystarczy wpis w logu. */
export function wymagaUwagi(znaleziska: Znalezisko[]): boolean {
  return znaleziska.some(z => z.waga !== 'info')
}

/**
 * Odmiana rzeczownika przez liczbę: 1 problem, 2 problemy, 5 problemów.
 * Temat maila czytany jest codziennie — „1 rzecz(y)" kłuje w oczy.
 */
export function odmien(n: number, formy: [jeden: string, malo: string, duzo: string]): string {
  if (n === 1) return formy[0]
  const dziesiatki = n % 100
  const jednosci = n % 10
  if (jednosci >= 2 && jednosci <= 4 && (dziesiatki < 12 || dziesiatki > 14)) return formy[1]
  return formy[2]
}

/** Temat maila z raportem. */
export function tematRaportu(znaleziska: Znalezisko[]): string {
  const krytyczne = znaleziska.filter(z => z.waga === 'krytyczne').length
  if (krytyczne > 0) {
    return `Nobooking: ${krytyczne} ${odmien(krytyczne, ['problem krytyczny', 'problemy krytyczne', 'problemów krytycznych'])}`
  }
  const n = znaleziska.length
  return `Nobooking: ${n} ${odmien(n, ['rzecz do sprawdzenia', 'rzeczy do sprawdzenia', 'rzeczy do sprawdzenia'])}`
}

export function raportHtml(znaleziska: Znalezisko[], data: string): string {
  if (znaleziska.length === 0) {
    return `<p>Raport z ${data}: nic nie wymaga uwagi.</p>`
  }
  const kolor: Record<Waga, string> = {
    krytyczne: '#b3261e',
    ostrzezenie: '#8a6100',
    info: '#4a4a4a',
  }
  const etykieta: Record<Waga, string> = {
    krytyczne: 'KRYTYCZNE',
    ostrzezenie: 'OSTRZEŻENIE',
    info: 'INFO',
  }
  const wiersze = znaleziska
    .map(z => `
      <tr>
        <td style="padding:8px 12px;color:${kolor[z.waga]};font-weight:600;white-space:nowrap;vertical-align:top">${etykieta[z.waga]}</td>
        <td style="padding:8px 12px">
          <div style="font-weight:600">${z.tytul}</div>
          <div style="color:#555;font-size:14px">${z.szczegol}</div>
        </td>
      </tr>`)
    .join('')

  return `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:640px">
      <h2 style="margin:0 0 4px">Stan systemu — ${data}</h2>
      <p style="margin:0 0 16px;color:#666">Znalezisk: ${znaleziska.length}</p>
      <table style="border-collapse:collapse;width:100%">${wiersze}</table>
    </div>`
}
