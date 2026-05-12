/**
 * EmbroideryEngine — central stitch generation pipeline.
 *
 * generateStitches(obj) is the single entry point used by the store.
 *
 * Pipeline per object:
 *  1. Tie-in  stitches  (if obj.tieIn)   — 4 short locking stitches
 *  2. Underlay stitches (if underlay ≠ none) — foundation layer
 *  3. Main stitches     — the object's primary fill / column / run
 *  4. Tie-off stitches  (if obj.tieOff)  — 4 short locking stitches
 *
 * All four parts are concatenated into a single StitchPair[] so the renderer,
 * the stitch-point layer, and the machine compiler all see exactly what the
 * machine will sew.  There is no separate "preview" vs "real" stitch list.
 */

import type {
  EmbroideryObject, StitchPair, Point,
  SatinColumnObject, SatinFillObject, TatamiFillObject, RunStitchObject,
} from './types'
import { generateSatinFill }    from './generators/SatinFillGenerator'
import { generateSatinColumn }  from './generators/SatinColumnGenerator'
import { generateTatamiFill }   from './generators/TatamiFillGenerator'
import { generateRunStitch }    from './generators/RunStitchGenerator'
import { generateLettering }    from './text/LetteringEngine'
import { flattenBezierPath }    from './geometry/BezierMath'
import { walkPolyline }         from './generators/math'
import { PX_PER_MM }            from '../store/canvasStore'

// ── Constants ──────────────────────────────────────────────────────────────────
const TIE_LEN_PX    = 0.75 * PX_PER_MM   // 0.75 mm per tie stitch
const TIE_COUNT     = 4                   // tie stitches per end (must match MachineCompiler)
const UNDERLAY_SEGS = 24                  // polyline resolution for centre-line underlay

// ── Public entry point ─────────────────────────────────────────────────────────

export function generateStitches(obj: EmbroideryObject): StitchPair[] {
  const main = generateMainStitches(obj)
  if (main.length === 0) return []

  const parts: StitchPair[][] = []

  if (obj.tieIn)  parts.push(makeTieIn(main[0]))

  const underlay = generateUnderlay(obj, main)
  if (underlay.length > 0) parts.push(underlay)

  parts.push(main)

  if (obj.tieOff) parts.push(makeTieOff(main[main.length - 1]))

  return parts.flat()
}

export function countStitches(stitches: StitchPair[]): number {
  return stitches.length
}

// ── Main stitch dispatch ───────────────────────────────────────────────────────

function generateMainStitches(obj: EmbroideryObject): StitchPair[] {
  switch (obj.type) {
    case 'satin-fill':    return generateSatinFill(obj)
    case 'satin-column':  return generateSatinColumn(obj)
    case 'tatami-fill':   return generateTatamiFill(obj)
    case 'run-stitch':    return generateRunStitch(obj)
    case 'manual-stitch': return obj.points.slice(0, -1).map((p, i) => [p, obj.points[i + 1]])
    case 'lettering':     return generateLettering(obj)
    default:              return []
  }
}

// ── Underlay generation ────────────────────────────────────────────────────────

function generateUnderlay(obj: EmbroideryObject, _main: StitchPair[]): StitchPair[] {
  const { type, density } = obj.underlay
  if (type === 'none') return []

  const spacingPx = Math.max(density, 0.2) * PX_PER_MM

  switch (obj.type) {
    case 'satin-column':
      return satinColumnUnderlay(obj as SatinColumnObject, type, spacingPx)
    case 'satin-fill':
    case 'tatami-fill':
      return fillUnderlay(obj as SatinFillObject | TatamiFillObject, type, spacingPx)
    default:
      return []
  }
}

/**
 * Centre-run underlay for satin columns.
 * Walks the midpoint between left and right rails, generating a run stitch.
 */
function satinColumnUnderlay(
  col: SatinColumnObject,
  _type: string,
  spacingPx: number,
): StitchPair[] {
  const left  = flattenBezierPath(col.leftPath)
  const right = flattenBezierPath(col.rightPath)
  if (left.length < 2 || right.length < 2) return []

  // Sample centre-line at UNDERLAY_SEGS uniform steps
  const center: Point[] = []
  for (let i = 0; i <= UNDERLAY_SEGS; i++) {
    const t = i / UNDERLAY_SEGS
    center.push({
      x: (sampleAt(left, t).x  + sampleAt(right, t).x)  / 2,
      y: (sampleAt(left, t).y  + sampleAt(right, t).y)  / 2,
    })
  }

  const walked = walkPolyline(center, spacingPx)
  return walked.slice(0, -1).map((p, i) => [p, walked[i + 1]] as StitchPair)
}

/**
 * Edge-run underlay for fill regions.
 * Traces the boundary at underlay spacing — gives the fill a stable foundation.
 */
function fillUnderlay(
  obj: SatinFillObject | TatamiFillObject,
  _type: string,
  spacingPx: number,
): StitchPair[] {
  const boundary = flattenBezierPath(obj.boundary)
  if (boundary.length < 3) return []

  const walked = walkPolyline(boundary, spacingPx)
  return walked.slice(0, -1).map((p, i) => [p, walked[i + 1]] as StitchPair)
}

// ── Tie-in / Tie-off ───────────────────────────────────────────────────────────

/**
 * Generate locking stitches at the start of an object.
 * Produces TIE_COUNT short forward/backward stitches from the first stitch's
 * start point so the thread can't pull out.
 */
function makeTieIn(firstPair: StitchPair): StitchPair[] {
  return makeTieStitches(firstPair[0], firstPair[1], true)
}

/**
 * Generate locking stitches at the end of an object.
 */
function makeTieOff(lastPair: StitchPair): StitchPair[] {
  return makeTieStitches(lastPair[1], lastPair[0], false)
}

function makeTieStitches(anchor: Point, direction: Point, _atStart: boolean): StitchPair[] {
  const dx  = direction.x - anchor.x
  const dy  = direction.y - anchor.y
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len < 1e-6) return []

  const ux = (dx / len) * TIE_LEN_PX
  const uy = (dy / len) * TIE_LEN_PX

  const result: StitchPair[] = []
  // Alternate: forward fraction, back to anchor, repeat — builds a knot
  const fractions = [0.35, 0.70, 0.50, 0.90]   // TIE_COUNT steps
  let cur = { ...anchor }

  for (let i = 0; i < TIE_COUNT; i++) {
    const frac = fractions[i] ?? 0.5
    const next: Point = { x: anchor.x + ux * frac, y: anchor.y + uy * frac }
    result.push([{ ...cur }, { ...next }])
    cur = next
  }
  // Return to anchor so the object's main stitches resume from the correct position
  result.push([{ ...cur }, { ...anchor }])

  return result
}

// ── Util: sample a polyline at normalised t [0,1] ─────────────────────────────

function sampleAt(pts: Point[], t: number): Point {
  if (pts.length === 0) return { x: 0, y: 0 }
  if (pts.length === 1) return { ...pts[0] }
  const idx = Math.max(0, Math.min(pts.length - 2, Math.floor(t * (pts.length - 1))))
  const frac = t * (pts.length - 1) - idx
  const a = pts[idx], b = pts[idx + 1]
  return { x: a.x + (b.x - a.x) * frac, y: a.y + (b.y - a.y) * frac }
}
