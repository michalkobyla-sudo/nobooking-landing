import fs from 'fs'
import path from 'path'

/**
 * Tabele, do których kod faktycznie sięga (wywołania `.from` z nazwą tabeli), z plikami.
 * Wspólne dla testów pilnujących schematu (`schematWymagany.test.ts`) i zakresu
 * kopii (`kopiaZapasowa.test.ts`) — jedna reguła wykrywania, nie dwie kopie.
 * Tylko dla testów: czyta pliki z dysku.
 */
export function tabeleWKodzie(korzen: string): Map<string, string[]> {
  const mapa = new Map<string, string[]>()
  const chodz = (katalog: string) => {
    for (const w of fs.readdirSync(katalog, { withFileTypes: true })) {
      const p = path.join(katalog, w.name)
      if (w.isDirectory()) { chodz(p); continue }
      if (!/\.tsx?$/.test(w.name) || /\.test\.tsx?$/.test(w.name)) continue
      for (const m of fs.readFileSync(p, 'utf8').matchAll(/\.from\(\s*'([a-z_]+)'\s*\)/g)) {
        const gdzie = path.relative(korzen, p)
        const lista = mapa.get(m[1]) ?? []
        if (!lista.includes(gdzie)) lista.push(gdzie)
        mapa.set(m[1], lista)
      }
    }
  }
  chodz(korzen)
  return mapa
}
