/**
 * Kolory pochodne od koloru marki właściciela apartamentu (`config.theme.primary`).
 * Używane na stronie apartamentu i na stronie informacji dla gości.
 */

/** Względna luminancja koloru `#RGB`/`#RRGGBB` (WCAG); `null` dla innych zapisów. */
function luminancja(hex: string): number | null {
  const m = hex.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (!m) return null
  const h = m[1].length === 3 ? m[1].split('').map(c => c + c).join('') : m[1]
  const [r, g, b] = [0, 2, 4].map(i => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * Kolory pochodne od koloru właściciela. Właściciel wybiera dowolny kolor —
 * także jasny, na którym biały napis znika — więc tekst na przycisku i kolor
 * linków na białym tle liczymy z kontrastu, zamiast zakładać ciemny kolor.
 */
export function koloryMarki(primary: string) {
  const L = luminancja(primary)
  if (L === null) return { onPrimary: '#fff', link: primary }
  const kontrastBialy = 1.05 / (L + 0.05)
  const kontrastCzarny = (L + 0.05) / 0.05
  return {
    onPrimary: kontrastBialy >= kontrastCzarny ? '#fff' : '#1D1D1F',
    link: kontrastBialy >= 3 ? primary : '#1D1D1F',
  }
}
