/**
 * GlyphOutline — converts opentype.js glyph path commands to BezierPath[].
 *
 * Each glyph can have multiple contours (e.g. 'O' has outer + inner hole).
 * Each contour becomes one closed BezierPath. Winding direction is preserved
 * so the scanline even-odd fill rule gives correct hole rendering.
 *
 * Quadratic Bézier segments (Q) are promoted to cubic (C) using:
 *   cp1 = start + 2/3 * (qControl - start)
 *   cp2 = end   + 2/3 * (qControl - end)
 */

import type { OTFont } from './FontManager'
import type { BezierPath, BezierPoint, Point } from '../types'

interface QCmd { type: 'Q'; x1: number; y1: number; x: number; y: number }
interface CCmd { type: 'C'; x1: number; y1: number; x2: number; y2: number; x: number; y: number }
interface MCmd { type: 'M'; x: number; y: number }
interface LCmd { type: 'L'; x: number; y: number }
interface ZCmd { type: 'Z' }
type PathCmd = MCmd | LCmd | CCmd | QCmd | ZCmd

/**
 * Extract all contours for a single character as BezierPath[].
 *
 * @param char    The character to extract (single codepoint)
 * @param font    Loaded opentype.Font
 * @param sizePx  Desired pixel size (font-size, NOT cap-height) — used for scaling
 * @param originX X origin in world space
 * @param originY Y origin in world space (baseline)
 * @returns Array of closed contours. May be empty for space/invisible glyphs.
 */
export function glyphContours(
  char: string,
  font: OTFont,
  sizePx: number,
  originX = 0,
  originY = 0,
): BezierPath[] {
  const glyph = font.charToGlyph(char)
  if (!glyph || !glyph.path) return []

  const path = glyph.getPath(originX, originY, sizePx)
  const commands = path.commands as PathCmd[]

  const contours: BezierPath[] = []
  let current: BezierPoint[] = []
  let startPt: Point = { x: 0, y: 0 }
  let penX = 0, penY = 0

  function pushCorner(x: number, y: number, hi?: Point, ho?: Point): BezierPoint {
    return { x, y, type: 'corner', hi, ho }
  }
  function pushSmooth(x: number, y: number, hi?: Point, ho?: Point): BezierPoint {
    return { x, y, type: 'smooth', hi, ho }
  }

  for (const cmd of commands) {
    switch (cmd.type) {
      case 'M': {
        if (current.length >= 2) {
          contours.push({ points: current, closed: true })
        }
        current = []
        penX = cmd.x; penY = cmd.y
        startPt = { x: penX, y: penY }
        current.push(pushCorner(penX, penY))
        break
      }

      case 'L': {
        // Line-to: corner point, no handles needed
        current.push(pushCorner(cmd.x, cmd.y))
        penX = cmd.x; penY = cmd.y
        break
      }

      case 'C': {
        // Cubic Bézier: the handles belong to the PREVIOUS and NEXT points.
        // We set the ho of the previous point and the hi of the new point.
        const c = cmd as CCmd
        if (current.length > 0) {
          const prev = current[current.length - 1]
          // ho for prev = cp1 offset from prev
          const ho: Point = { x: c.x1 - prev.x, y: c.y1 - prev.y }
          // Update prev with its out-handle
          current[current.length - 1] = { ...prev, ho, type: 'smooth' }
        }
        // hi for new point = cp2 offset from new point
        const hi: Point = { x: c.x2 - c.x, y: c.y2 - c.y }
        current.push(pushSmooth(c.x, c.y, hi))
        penX = c.x; penY = c.y
        break
      }

      case 'Q': {
        // Quadratic Bézier → promote to cubic
        const q = cmd as QCmd
        // cp1 = prev + 2/3 * (qCtrl - prev)
        const cp1x = penX + (2 / 3) * (q.x1 - penX)
        const cp1y = penY + (2 / 3) * (q.y1 - penY)
        // cp2 = end + 2/3 * (qCtrl - end)
        const cp2x = q.x + (2 / 3) * (q.x1 - q.x)
        const cp2y = q.y + (2 / 3) * (q.y1 - q.y)

        if (current.length > 0) {
          const prev = current[current.length - 1]
          const ho: Point = { x: cp1x - prev.x, y: cp1y - prev.y }
          current[current.length - 1] = { ...prev, ho, type: 'smooth' }
        }
        const hi: Point = { x: cp2x - q.x, y: cp2y - q.y }
        current.push(pushSmooth(q.x, q.y, hi))
        penX = q.x; penY = q.y
        break
      }

      case 'Z': {
        // Close path: link the last point back to the first if needed
        if (current.length >= 2) {
          // If last point coincides with start, remove it (duplicate)
          const last = current[current.length - 1]
          const dx = Math.abs(last.x - startPt.x)
          const dy = Math.abs(last.y - startPt.y)
          if (dx < 0.01 && dy < 0.01 && current.length > 1) {
            // Merge last point's hi into the first point
            if (last.hi) {
              current[0] = { ...current[0], hi: last.hi }
            }
            current.pop()
          }
          contours.push({ points: current, closed: true })
        }
        current = []
        penX = 0; penY = 0
        break
      }
    }
  }

  // Flush any open path
  if (current.length >= 2) {
    contours.push({ points: current, closed: true })
  }

  return contours
}

/**
 * Get the advance width (in world pixels) of a character.
 */
export function charAdvanceWidth(char: string, font: OTFont, sizePx: number): number {
  const glyph = font.charToGlyph(char)
  const scale = sizePx / font.unitsPerEm
  return (glyph.advanceWidth ?? 0) * scale
}

/**
 * Get kerning between two adjacent characters (in world pixels).
 */
export function kerningPx(
  leftChar: string,
  rightChar: string,
  font: OTFont,
  sizePx: number,
): number {
  const left  = font.charToGlyph(leftChar)
  const right = font.charToGlyph(rightChar)
  const kern  = font.getKerningValue(left, right)
  return kern * (sizePx / font.unitsPerEm)
}
