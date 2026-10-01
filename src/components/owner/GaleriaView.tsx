'use client'

/**
 * Galeria w panelu właściciela.
 *
 * Przed tym ekranem właściciel nie miał jak zmienić zdjęć: nowa strona wstaje
 * z sześcioma zastępczymi z Unsplasha, a podmiana szła ręcznie w bazie.
 *
 * Trzy decyzje, które widać w kodzie:
 *
 * - **Adresy, nie wgrywanie.** Zdjęcia apartamentu i tak leżą w chmurze
 *   właściciela (link podaje już w onboardingu). Wgrywanie wymagałoby bucketu,
 *   limitów i obsługi błędów przesyłania — a dałoby to samo.
 * - **Podgląd sprawdza, czy adres żyje.** Zły link nie wywraca strony, tylko
 *   zostawia pusty kafelek, którego właściciel nigdy nie zauważy, bo własnej
 *   strony nie przegląda. Tutaj widzi to od razu, przed zapisem.
 * - **Zapis to podmiana całości.** Kolejność jest treścią — pierwsze zdjęcie
 *   idzie w nagłówek strony — a wpisy w configu nie mają identyfikatorów,
 *   więc łatki „dodaj/usuń" nie dałyby się przesuwać.
 */

import { useState, useEffect, useCallback } from 'react'
import { naOsadzenie, MAX_ZDJEC, MIN_ZDJEC, MAX_WIDEO, MAX_DL_TYTULU } from '@/lib/galeria'

const PRIMARY = '#1A5276'
const CARD_BD = '#E5E7EB'

/** Na telefonie wiersz lamie sie na dwa poziomy — adres zdjecia jest dlugi
 *  i w waskim polu obok miniatury widac z niego kilkanascie znakow. */
function useWaski(prog = 720) {
  const [waski, setWaski] = useState(false)
  useEffect(() => {
    const sprawdz = () => setWaski(window.innerWidth < prog)
    sprawdz()
    window.addEventListener('resize', sprawdz)
    return () => window.removeEventListener('resize', sprawdz)
  }, [prog])
  return waski
}

interface Zdjecie { url: string; alt: string }
interface WideoWpis { embedUrl: string; title: string; thumbnail: string }

/** Zdjęcia zastępcze z generatora. Właściciel ma prawo wiedzieć, że to nie jego. */
const ZASTEPCZE = 'images.unsplash.com'

const BLEDY: Record<string, string> = {
  brak_zdjec:      'Galeria nie może być pusta.',
  za_duzo_zdjec:   `Maksymalnie ${MAX_ZDJEC} zdjęć.`,
  zly_adres:       'Jeden z adresów nie jest pełnym linkiem https.',
  za_duzo_wideo:   `Maksymalnie ${MAX_WIDEO} filmów.`,
  zly_adres_wideo: 'To nie jest link do filmu na YouTube.',
  brak_tytulu:     'Każdy film musi mieć tytuł.',
  db_error:        'Nie udało się zapisać. Spróbuj ponownie.',
  unauthorized:    'Sesja wygasła. Zaloguj się ponownie.',
}

const pole = {
  border: `1px solid ${CARD_BD}`, borderRadius: 8, padding: '0.45rem 0.7rem',
  fontSize: '0.83rem', fontFamily: 'inherit', outline: 'none', width: '100%',
  boxSizing: 'border-box' as const, background: 'white',
}

const przycisk = {
  background: 'none', border: `1px solid ${CARD_BD}`, borderRadius: 6,
  width: 28, height: 28, fontSize: '0.8rem', cursor: 'pointer',
  fontFamily: 'inherit', color: '#374151', display: 'flex',
  alignItems: 'center', justifyContent: 'center', flexShrink: 0,
}

/** Miniatura, która mówi prawdę o adresie: ładuje się albo nie. */
function Miniatura({ url }: { url: string }) {
  const [stan, setStan] = useState<'laduje' | 'ok' | 'blad'>('laduje')

  useEffect(() => { setStan(url ? 'laduje' : 'blad') }, [url])

  const ramka = {
    width: 64, height: 48, borderRadius: 6, flexShrink: 0, overflow: 'hidden',
    border: `1px solid ${stan === 'blad' ? '#FCA5A5' : CARD_BD}`,
    background: stan === 'blad' ? '#FEF2F2' : '#F9FAFB',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }

  if (stan === 'blad') {
    return <div style={ramka} title="Ten adres się nie wczytuje"><span style={{ fontSize: '0.95rem', color: '#DC2626' }}>✕</span></div>
  }

  return (
    <div style={ramka}>
      {/* Zwykły <img>: to adres z dowolnej chmury właściciela, a next/image
          wymagałby wpisania każdego hosta do konfiguracji. */}
      <img
        src={url} alt="" onLoad={() => setStan('ok')} onError={() => setStan('blad')}
        style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: stan === 'ok' ? 1 : 0 }}
      />
    </div>
  )
}

