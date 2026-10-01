/**
 * Powiadomienia SMS dla właściciela — czysta logika, bez sieci i bez bazy.
 *
 * SMS różni się od e-maila tym, że **kosztuje za sztukę**. Błąd w pętli albo
 * w limicie to nie niedogodność, tylko rachunek. Dlatego wszystko, co da się
 * policzyć bez sieci, liczy się tutaj i jest pokryte testami; wysyłka
 * (`src/lib/smsSend.ts`) dostaje gotowy, sprawdzony numer i gotową treść.
 *
 * Dostawca: Twilio — ten sam, którego od kwietnia 2026 używa Casa Sol
 * (`casa-sol/src/lib/sms.ts`), z polskim numerem nadawcy. Kształt modułu jest
 * niezależny od dostawcy: zmiana dotyka jednej funkcji w `smsSend.ts`.
 */

/** Ile SMS-ów dziennie na jedną stronę. Zabezpieczenie przed rachunkiem,
 *  nie przed nadużyciem: przy normalnym ruchu nikt tego nie dotknie. */
export const MAX_SMS_DZIENNIE = 30

/** Dłuższa treść to kolejna wiadomość i kolejna opłata. */
export const MAX_ZNAKOW = 160

/** Domyślny kraj dla numerów podanych bez prefiksu. */
const DOMYSLNY_PREFIKS = '48'

/** Długość polskiego numeru krajowego. Po niej poznajemy, że brakuje prefiksu. */
const DL_NUMERU_KRAJOWEGO = 9

export type BladNumeru = 'pusty' | 'za_krotki' | 'za_dlugi' | 'niedozwolone_znaki'

/**
 * Sprowadza numer do postaci `+48600123456`.
 *
 * Właściciele wpisują numery w formularzu ręcznie, więc trafiają się spacje,
 * myślniki, nawiasy, `00` zamiast `+` i numery bez prefiksu kraju.
 */
export function normalizujNumer(
  surowy: string | null | undefined,
): { ok: true; numer: string } | { ok: false; blad: BladNumeru } {
  const s = String(surowy ?? '').trim()
  if (s.length === 0) return { ok: false, blad: 'pusty' }

  // Litery w numerze telefonu zawsze oznaczają pomyłkę, nie zapis, który
  // dałoby się uratować.
  if (/[a-zA-Z]/.test(s)) return { ok: false, blad: 'niedozwolone_znaki' }

  let cyfry = s.replace(/[\s()\-.]/g, '')

  if (cyfry.startsWith('+')) {
    cyfry = cyfry.slice(1)
  } else if (cyfry.startsWith('00')) {
    cyfry = cyfry.slice(2)
  } else if (cyfry.length === DL_NUMERU_KRAJOWEGO) {
    // Numer krajowy bez prefiksu. Doklejamy tylko przy dokładnie takiej
    // długości — „48600123456" wpisane bez plusa to już numer z prefiksem
    // i drugie doklejenie dałoby „+4848600123456".
    cyfry = DOMYSLNY_PREFIKS + cyfry
  }

  if (!/^\d+$/.test(cyfry)) return { ok: false, blad: 'niedozwolone_znaki' }

  // Zakres z E.164: najkrótsze numery krajowe z prefiksem to 8 cyfr,
  // maksimum standardu to 15.
  if (cyfry.length < 8) return { ok: false, blad: 'za_krotki' }
  if (cyfry.length > 15) return { ok: false, blad: 'za_dlugi' }

  return { ok: true, numer: '+' + cyfry }
}

export interface RezerwacjaDoSms {
  guest_name: string
  check_in: string
  check_out: string
  total_price: number
  currency: string
}

/** Skraca tekst tak, żeby wiadomość zmieściła się w jednym SMS-ie. */
function przytnij(tekst: string, doIlu: number): string {
  const t = tekst.trim()
  return t.length <= doIlu ? t : t.slice(0, Math.max(0, doIlu - 1)).trimEnd() + '…'
}

/**
 * Treść powiadomienia o nowej rezerwacji.
 *
 * Bez polskich znaków diakrytycznych: operator liczy wiadomość z „ł" albo „ą"
 * w alfabecie UCS-2, gdzie limit spada ze 160 znaków do 70 — ta sama treść
 * kosztowałaby wtedy trzy razy więcej.
 */
