export const PRICES = {
  basic: { pln: 79900, eur: 19900 },
  pro:   { pln: 119900, eur: 29900 },
} as const

export const PRICE_LABELS = {
  basic: { pln: '799 zł', eur: '199 €' },
  pro:   { pln: '1 199 zł', eur: '299 €' },
} as const

export const PLAN_NAMES = {
  basic: 'Nobooking Basic (2 lata)',
  pro:   'Nobooking Pro (2 lata)',
} as const

/**
 * Ceny odnowienia na kolejne 2 lata.
 *
 * **Osobne od cen zakupu.** Do 2026-10-05 provisioning zapisywał w
 * `sites.renewal_price_*` pełną cenę zakupu, więc właściciel Basic miał odnowić
 * za 799 zł — przy stronie sprzedażowej obiecującej „pakiet odnowieniowy od
 * 299 zł". Panel i maile pokazywały 799 zł i nazywały tę kwotę „zablokowaną
 * ceną", czyli sprzeczność wychodziła dopiero właścicielowi, przy płaceniu.
 *
 * Pierwsze odnowienie wypada w maju 2028, więc nikogo to jeszcze nie dotknęło.
 *
 * Cena jest zamrażana przy zakupie (kopiowana do `sites`), więc zmiana tych
 * wartości dotyczy wyłącznie nowych klientów — stare strony zachowują to, co
 * im obiecano.
 */
export const RENEWAL_PRICES = {
  basic: { pln: 29900, eur: 9900 },
  pro:   { pln: 44900, eur: 14900 },
} as const

export const RENEWAL_LABELS = {
  basic: { pln: '299 zł', eur: '99 €' },
  pro:   { pln: '449 zł', eur: '149 €' },
} as const