export function GaleriaView({ slug }: { slug: string }) {
  const waski = useWaski()
  const [zdjecia, setZdjecia]   = useState<Zdjecie[]>([])
  const [wideo, setWideo]       = useState<WideoWpis[]>([])
  const [wczytane, setWczytane] = useState(false)
  const [zapisuje, setZapisuje] = useState(false)
  const [blad, setBlad]         = useState<string | null>(null)
  const [zapisano, setZapisano] = useState(false)

  const wczytaj = useCallback(async () => {
    try {
      const res = await fetch(`/api/sites/${slug}/owner/gallery`)
      if (res.ok) {
        const d = await res.json() as { photos: Zdjecie[]; videos: { embedUrl: string; title: { pl: string }; thumbnail?: string }[] }
        setZdjecia((d.photos ?? []).map(p => ({ url: p.url ?? '', alt: p.alt ?? '' })))
        setWideo((d.videos ?? []).map(v => ({
          embedUrl: v.embedUrl ?? '', title: v.title?.pl ?? '', thumbnail: v.thumbnail ?? '',
        })))
      }
    } catch { /* puste listy — formularz i tak działa */ }
    setWczytane(true)
  }, [slug])

  useEffect(() => { void wczytaj() }, [wczytaj])

  function zmien(i: number, co: Partial<Zdjecie>) {
    setZapisano(false)
    setZdjecia(z => z.map((x, j) => (j === i ? { ...x, ...co } : x)))
  }

  function przesun(i: number, o: number) {
    setZapisano(false)
    setZdjecia(z => {
      const cel = i + o
      if (cel < 0 || cel >= z.length) return z
      const kopia = [...z]
      ;[kopia[i], kopia[cel]] = [kopia[cel], kopia[i]]
      return kopia
    })
  }

  async function zapisz() {
    setBlad(null); setZapisano(false); setZapisuje(true)
    try {
      const res = await fetch(`/api/sites/${slug}/owner/gallery`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          photos: zdjecia.map(z => ({ url: z.url.trim(), alt: z.alt.trim() })),
          videos: wideo
            .filter(w => w.embedUrl.trim() !== '' || w.title.trim() !== '')
            .map(w => ({ embedUrl: w.embedUrl.trim(), title: w.title.trim(), thumbnail: w.thumbnail.trim() })),
        }),
      })
      const d = await res.json() as { error?: string; pozycja?: number }
      if (!res.ok) {
        const gdzie = d.pozycja !== undefined ? ` (pozycja ${d.pozycja + 1})` : ''
        setBlad((BLEDY[d.error ?? ''] ?? 'Nie udało się zapisać.') + gdzie)
        return
      }
      setZapisano(true)
    } catch {
      setBlad('Błąd połączenia. Spróbuj ponownie.')
    } finally {
      setZapisuje(false)
    }
  }

  const maZastepcze = zdjecia.some(z => z.url.includes(ZASTEPCZE))
  const zaMalo = zdjecia.length > 0 && zdjecia.length < MIN_ZDJEC

  if (!wczytane) {
    return <div style={{ color: '#9CA3AF', fontSize: '0.85rem', padding: '2rem 0' }}>Wczytywanie galerii…</div>
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: 880 }}>
      {/* ── Zdjęcia ─────────────────────────────────────────────── */}
      <section style={{ background: 'white', border: `1px solid ${CARD_BD}`, borderRadius: 12, padding: '1.25rem' }}>
        <h2 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 0.25rem', letterSpacing: '-0.01em' }}>Zdjęcia</h2>
        <p style={{ fontSize: '0.82rem', color: '#9CA3AF', margin: '0 0 1rem', lineHeight: 1.5 }}>
          Wklej adresy zdjęć ze swojej chmury (Dysk Google, Dropbox, iCloud — link do samego pliku,
          nie do folderu). Pierwsze zdjęcie jest tym dużym na górze strony.
          Opis jest czytany przez wyszukiwarki i przez czytniki ekranu.
        </p>

        {maZastepcze && (
          <div style={{ marginBottom: '1rem', padding: '0.6rem 0.8rem', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, fontSize: '0.8rem', color: '#92400E', lineHeight: 1.5 }}>
            Część zdjęć to zdjęcia zastępcze, które wstawiliśmy przy tworzeniu strony.
            Podmień je na zdjęcia swojego apartamentu.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {zdjecia.map((z, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: waski ? 'column' : 'row', gap: '0.6rem', alignItems: waski ? 'stretch' : 'center', padding: '0.5rem', border: `1px solid ${CARD_BD}`, borderRadius: 10, background: '#FCFCFD' }}>
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', order: waski ? 1 : 0 }}>
                <span style={{ width: 18, textAlign: 'center', fontSize: '0.75rem', color: '#9CA3AF', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>{i + 1}</span>
                <Miniatura url={z.url.trim()} />
                {waski && <span style={{ flex: 1 }} />}
                <div style={{ display: waski ? 'flex' : 'none', gap: '0.25rem' }}>
                  <button onClick={() => przesun(i, -1)} disabled={i === 0} title="W górę" style={{ ...przycisk, opacity: i === 0 ? 0.35 : 1 }}>↑</button>
                  <button onClick={() => przesun(i, 1)} disabled={i === zdjecia.length - 1} title="W dół" style={{ ...przycisk, opacity: i === zdjecia.length - 1 ? 0.35 : 1 }}>↓</button>
                  <button
                    onClick={() => { setZapisano(false); setZdjecia(lista => lista.filter((_, j) => j !== i)) }}
                    title="Usuń zdjęcie"
                    style={{ ...przycisk, borderColor: '#FECACA', color: '#DC2626' }}
                  >✕</button>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1, minWidth: 0, order: waski ? 2 : 0 }}>
                <input value={z.url} onChange={e => zmien(i, { url: e.target.value })} placeholder="https://…/salon.jpg" style={pole} />
                <input value={z.alt} onChange={e => zmien(i, { alt: e.target.value })} placeholder="Opis, np. Salon z widokiem na morze" style={{ ...pole, fontSize: '0.78rem', color: '#4B5563' }} />
              </div>

              {!waski && (
                <>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flexShrink: 0 }}>
                    <button onClick={() => przesun(i, -1)} disabled={i === 0} title="W górę" style={{ ...przycisk, height: 22, opacity: i === 0 ? 0.35 : 1 }}>↑</button>
                    <button onClick={() => przesun(i, 1)} disabled={i === zdjecia.length - 1} title="W dół" style={{ ...przycisk, height: 22, opacity: i === zdjecia.length - 1 ? 0.35 : 1 }}>↓</button>
                  </div>
                  <button
                    onClick={() => { setZapisano(false); setZdjecia(lista => lista.filter((_, j) => j !== i)) }}
                    title="Usuń zdjęcie"
                    style={{ ...przycisk, borderColor: '#FECACA', color: '#DC2626' }}
                  >✕</button>
                </>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={() => { setZapisano(false); setZdjecia(z => [...z, { url: '', alt: '' }]) }}
          disabled={zdjecia.length >= MAX_ZDJEC}
          style={{ marginTop: '0.75rem', background: 'none', border: `1px dashed ${CARD_BD}`, borderRadius: 8, padding: '0.5rem 0.9rem', fontSize: '0.82rem', fontWeight: 600, cursor: zdjecia.length >= MAX_ZDJEC ? 'default' : 'pointer', fontFamily: 'inherit', color: zdjecia.length >= MAX_ZDJEC ? '#9CA3AF' : PRIMARY }}
        >
          + Dodaj zdjęcie
        </button>
        <span style={{ marginLeft: '0.75rem', fontSize: '0.76rem', color: '#9CA3AF' }}>{zdjecia.length} / {MAX_ZDJEC}</span>

        {zaMalo && (
          <div style={{ marginTop: '0.75rem', fontSize: '0.8rem', color: '#92400E' }}>
            Przy mniej niż {MIN_ZDJEC} zdjęciach strona wygląda na niedokończoną. Zapis przejdzie, ale warto dodać więcej.
          </div>
        )}
      </section>

      {/* ── Wideo ───────────────────────────────────────────────── */}
      <section style={{ background: 'white', border: `1px solid ${CARD_BD}`, borderRadius: 12, padding: '1.25rem' }}>
        <h2 style={{ fontSize: '0.95rem', fontWeight: 800, margin: '0 0 0.25rem', letterSpacing: '-0.01em' }}>Wideo</h2>
        <p style={{ fontSize: '0.82rem', color: '#9CA3AF', margin: '0 0 1rem', lineHeight: 1.5 }}>
          Filmy z YouTube. Wklej adres z paska przeglądarki — zamienimy go na postać do osadzenia.
          Bez żadnego filmu sekcja wideo po prostu nie pojawia się na stronie.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {wideo.map((w, i) => {
            const osadzenie = naOsadzenie(w.embedUrl.trim())
            const zly = w.embedUrl.trim() !== '' && osadzenie === ''
            return (
              <div key={i} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', padding: '0.5rem', border: `1px solid ${zly ? '#FCA5A5' : CARD_BD}`, borderRadius: 10, background: '#FCFCFD' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1, minWidth: 0 }}>
                  <input
                    value={w.embedUrl}
                    onChange={e => { setZapisano(false); setWideo(l => l.map((x, j) => (j === i ? { ...x, embedUrl: e.target.value } : x))) }}
                    placeholder="https://www.youtube.com/watch?v=…"
                    style={pole}
                  />
                  <input
                    value={w.title}
                    onChange={e => { setZapisano(false); setWideo(l => l.map((x, j) => (j === i ? { ...x, title: e.target.value.slice(0, MAX_DL_TYTULU) } : x))) }}
                    placeholder="Tytuł, np. Spacer po apartamencie"
                    style={{ ...pole, fontSize: '0.78rem', color: '#4B5563' }}
                  />
                  {zly
                    ? <span style={{ fontSize: '0.74rem', color: '#B91C1C' }}>To nie jest link do filmu na YouTube.</span>
                    : osadzenie && <span style={{ fontSize: '0.74rem', color: '#9CA3AF', wordBreak: 'break-all' }}>Osadzimy jako {osadzenie}</span>}
                </div>
                <button
                  onClick={() => { setZapisano(false); setWideo(l => l.filter((_, j) => j !== i)) }}
                  title="Usuń film"
                  style={{ ...przycisk, borderColor: '#FECACA', color: '#DC2626' }}
                >✕</button>
              </div>
            )
          })}
        </div>

        <button
          onClick={() => { setZapisano(false); setWideo(l => [...l, { embedUrl: '', title: '', thumbnail: '' }]) }}
          disabled={wideo.length >= MAX_WIDEO}
          style={{ marginTop: '0.75rem', background: 'none', border: `1px dashed ${CARD_BD}`, borderRadius: 8, padding: '0.5rem 0.9rem', fontSize: '0.82rem', fontWeight: 600, cursor: wideo.length >= MAX_WIDEO ? 'default' : 'pointer', fontFamily: 'inherit', color: wideo.length >= MAX_WIDEO ? '#9CA3AF' : PRIMARY }}
        >
          + Dodaj film
        </button>
        <span style={{ marginLeft: '0.75rem', fontSize: '0.76rem', color: '#9CA3AF' }}>{wideo.length} / {MAX_WIDEO}</span>
      </section>

      {/* ── Zapis ───────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <button
          onClick={() => void zapisz()}
          disabled={zapisuje}
          style={{ background: PRIMARY, color: 'white', border: 'none', borderRadius: 8, padding: '0.6rem 1.4rem', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: zapisuje ? 0.7 : 1 }}
        >
          {zapisuje ? 'Zapisywanie…' : 'Zapisz galerię'}
        </button>
        {zapisano && <span style={{ fontSize: '0.82rem', color: '#047857', fontWeight: 600 }}>Zapisane. Zmiany są już na stronie.</span>}
        {blad && <span style={{ fontSize: '0.82rem', color: '#B91C1C' }}>{blad}</span>}
        <a href={`/sites/${slug}`} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 'auto', fontSize: '0.82rem', color: PRIMARY, fontWeight: 600, textDecoration: 'none' }}>
          Zobacz stronę →
        </a>
      </div>
    </div>
  )
}
