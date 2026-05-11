/**
 * FontManager — loads and caches opentype.js fonts.
 *
 * Font files are served from jsDelivr (GitHub CDN mirror of google/fonts).
 * Only fonts whose static TTF files are confirmed present in the repo are listed.
 * Inter is intentionally omitted — it is variable-only; use Montserrat instead.
 */
import * as opentype from 'opentype.js'

export interface FontInfo {
  id:       string
  name:     string
  category: 'sans-serif' | 'serif' | 'script' | 'display' | 'monospace'
  url:      string
}

const BASE = 'https://cdn.jsdelivr.net/gh/google/fonts@main'

export const BUILTIN_FONTS: FontInfo[] = [
  {
    id: 'montserrat', name: 'Montserrat', category: 'sans-serif',
    url: `${BASE}/ofl/montserrat/static/Montserrat-Regular.ttf`,
  },
  {
    id: 'roboto', name: 'Roboto', category: 'sans-serif',
    url: `${BASE}/apache/roboto/static/Roboto-Regular.ttf`,
  },
  {
    id: 'oswald', name: 'Oswald', category: 'display',
    url: `${BASE}/ofl/oswald/static/Oswald-Regular.ttf`,
  },
  {
    id: 'playfair', name: 'Playfair Display', category: 'serif',
    url: `${BASE}/ofl/playfairdisplay/static/PlayfairDisplay-Regular.ttf`,
  },
  {
    id: 'dancing', name: 'Dancing Script', category: 'script',
    url: `${BASE}/ofl/dancingscript/static/DancingScript-Regular.ttf`,
  },
  {
    id: 'lobster', name: 'Lobster', category: 'display',
    url: `${BASE}/ofl/lobster/Lobster-Regular.ttf`,
  },
  {
    id: 'pacifico', name: 'Pacifico', category: 'script',
    url: `${BASE}/ofl/pacifico/Pacifico-Regular.ttf`,
  },
  {
    id: 'opensans', name: 'Open Sans', category: 'sans-serif',
    url: `${BASE}/apache/opensans/static/OpenSans-Regular.ttf`,
  },
]

export const DEFAULT_FONT_ID = 'montserrat'

export type OTFont = opentype.Font

const LOAD_TIMEOUT_MS = 12_000

class FontManagerClass {
  private loaded  = new Map<string, OTFont>()
  private pending = new Map<string, Promise<OTFont>>()

  getUrl(fontId: string): string | null {
    return BUILTIN_FONTS.find(f => f.id === fontId)?.url ?? null
  }

  /** Load a font by built-in ID or direct URL. Caches results. Throws on failure. */
  async load(fontIdOrUrl: string): Promise<OTFont> {
    const url = this.getUrl(fontIdOrUrl) ?? fontIdOrUrl

    if (this.loaded.has(url)) {
      return this.loaded.get(url)!
    }

    if (!this.pending.has(url)) {
      console.log(`[TEXT] Loading font from: ${url}`)

      const promise = new Promise<OTFont>((resolve, reject) => {
        // Timeout guard — if XHR stalls we reject rather than hang forever
        const timer = setTimeout(() => {
          reject(new Error(`[TEXT] Font load timeout (${LOAD_TIMEOUT_MS}ms): ${url}`))
        }, LOAD_TIMEOUT_MS)

        opentype.load(url, (err, font) => {
          clearTimeout(timer)
          if (err || !font) {
            const msg = `[TEXT] Font load failed: ${url} — ${err}`
            console.error(msg)
            reject(new Error(msg))
          } else {
            console.log(`[TEXT] Font loaded OK: ${fontIdOrUrl} (${font.names.fullName?.en ?? ''})`)
            this.loaded.set(url, font)
            resolve(font)
          }
        })
      })

      this.pending.set(url, promise)
      // On failure remove the pending entry so a retry is possible
      promise.catch(() => this.pending.delete(url))
    }

    return this.pending.get(url)!
  }

  /** Non-blocking: return cached font or null, kick off load as side-effect. */
  getOrLoad(fontId: string, onLoad?: () => void): OTFont | null {
    const url = this.getUrl(fontId) ?? fontId
    if (this.loaded.has(url)) return this.loaded.get(url)!

    this.load(fontId)
      .then(() => onLoad?.())
      .catch(() => { /* handled in load() */ })

    return null
  }

  isLoaded(fontId: string): boolean {
    const url = this.getUrl(fontId) ?? fontId
    return this.loaded.has(url)
  }

  /** Pixel font-size to achieve a given cap height in mm. */
  fontSizePxForMm(fontId: string, capHeightMm: number, pxPerMm: number): number {
    const url  = this.getUrl(fontId) ?? fontId
    const font = this.loaded.get(url)
    if (!font) return capHeightMm * pxPerMm * 1.4   // rough estimate pre-load

    const upm  = font.unitsPerEm
    // Prefer OS/2 capHeight; fall back to 70% of ascender
    const capH: number =
      (font.tables as Record<string, Record<string, number>>)
        .os2?.sCapHeight ?? (font.ascender * 0.7)

    if (!capH || capH <= 0) return capHeightMm * pxPerMm * 1.4
    return (capHeightMm * pxPerMm * upm) / capH
  }
}

export const FontManager = new FontManagerClass()
