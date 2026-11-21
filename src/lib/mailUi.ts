import { adresSerwisu } from '@/lib/adresSerwisu'

/**
 * Klocki maili w stylu iOS (2026-11-21) — ten sam język co strona: szare tło,
 * biała karta, listy jak w Ustawieniach i płytki ikon.
 *
 * Maile to osobny świat: tylko style inline, układ na tabelach, zero SVG
 * (Gmail i Outlook go nie pokażą). Ikony to PNG z `public/mail/`, generowane
 * przez `scripts/ikony-maili.mjs` — nową dopisz tam i uruchom skrypt.
 */

export type IkonaMaila =
  | 'dom' | 'panel' | 'platnosci' | 'poprawki' | 'pro' | 'kalendarz' | 'formularz'
  | 'gosc' | 'opinia' | 'anulowanie' | 'checkin' | 'klucz' | 'koperta' | 'zegar'
  | 'kwota' | 'noc' | 'zamowienie' | 'lupa'

const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
const INK = '#1D1D1F'
const MUTED = '#6E6E73'
const GROUP = '#F2F4F3'
const LINIA = '#E5E5EA'
const EMERALD = '#059669'

export function ikona(nazwa: IkonaMaila, rozmiar = 36): string {
  return `<img src="${adresSerwisu()}/mail/${nazwa}.png" width="${rozmiar}" height="${rozmiar}" alt="" style="display:block;border:0;outline:none;width:${rozmiar}px;height:${rozmiar}px;border-radius:${Math.round(rozmiar * 0.24)}px;">`
}

/** Pełny dokument maila. `tytul` to duży nagłówek w karcie, `podglad` — tekst w podglądzie skrzynki. */
export function szkielet({ tytul, ikonaTytulu, podglad, tresc }: {
  tytul: string
  ikonaTytulu?: IkonaMaila
  podglad?: string
  tresc: string
}): string {
  const strona = adresSerwisu()
  return `<!doctype html>
<html lang="pl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>${tytul}</title></head>
<body style="margin:0;padding:0;background:${GROUP};">
${podglad ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${podglad}</div>` : ''}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${GROUP};">
<tr><td align="center" style="padding:32px 12px 40px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;font-family:${FONT};color:${INK};">
    <tr><td style="padding:0 8px 18px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="padding-right:10px;">${ikona('dom', 28)}</td>
        <td style="font-size:18px;font-weight:700;letter-spacing:-0.02em;color:${INK};">Nobooking</td>
      </tr></table>
    </td></tr>
    <tr><td style="background:#FFFFFF;border-radius:24px;padding:32px 28px;">
      ${ikonaTytulu ? `<div style="margin:0 0 18px;">${ikona(ikonaTytulu, 52)}</div>` : ''}
      <h1 style="margin:0 0 18px;font-size:28px;line-height:1.15;letter-spacing:-0.03em;font-weight:700;color:${INK};">${tytul}</h1>
      ${tresc}
    </td></tr>
    <tr><td style="padding:20px 8px 0;font-size:12px;line-height:1.6;color:${MUTED};text-align:center;">
      Nobooking · własne strony rezerwacyjne dla apartamentów wakacyjnych<br>
      <a href="mailto:kontakt@nobooking.eu" style="color:${MUTED};text-decoration:none;">kontakt@nobooking.eu</a>
      &nbsp;·&nbsp;
      <a href="${strona}" style="color:${MUTED};text-decoration:none;">nobooking.eu</a>
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`
}

export function akapit(html: string, opcje: { maly?: boolean; wyciszony?: boolean } = {}): string {
  const rozmiar = opcje.maly ? 14 : 16
  return `<p style="margin:0 0 16px;font-size:${rozmiar}px;line-height:1.6;color:${opcje.wyciszony ? MUTED : INK};">${html}</p>`
}

export function przycisk(href: string, tekst: string, wariant: 'glowny' | 'ciemny' | 'szary' = 'glowny'): string {
  // „szary” to biały przycisk z obwódką — żeby był widoczny też na szarej karcie `grupa`.
  const tlo = wariant === 'glowny' ? EMERALD : wariant === 'ciemny' ? INK : '#FFFFFF'
  const kolor = wariant === 'szary' ? INK : '#FFFFFF'
  const obwodka = wariant === 'szary' ? `border:1px solid ${LINIA};` : ''
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 20px;"><tr>
    <td style="background:${tlo};border-radius:14px;${obwodka}">
      <a href="${href}" style="display:inline-block;padding:14px 24px;font-size:16px;font-weight:600;color:${kolor};text-decoration:none;border-radius:14px;">${tekst}</a>
    </td></tr></table>`
}

