/**
 * LetteringEngine — generates embroidery stitches from a LetteringObject.
 *
 * Strategy:
 *  1. For each letter, merge its contours into one boundary path.
 *  2. Attempt satin-fill scanline generation.
 *  3. If satin fill returns 0 stitches (e.g. degenerate path), fall back to
 *     a run-stitch outline trace — guarantees SOMETHING always renders.
 *
 * Density note: world coordinates are in pixels (PX_PER_MM ≈ 3.78 px/mm).
 * All density values are converted before use.
 */

import type { LetteringObject, BezierPath, StitchPair, Point, SatinFillObject } from '../types'
import { defaultObjectBase } from '../types'
import { flattenBezierPath } from '../geometry/BezierMath'
import { generateSatinFill } from '../generators/SatinFillGenerator'
import { PX_PER_MM } from '../../store/canvasStore'
import { v4 as uuid } from 'uuid'

export function generateLettering(obj: LetteringObject): StitchPair[] {
  console.log(`[TEXT] generateLettering: text="${obj.text}", boundaries=${obj.letterBoundaries?.length ?? 'none'}`)

  if (!obj.letterBoundaries || obj.letterBoundaries.length === 0) {
    console.log('[TEXT] No letterBoundaries — skipping stitch generation')
    return []
  }

  // density in px (scanline generator works in world-px coordinates)
  const densityMm = obj.fontSizeMm < 6 ? 0.3 : 0.42
  const densityPx = densityMm * PX_PER_MM   // e.g. 0.42 * 3.7795 ≈ 1.59 px

  const allStitches: StitchPair[] = []
  let letterIdx = 0

  for (const contours of obj.letterBoundaries) {
    if (!contours || contours.length === 0) {
      letterIdx++
      continue  // space / invisible glyph
    }

    const stitches = stitchesForLetter(contours, obj, densityPx, letterIdx)
    console.log(`[TEXT]   letter[${letterIdx}]: ${stitches.length} stitches`)
    allStitches.push(...stitches)
    letterIdx++
  }

  console.log(`[TEXT] generateLettering done: ${allStitches.length} total stitches`)
  return allStitches
}

function stitchesForLetter(
  contours:   BezierPath[],
  obj:        LetteringObject,
  densityPx:  number,
  idx:        number,
): StitchPair[] {
  const boundary = mergeContoursForFill(contours)
  if (boundary.points.length < 3) {
    console.log(`[TEXT]   letter[${idx}]: boundary too small (${boundary.points.length} pts)`)
    return []
  }

  const pts = flattenBezierPath(boundary)
  console.log(`[TEXT]   letter[${idx}]: flattened to ${pts.length} pts`)

  if (pts.length < 3) return []

  const angle = autoStitchAngle(pts)

  // ── Try satin fill ────────────────────────────────────────────────────────
  const fakeObj: SatinFillObject = {
    id: uuid(),
    type: 'satin-fill',
    name: 'letter',
    ...defaultObjectBase({ color: obj.color, stitchAngle: angle, density: densityPx }),
    boundary,
    stitchAngle: angle,
    density: densityPx,
  } as SatinFillObject

  const satinStitches = generateSatinFill(fakeObj)

  if (satinStitches.length > 0) {
    return satinStitches
  }

  // ── Fallback: outline run-stitch ──────────────────────────────────────────
  // If the scanline algorithm produces nothing (e.g. boundary too thin or
  // degenerate path), trace the flattened outline as consecutive stitch pairs.
  // This always renders SOMETHING.
  console.log(`[TEXT]   letter[${idx}]: satin gave 0 stitches — using outline fallback`)
  return outlineToRunStitch(pts)
}

/**
 * Convert a flat polygon outline to run-stitch pairs.
 * Consecutive point pairs: [0→1], [1→2], …, [n-1→0].
 */
function outlineToRunStitch(pts: Point[]): StitchPair[] {
  const stitches: StitchPair[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    stitches.push([pts[i], pts[i + 1]])
  }
  if (pts.length > 2) {
    stitches.push([pts[pts.length - 1], pts[0]])
  }
  return stitches
}

/**
 * Merge multiple contours into one boundary.
 * Outer (largest area) first; holes appended reversed.
 * All handles stripped to corner-only so the scanline
 * algorithm receives a simple polygon.
 */
function mergeContoursForFill(contours: BezierPath[]): BezierPath {
  if (contours.length === 1) {
    // Strip to corners for reliability with the scanline algorithm
    return {
      points: contours[0].points.map(p => ({ x: p.x, y: p.y, type: 'corner' as const })),
      closed: true,
    }
  }

  const sorted = [...contours].sort((a, b) =>
    approxArea(b.points) - approxArea(a.points)
  )

  const merged: import('../types').BezierPoint[] = []
  for (let i = 0; i < sorted.length; i++) {
    const raw = i === 0 ? sorted[i].points : [...sorted[i].points].reverse()
    const pts = raw.map(p => ({ x: p.x, y: p.y, type: 'corner' as const }))
    if (merged.length > 0 && pts.length > 0) {
      merged.push(pts[0])   // bridge point
    }
    merged.push(...pts)
  }

  return { points: merged, closed: true }
}

function approxArea(pts: { x: number; y: number }[]): number {
  let area = 0
  const n = pts.length
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    area += pts[i].x * pts[j].y - pts[j].x * pts[i].y
  }
  return Math.abs(area / 2)
}

function autoStitchAngle(pts: Point[]): number {
  let minX = Infinity, maxX = -Infinity
  let minY = Infinity, maxY = -Infinity
  for (const p of pts) {
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y
    if (p.y > maxY) maxY = p.y
  }
  const w = maxX - minX
  const h = maxY - minY
  if (h > w * 1.3) return 0    // tall letter → horizontal stitches
  if (w > h * 1.3) return 90   // wide letter → vertical stitches
  return 45
}
