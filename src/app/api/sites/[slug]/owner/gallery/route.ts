import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { verifyOwnerSession } from '@/lib/ownerAuth'
import { sprawdzGalerie, sprawdzWideo, MAX_ZDJEC, MAX_WIDEO, MIN_ZDJEC } from '@/lib/galeria'
import { parsujConfig } from '@/lib/configMerge'

interface Params {
  params: Promise<{ slug: string }>
}

/**
 * Galeria właściciela — zdjęcia i filmy.
 *
 * Bez bramki planu: galeria jest w pakiecie Basic (`docs/PAKIET-BASIC.md` §9),
 * a nowy klient dostaje stronę ze zdjęciami zastępczymi z Unsplasha. Bez tej
 * trasy nie miał jak ich zmienić, więc „galeria zdjęć i wideo" była w ofercie
 * czymś, co obsługiwałem ręcznie w bazie.
 *
 * Zapisujemy do `sites.config.photos` i `sites.config.videos` — obie gałęzie są
 * na liście `POLA_WLASCICIELA`, więc regeneracja strony ich nie cofnie.
 */

export async function GET(request: NextRequest, { params }: Params) {
  const { slug } = await params
  const site = await verifyOwnerSession(slug, request.headers.get('cookie'))
  if (!site) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const config = parsujConfig(site.config) ?? {}
  const photos = Array.isArray(config.photos) ? config.photos : []
  const videos = Array.isArray(config.videos) ? config.videos : []

  return NextResponse.json({
    photos,
    videos,
    limity: { maxZdjec: MAX_ZDJEC, minZdjec: MIN_ZDJEC, maxWideo: MAX_WIDEO },
  })
}

/**
 * PUT — podmiana całej galerii. Body: `{ photos: [...], videos?: [...] }`
 *
 * Całość, nie łatka: kolejność zdjęć jest treścią (pierwsze idzie w nagłówek
 * strony), a przesuwanie wpisów łatkami „dodaj/usuń/zamień" wymagałoby
 * identyfikatorów, których te wpisy nie mają.
 */
export async function PUT(request: NextRequest, { params }: Params) {
  const { slug } = await params
  const site = await verifyOwnerSession(slug, request.headers.get('cookie'))
  if (!site) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as { photos?: unknown; videos?: unknown }

  // `pozwolMalo` dopiero przy pustej liście nie przechodzi: właściciel zwykle
  // kasuje zastępcze przed wklejeniem swoich i zapisuje po drodze. Minimum
  // pilnuje interfejs, który o tym mówi, zamiast odbijać zapis.
  const zdjecia = sprawdzGalerie(body.photos, { pozwolMalo: true })
  if (!zdjecia.ok) {
    return NextResponse.json({ error: zdjecia.blad, pozycja: zdjecia.pozycja }, { status: 400 })
  }

  const wideo = sprawdzWideo(body.videos ?? [])
  if (!wideo.ok) {
    return NextResponse.json({ error: wideo.blad, pozycja: wideo.pozycja }, { status: 400 })
  }

  const config = parsujConfig(site.config) ?? {}

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('sites')
    .update({ config: { ...config, photos: zdjecia.zdjecia, videos: wideo.wideo } })
    .eq('id', site.id)

  if (error) {
    console.error('[gallery] update error:', error)
    return NextResponse.json({ error: 'db_error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, photos: zdjecia.zdjecia, videos: wideo.wideo })
}