export type Wiersz = { ikona: IkonaMaila; tytul: string; opis?: string; tresc?: string }

/**
 * Grupa wierszy jak w Ustawieniach iOS: płytka ikony, tytuł, opis, opcjonalnie
 * dowolny HTML pod spodem (np. przycisk). Szara karta, wiersze oddzielone linią.
 */
export function grupa(wiersze: Wiersz[], podpis?: string): string {
  const rzedy = wiersze.map((w, i) => `
    <tr><td style="padding:14px 16px;${i > 0 ? `border-top:1px solid ${LINIA};` : ''}">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td width="36" valign="top" style="padding-right:14px;">${ikona(w.ikona)}</td>
        <td valign="top">
          <div style="font-size:16px;font-weight:600;line-height:1.35;color:${INK};">${w.tytul}</div>
          ${w.opis ? `<div style="font-size:14px;line-height:1.5;color:${MUTED};margin-top:2px;">${w.opis}</div>` : ''}
          ${w.tresc ? `<div style="margin-top:10px;">${w.tresc}</div>` : ''}
        </td>
      </tr></table>
    </td></tr>`).join('')
  return `${podpis ? `<div style="font-size:13px;color:${MUTED};margin:8px 0 8px 16px;">${podpis}</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${GROUP};border-radius:16px;margin:0 0 20px;">${rzedy}</table>`
}

/** Tabela „etykieta — wartość” w szarej karcie (dane rezerwacji, zamówienia). */
export function dane(pary: [string, string][], podpis?: string): string {
  const rzedy = pary.map(([etykieta, wartosc], i) => `
    <tr>
      <td style="padding:11px 16px;font-size:14px;color:${MUTED};${i > 0 ? `border-top:1px solid ${LINIA};` : ''}width:42%;vertical-align:top;">${etykieta}</td>
      <td style="padding:11px 16px;font-size:15px;font-weight:600;color:${INK};${i > 0 ? `border-top:1px solid ${LINIA};` : ''}vertical-align:top;word-break:break-word;">${wartosc}</td>
    </tr>`).join('')
  return `${podpis ? `<div style="font-size:13px;color:${MUTED};margin:8px 0 8px 16px;">${podpis}</div>` : ''}
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${GROUP};border-radius:16px;margin:0 0 20px;">${rzedy}</table>`
}

/** Ciemna karta na rzeczy, które trzeba przepisać (np. hasło do panelu). */
export function ciemnaKarta(pary: [string, string][], dopisek?: string): string {
  const rzedy = pary.map(([etykieta, wartosc]) => `
    <tr>
      <td style="padding:6px 0;font-size:13px;color:#A1A1A6;width:40%;vertical-align:top;">${etykieta}</td>
      <td style="padding:6px 0;font-size:14px;color:#FFFFFF;vertical-align:top;word-break:break-all;">${wartosc}</td>
    </tr>`).join('')
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${INK};border-radius:16px;margin:0 0 20px;">
    <tr><td style="padding:18px 20px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${rzedy}</table>
      ${dopisek ? `<div style="font-size:12px;color:#A1A1A6;margin-top:12px;line-height:1.5;">${dopisek}</div>` : ''}
    </td></tr></table>`
}

export function link(href: string, tekst?: string): string {
  return `<a href="${href}" style="color:${EMERALD};font-weight:600;text-decoration:none;word-break:break-all;">${tekst ?? href}</a>`
}

export function cytat(html: string): string {
  return `<div style="background:${GROUP};border-radius:14px;padding:14px 16px;margin:0 0 20px;font-size:15px;line-height:1.6;color:${INK};">${html}</div>`
}

export function podpisMichal(): string {
  return `<div style="border-top:1px solid ${LINIA};margin-top:12px;padding-top:18px;font-size:15px;line-height:1.6;color:${INK};">
    W razie pytań po prostu odpowiedz na tego maila.<br><strong>Michał · Nobooking</strong></div>`
}