export function trescRezerwacji(r: RezerwacjaDoSms, nazwaStrony: string): string {
  const kwota = `${Math.round(r.total_price)} ${r.currency.toUpperCase()}`
  const gosc = przytnij(bezOgonkow(r.guest_name), 28)
  const tresc = `Nowa rezerwacja: ${gosc}, ${r.check_in} - ${r.check_out}, ${kwota}. ${bezOgonkow(nazwaStrony)}`
  return przytnij(tresc, MAX_ZNAKOW)
}

/** Zamiana polskich znaków na odpowiedniki z alfabetu GSM. */
export function bezOgonkow(tekst: string): string {
  const mapa: Record<string, string> = {
    ą: 'a', ć: 'c', ę: 'e', ł: 'l', ń: 'n', ó: 'o', ś: 's', ź: 'z', ż: 'z',
    Ą: 'A', Ć: 'C', Ę: 'E', Ł: 'L', Ń: 'N', Ó: 'O', Ś: 'S', Ź: 'Z', Ż: 'Z',
  }
  return String(tekst ?? '').replace(/[ąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/g, (z) => mapa[z] ?? z)
}

/**
 * Czy wolno jeszcze wysłać SMS dzisiaj.
 *
 * `wyslanoDzis` to liczba udanych wysyłek z bieżącej doby dla tej strony.
 * Nieudane się nie liczą — właściciel nie ma za nie płacić limitem.
 */
export function mozeWyslac(wyslanoDzis: number): boolean {
  return wyslanoDzis < MAX_SMS_DZIENNIE
}

/**
 * Nadawca SMS-a — numer albo nazwa alfanumeryczna.
 *
 * Twilio przyjmuje w polu `From` dwie rzeczy i sprawdzic je mozna dopiero przy
 * wysylce, osobno dla kazdej wiadomosci. Przy zlej wartosci kazdy SMS konczy
 * sie bledem, a wlasciciel widzi to tak samo jak brak rezerwacji: cisza.
 * Dlatego sprawdzamy sam nadawce z gory — raport stanu systemu robi to raz
 * na dobe, bez wysylania czegokolwiek.
 *
 * Zasady z dokumentacji Twilio (alphanumeric sender ID):
 * - do 11 znakow, litery, cyfry i spacja, co najmniej jedna litera;
 * - same cyfry bez `+` nie sa poprawnym nadawca — Twilio potraktuje je jak
 *   nazwe i operator podmieni je na „unknown" albo zablokuje wiadomosc;
 * - w Polsce nazwy generyczne („SMS", „Info") bywaja filtrowane przez
 *   operatorow, wiec nadawca powinien byc marka.
 *
 * Nazwa alfanumeryczna dziala **tylko w jedna strone** — odbiorca nie
 * odpowie. Dla powiadomien wlasciciela o rezerwacji to bez znaczenia.
 */
export type Nadawca =
  | { ok: true; rodzaj: 'numer' | 'nazwa'; wartosc: string }
  | { ok: false; blad: 'pusty' | 'zly_numer' | 'za_dlugi' | 'same_cyfry' | 'zle_znaki' }

/** Maksymalna dlugosc nazwy alfanumerycznej u Twilio. */
export const MAX_DL_NADAWCY = 11

export function sprawdzNadawce(surowy: string | null | undefined): Nadawca {
  const v = String(surowy ?? '').trim()
  if (!v) return { ok: false, blad: 'pusty' }

  if (v.startsWith('+')) {
    // E.164: plus i od 8 do 15 cyfr.
    return /^\+[1-9]\d{7,14}$/.test(v)
      ? { ok: true, rodzaj: 'numer', wartosc: v }
      : { ok: false, blad: 'zly_numer' }
  }

  // Sam ciag cyfr to najczestsza pomylka: numer wklejony bez plusa.
  if (/^\d+$/.test(v)) return { ok: false, blad: 'same_cyfry' }

  if (v.length > MAX_DL_NADAWCY) return { ok: false, blad: 'za_dlugi' }
  if (!/^[A-Za-z0-9 ]+$/.test(v)) return { ok: false, blad: 'zle_znaki' }
  if (!/[A-Za-z]/.test(v)) return { ok: false, blad: 'zle_znaki' }

  return { ok: true, rodzaj: 'nazwa', wartosc: v }
}
