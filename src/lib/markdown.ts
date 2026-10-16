/**
 * Minimalny renderer Markdown — tylko to, co występuje w dokumentach prawnych.
 *
 * **Dlaczego nie biblioteka.** Projekt ma osiem zależności produkcyjnych i to
 * jest zaleta, nie przypadek. Dokładanie parsera Markdown dla dwóch stron
 * statycznych kosztowałoby więcej niż ten plik — a składnia jest zamknięta,
 * bo źródłem są dwa pliki w `docs/`, które sami piszemy.
 *
 * **Dlaczego w ogóle renderujemy z pliku, zamiast przepisać treść do JSX.**
 * Regulamin i polityka prywatności mają jedno źródło: `docs/PRAWNE-*.md`.
 * To ten sam plik, który czyta prawnik i który wersjonuje git. Druga kopia
 * w komponencie rozjechałaby się przy pierwszej poprawce — a rozjazd między
 * dokumentem zatwierdzonym a opublikowanym jest gorszy niż brak strony.
 * Tę samą pułapkę mieliśmy w tym tygodniu przy sezonach i przy cenach.
 *
 * Obsługiwane: nagłówki, akapity, pogrubienie, kod, odnośniki, listy, tabele,
 * cytaty blokowe i linia pozioma. Czego nie ma — obrazków, list zagnieżdżonych,
 * kursywy — nie ma też w źródłach.
 */

/** Zamiana znaków, które inaczej zostałyby wzięte za znaczniki. */
function escapuj(t: string): string {
  return t
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** Formatowanie w obrębie wiersza. Kolejność ma znaczenie: kod przed resztą,
 *  żeby gwiazdka w przykładzie kodu nie stała się pogrubieniem. */
function wWierszu(t: string): string {
  return escapuj(t)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" rel="noopener noreferrer">$1</a>')
}

function wierszTabeli(linia: string): string[] {
  return linia.replace(/^\||\|$/g, '').split('|').map(k => k.trim())
}

const ROZDZIELACZ = /^\|?[\s:|-]+\|[\s:|-]+$/

export function markdownNaHtml(zrodlo: string): string {
  const linie = zrodlo.split('\n')
  const out: string[] = []
  let i = 0

  while (i < linie.length) {
    const l = linie[i]

    // Pusty wiersz — nic nie wnosi, akapity rozdzielamy same.
    if (!l.trim()) { i++; continue }

    // Linia pozioma
    if (/^---+$/.test(l.trim())) { out.push('<hr />'); i++; continue }

    // Nagłówki
    const nag = l.match(/^(#{1,4})\s+(.*)$/)
    if (nag) {
      const p = nag[1].length
      out.push(`<h${p}>${wWierszu(nag[2])}</h${p}>`)
      i++; continue
    }

    // Tabela: wiersz nagłówka, rozdzielacz, potem wiersze
    if (l.includes('|') && ROZDZIELACZ.test(linie[i + 1] ?? '')) {
      const naglowki = wierszTabeli(l)
      i += 2
      const wiersze: string[][] = []
      while (i < linie.length && linie[i].includes('|')) {
        wiersze.push(wierszTabeli(linie[i])); i++
      }
      out.push(
        '<table><thead><tr>' +
        naglowki.map(k => `<th>${wWierszu(k)}</th>`).join('') +
        '</tr></thead><tbody>' +
        wiersze.map(w => '<tr>' + w.map(k => `<td>${wWierszu(k)}</td>`).join('') + '</tr>').join('') +
        '</tbody></table>',
      )
      continue
    }

    // Cytat blokowy — sklejamy kolejne wiersze zaczynające się od >
    if (l.startsWith('>')) {
      const tresc: string[] = []
      while (i < linie.length && linie[i].startsWith('>')) {
        tresc.push(linie[i].replace(/^>\s?/, '')); i++
      }
      out.push(`<blockquote>${markdownNaHtml(tresc.join('\n'))}</blockquote>`)
      continue
    }

    // Lista punktowana albo numerowana
    const punkt = l.match(/^(\s*)([-*]|\d+\.)\s+(.*)$/)
    if (punkt) {
      const numerowana = /\d/.test(punkt[2])
      const pozycje: string[] = []
      while (i < linie.length) {
        const m = linie[i].match(/^(\s*)([-*]|\d+\.)\s+(.*)$/)
        if (!m) {
          // Kontynuacja pozycji: wcięty wiersz bez znacznika.
          if (pozycje.length && /^\s+\S/.test(linie[i])) {
            pozycje[pozycje.length - 1] += ' ' + wWierszu(linie[i].trim()); i++; continue
          }
          break
        }
        pozycje.push(wWierszu(m[3])); i++
      }
      const t = numerowana ? 'ol' : 'ul'
      out.push(`<${t}>${pozycje.map(p => `<li>${p}</li>`).join('')}</${t}>`)
      continue
    }

    // Akapit — zbieramy do pustego wiersza
    const akapit: string[] = []
    while (i < linie.length && linie[i].trim() && !/^(#{1,4}\s|>|---+$)/.test(linie[i]) && !linie[i].match(/^(\s*)([-*]|\d+\.)\s+/)) {
      akapit.push(linie[i].trim()); i++
    }
    if (akapit.length) out.push(`<p>${wWierszu(akapit.join(' '))}</p>`)
  }

  return out.join('\n')
}
