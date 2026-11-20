#!/usr/bin/env node
/**
 * Odtworzenie kopii zapasowej: plik JSON z `app-data/backups` → SQL.
 *
 * Uruchomienie:
 *   node scripts/odtworz-kopie.mjs nobooking_backup_2026-11-21.json > odtworzenie.sql
 *   psql "$ADRES_BAZY" -f odtworzenie.sql      # albo wklejenie do edytora SQL Supabase
 *
 * Baza docelowa musi mieć schemat — migracje z `docs/supabase`. Skrypt tylko
 * wstawia dane, w kolejności tabel z pliku (zapisanej po kluczach obcych,
 * `src/lib/kopiaZapasowa.ts`), w jednej transakcji, z `on conflict do nothing`:
 * odtworzenie do bazy, w której część danych przetrwała, niczego nie nadpisze.
 *
 * Kopie sprzed 2026-11-20 (wersja 1) są niepełne — `sites` miało tam tylko
 * `id, slug` — i skrypt ich nie przyjmie.
 *
 * Sprawdzone odtworzeniem do lokalnego Postgresa: `docs/TECHNICZNA-DOKUMENTACJA.md`,
 * sekcja o kopii zapasowej.
 */
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

function ident(nazwa) {
  if (!/^[a-z_]+$/.test(nazwa)) throw new Error(`nieprawidłowa nazwa tabeli: ${nazwa}`)
  return `public.${nazwa}`
}

/** Ogranicznik dolarowy, który na pewno nie występuje w danych. */
function ogranicznik(tekst) {
  let n = 0
  while (tekst.includes(`$kopia${n}$`)) n++
  return `$kopia${n}$`
}

/**
 * Typy kolumn rozstrzyga baza (`jsonb_populate_recordset` z typem tabeli),
 * nie skrypt — dzięki temu daty, uuid, jsonb i tablice wracają bez tłumaczenia.
 */
export function sqlOdtworzenia(plik) {
  if (plik?.wersja !== 2 || typeof plik.tabele !== 'object' || plik.tabele === null) {
    throw new Error('To nie jest kopia w wersji 2 (pełna, od 2026-11-20). Starsze kopie są niepełne.')
  }
  const linie = ['begin;']
  for (const [tabela, wiersze] of Object.entries(plik.tabele)) {
    if (!Array.isArray(wiersze) || wiersze.length === 0) continue
    const json = JSON.stringify(wiersze)
    const d = ogranicznik(json)
    linie.push(
      `insert into ${ident(tabela)} select * from jsonb_populate_recordset(null::${ident(tabela)}, ${d}${json}${d}::jsonb) on conflict do nothing;`,
    )
  }
  linie.push('commit;')
  return linie.join('\n') + '\n'
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const sciezka = process.argv[2]
  if (!sciezka) {
    console.error('Użycie: node scripts/odtworz-kopie.mjs <plik-kopii.json> > odtworzenie.sql')
    process.exit(1)
  }
  const plik = JSON.parse(fs.readFileSync(sciezka, 'utf8'))
  process.stdout.write(sqlOdtworzenia(plik))
  console.error(`Tabele: ${Object.entries(plik.liczby ?? {}).map(([t, n]) => `${t}=${n}`).join(', ')}`)
}
