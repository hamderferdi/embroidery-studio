/**
 * TextLayout — positions characters in world space given a font, size, and options.
 *
 * Returns per-character layout items including world position and glyph contours.
 * Used both for stitch generation and for the PixiJS preview in TextEditLayer.
 */

import type { OTFont } from './FontManager'
import type { BezierPath } from '../types'
import { glyphContours, charAdvanceWidth, kerningPx } from './GlyphOutline'

export interface TextLayoutOptions {
  fontSizePx: number       // font-size in pixels (derived from mm cap height)
  trackingPx:  number      // extra space between letters in pixels (can be negative)
  alignment:   'left' | 'center' | 'right'
  lineHeightMultiplier: number  // 1.0 = tight (cap-height), 1.4 = comfortable
}

export interface LayoutChar {
  char:     string
  x:        number         // left edge in world px
  y:        number         // baseline in world px
  width:    number         // advance width in world px
  contours: BezierPath[]   // glyph outline contours at this position
  lineIndex: number
}

export interface LayoutLine {
  chars:  LayoutChar[]
  width:  number
  y:      number
}

export interface TextLayout {
  chars:   LayoutChar[]
  lines:   LayoutLine[]
  bounds:  { width: number; height: number }
}

/**
 * Layout text with the given font and options.
 *
 * @param text     The full string (newlines create new lines)
 * @param font     Loaded opentype.Font
 * @param opts     Layout options
 * @param originX  World-space X of text origin (left for 'left', center for 'center', etc.)
 * @param originY  World-space Y of first baseline
 */
export function layoutText(
  text: string,
  font: OTFont,
  opts: TextLayoutOptions,
  originX: number,
  originY: number,
): TextLayout {
  const { fontSizePx, trackingPx, lineHeightMultiplier } = opts

  const scale      = fontSizePx / font.unitsPerEm
  const lineHeight = fontSizePx * lineHeightMultiplier

  const rawLines  = text.split('\n')
  const allChars:  LayoutChar[] = []
  const allLines:  LayoutLine[] = []

  for (let li = 0; li < rawLines.length; li++) {
    const rawLine = rawLines[li]
    const baselineY = originY + li * lineHeight

    // First pass: compute char widths and total line width
    let lineWidth = 0
    const widths: number[] = []
    for (let ci = 0; ci < rawLine.length; ci++) {
      const ch   = rawLine[ci]
      let w = charAdvanceWidth(ch, font, fontSizePx)
      if (ci < rawLine.length - 1) {
        w += kerningPx(ch, rawLine[ci + 1], font, fontSizePx)
      }
      w += trackingPx
      widths.push(w)
      lineWidth += w
    }

    // Compute line start X based on alignment
    let startX = originX
    if (opts.alignment === 'center') startX = originX - lineWidth / 2
    else if (opts.alignment === 'right') startX = originX - lineWidth

    // Second pass: build LayoutChar items
    const lineChars: LayoutChar[] = []
    let penX = startX
    for (let ci = 0; ci < rawLine.length; ci++) {
      const ch   = rawLine[ci]
      const w    = widths[ci]
      const contours = glyphContours(ch, font, fontSizePx, penX, baselineY)
      const lc: LayoutChar = {
        char: ch, x: penX, y: baselineY,
        width: w, contours, lineIndex: li,
      }
      lineChars.push(lc)
      allChars.push(lc)
      penX += w
    }

    allLines.push({ chars: lineChars, width: lineWidth, y: baselineY })
  }

  // Overall bounding box
  const maxWidth = allLines.reduce((m, l) => Math.max(m, l.width), 0)
  const height   = rawLines.length * lineHeight

  return { chars: allChars, lines: allLines, bounds: { width: maxWidth, height } }
}

/**
 * Compute the ascender height in px for a loaded font at a given font-size.
 * Used to shift the baseline so the text box origin is at the top-left.
 */
export function ascenderPx(font: OTFont, fontSizePx: number): number {
  return font.ascender * (fontSizePx / font.unitsPerEm)
}

export function descenderPx(font: OTFont, fontSizePx: number): number {
  return Math.abs(font.descender) * (fontSizePx / font.unitsPerEm)
}
