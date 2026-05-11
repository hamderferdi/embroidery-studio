/**
 * FontManager — loads and caches opentype.js fonts.
 *
 * Fonts are bundled locally in /public/fonts/ so they load instantly without
 * any CDN dependency. All 8 TTF files must exist at those paths.
 *
 * Fallback chain: requested font → DEFAULT_FONT_ID → throws
 * This means the text tool never fails completely due to a missing font.
 */
import * as opentype from 'opentype.js'

export interface FontInfo {
  id:       string
  name:     string
  category: 'sans-serif' | 'serif' | 'script' | 'display' | 'monospace'
  url:      string
}

export const BUILTIN_FONTS: FontInfo[] = [
  {
    id: 'montserrat', name: 'Montserrat', category: 'sans-serif',
    url: '/fonts/Montserrat-Regular.ttf',
  },
  {
    id: 'roboto', name: 'Roboto', category: 'sans-serif',
    url: '/fonts/Roboto-Regular.ttf',
  },
  {
    id: 'oswald', name: 'Oswald', category: 'display',
    url: '/fonts/Oswald-Regular.ttf',
  },
  {
    id: 'playfair', name: 'Playfair Display', category: 'serif',
    url: '/fonts/PlayfairDisplay-Regular.ttf',
  },
  {
    id: 'dancing', name: 'Dancing Script', category: 'script',
    url: '/fonts/DancingScript-Regular.ttf',
  },
  {
    id: 'lobster', name: 'Lobster', category: 'display',
    url: '/fonts/Lobster-Regular.ttf',
  },
  {
    id: 'pacifico', name: 'Pacifico', category: 'script',
    url: '/fonts/Pacifico-Regular.ttf',
  },
  {
    id: 'opensans', name: 'Open Sans', category: 'sans-serif',
    url: '/fonts/OpenSans-Regular.ttf',
  },
]

export const DEFAULT_FONT_ID = 'montserrat'

export type OTFont = opentype.Font

const LOAD_TIMEOUT_MS = 8_000

class FontManagerClass {
  private loaded  = new Map<string, OTFont>()
  private pending = new Map<string, Promise<OTFont>>()

  getUrl(fontId: string): string | null {
    return BUILTIN_FONTS.find(f => f.id === fontId)?.url ?? null
  }

  /**
   * Load a font by built-in ID or direct URL. Caches results.
   * On failure, automatically falls back to DEFAULT_FONT_ID before throwing.
   */
  async load(fontIdOrUrl: string): Promise<OTFont> {
    const url = this.getUrl(fontIdOrUrl) ?? fontIdOrUrl

    if (this.loaded.has(url)) {
      return this.loaded.get(url)!
    }

    if (!this.pending.has(url)) {
      console.log(`[FONT] Loading font: ${fontIdOrUrl} from ${url}`)

      const promise = (async () => {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), LOAD_TIMEOUT_MS)

        let res: Response
        try {
          res = await fetch(url, { signal: controller.signal })
        } catch (fetchErr) {
          clearTimeout(timer)
          throw new Error(`[FONT] Font fetch failed: ${fontIdOrUrl} (${url}) — ${fetchErr}`)
        }
        clearTimeout(timer)

        if (!res.ok) {
          throw new Error(`[FONT] Font fetch HTTP ${res.status}: ${fontIdOrUrl} (${url})`)
        }

        const buffer = await res.arrayBuffer()
        let font: OTFont
        try {
          font = opentype.parse(buffer)
        } catch (parseErr) {
          throw new Error(`[FONT] Font parse failed: ${fontIdOrUrl} (${url}) — ${parseErr}`)
        }

        console.log(`[FONT] Font loaded: ${fontIdOrUrl} (${font.names.fullName?.en ?? url})`)
        this.loaded.set(url, font)
        return font
      })()

      this.pending.set(url, promise)
      // Remove pending entry on failure so retries are possible
      promise.catch(() => this.pending.delete(url))
    }

    try {
      return await this.pending.get(url)!
    } catch (err) {
      // Fallback: if the requested font failed and it's not already the default,
      // try the default font so the text tool never breaks completely.
      const defaultUrl = this.getUrl(DEFAULT_FONT_ID)
      if (defaultUrl && url !== defaultUrl) {
        console.warn(`[FONT] Falling back to default font (${DEFAULT_FONT_ID}) after failure`)
        return this.load(DEFAULT_FONT_ID)
      }
      throw err
    }
  }

  /** Non-blocking: return cached font or null, kick off load as side-effect. */
  getOrLoad(fontId: string, onLoad?: () => void): OTFont | null {
    const url = this.getUrl(fontId) ?? fontId
    if (this.loaded.has(url)) return this.loaded.get(url)!

    this.load(fontId)
      .then(() => onLoad?.())
      .catch((err) => {
        console.warn(`[FONT] getOrLoad failed for ${fontId}:`, err)
      })

    return null
  }

  isLoaded(fontId: string): boolean {
    const url = this.getUrl(fontId) ?? fontId
    return this.loaded.has(url)
  }

  /**
   * Eagerly preload all built-in fonts in the background.
   * Call once at app startup so fonts are ready when the user picks the text tool.
   */
  preloadAll(): void {
    console.log('[FONT] Preloading all built-in fonts…')
    for (const font of BUILTIN_FONTS) {
      this.load(font.id).catch(() => {
        // Individual failures already logged inside load()
      })
    }
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

// Kick off background preload immediately so fonts are warm when needed
FontManager.preloadAll()
