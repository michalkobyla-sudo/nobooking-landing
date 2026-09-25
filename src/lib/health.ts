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
  /** Rezerwacje `pending` starsze niż 3 h — cron sprzątający powinien je anulować. */
  rezerwacjePendingStare: number
  /** Aktywne strony bez ukończonego Stripe Connect — nie przyjmą płatności. */
  stronyBezStripe: string[]
  /** Strony z datą wygaśnięcia w ciągu 60 dni. */
  wygasajaceSubskrypcje: Array<{ slug: string; dni: number }>
  /** Zdarzenia Stripe zapisane w ostatnich 7 dniach. */
  zdarzeniaStripe7dni: number
  /** Rezerwacje utworzone w ostatnich 7 dniach. */
  rezerwacje7dni: number
  /** Kolumny lub tabele, których zabrakło przy sprawdzeniu schematu. */
  brakiSchematu: string[]
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
