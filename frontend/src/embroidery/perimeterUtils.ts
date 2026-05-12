/**
 * perimeterUtils — edge-constraint system for entry/exit points.
 *
 * Every embroidery object has a "perimeter" — the outline polyline that defines
 * its boundary.  Entry and exit points are constrained to live ON this polyline
 * so they always represent a valid needle-penetration location.
 *
 * Core operations:
 *  extractPerimeter  — flatten an object's geometry to a polyline
 *  projectOntoPerimeter — find the nearest perimeter point to any world coord
 *  evalPerimeterPoint   — re-derive world position from stored (edgeIndex, t)
 *  nearestPerimeterPoint— alias of projectOntoPerimeter for semantic clarity
 */

import type {
  EmbroideryObject, PerimeterPoint, Point,
  SatinColumnObject, SatinFillObject, TatamiFillObject,
  RunStitchObject, LetteringObject,
} from './types'
import { flattenBezierPath } from './geometry/BezierMath'

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Return the perimeter polyline for any embroidery object type.
 *
 * • satin-fill / tatami-fill → boundary closed loop
 * • run-stitch               → open path
 * • satin-column             → left rail forward + right rail reversed (closed)
 * • lettering                → first contour of first glyph (or bbox fallback)
 * • manual-stitch            → the raw point sequence
 */
export function extractPerimeter(obj: EmbroideryObject): Point[] {
  switch (obj.type) {
    case 'satin-fill':
    case 'tatami-fill': {
      const pts = flattenBezierPath((obj as SatinFillObject | TatamiFillObject).boundary)
      return ensureClosed(pts)
    }

    case 'run-stitch':
      return flattenBezierPath((obj as RunStitchObject).path)

    case 'satin-column': {
      const col   = obj as SatinColumnObject
      const left  = flattenBezierPath(col.leftPath)
      const right = flattenBezierPath(col.rightPath)
      if (left.length < 2 || right.length < 2) return []
      // Closed perimeter: go along left rail, then right rail reversed
      return ensureClosed([...left, ...[...right].reverse()])
    }

    case 'lettering': {
      const lo = obj as LetteringObject
      if (lo.letterBoundaries) {
        for (const contours of lo.letterBoundaries) {
          if (contours && contours.length > 0) {
            const pts = flattenBezierPath(contours[0])
            if (pts.length >= 2) return ensureClosed(pts)
          }
        }
      }
      // Fallback: bounding rectangle derived from cached stitch extents
      return buildBboxPerimeter(obj)
    }

    case 'manual-stitch':
      return obj.points.length >= 2 ? obj.points : []

    default:
      return []
  }
}

/**
 * Project a world-space mouse position onto the nearest point of the perimeter.
 * Returns a PerimeterPoint with the edge index, t, and world position.
 */
export function projectOntoPerimeter(
  perimeter: Point[], mouse: Point,
): PerimeterPoint {
  if (perimeter.length < 2) {
    return { edgeIndex: 0, t: 0, position: perimeter[0] ?? { ...mouse } }
  }

  let bestDist = Infinity
  let bestEdge = 0
  let bestT    = 0
  let bestPos: Point = { ...perimeter[0] }

  for (let i = 0; i < perimeter.length - 1; i++) {
    const { t, dist, point } = projectOntoSegment(perimeter[i], perimeter[i + 1], mouse)
    if (dist < bestDist) {
      bestDist = dist
      bestEdge = i
      bestT    = t
      bestPos  = point
    }
  }

  return { edgeIndex: bestEdge, t: bestT, position: bestPos }
}

/**
 * Re-evaluate a PerimeterPoint against the current geometry polyline.
 * Call this whenever the object's shape changes to keep the point attached.
 *
 * The edgeIndex is clamped in case segments were removed; t is preserved so
 * the point stays at the same relative location along the surviving edge.
 */
export function evalPerimeterPoint(
  perimeter: Point[], pp: PerimeterPoint,
): Point {
  if (perimeter.length < 2) return { ...pp.position }
  const i = Math.max(0, Math.min(pp.edgeIndex, perimeter.length - 2))
  const a = perimeter[i]
  const b = perimeter[i + 1]
  return {
    x: a.x + (b.x - a.x) * pp.t,
    y: a.y + (b.y - a.y) * pp.t,
  }
}

/** Alias: find the nearest perimeter point to any world-space position. */
export function nearestPerimeterPoint(
  perimeter: Point[], worldPt: Point,
): PerimeterPoint {
  return projectOntoPerimeter(perimeter, worldPt)
}

// ── Internal helpers ───────────────────────────────────────────────────────────

/** Project point p onto segment [a, b]. Returns clamped t, distance, and foot. */
function projectOntoSegment(
  a: Point, b: Point, p: Point,
): { t: number; dist: number; point: Point } {
  const dx    = b.x - a.x
  const dy    = b.y - a.y
  const lenSq = dx * dx + dy * dy

  if (lenSq < 1e-10) {
    const d = Math.sqrt((p.x - a.x) ** 2 + (p.y - a.y) ** 2)
    return { t: 0, dist: d, point: { ...a } }
  }

  const t  = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq))
  const px = a.x + t * dx
  const py = a.y + t * dy
  return {
    t,
    dist:  Math.sqrt((p.x - px) ** 2 + (p.y - py) ** 2),
    point: { x: px, y: py },
  }
}

/** If the last point doesn't coincide with the first, append first to close. */
function ensureClosed(pts: Point[]): Point[] {
  if (pts.length < 2) return pts
  const first = pts[0], last = pts[pts.length - 1]
  const d = Math.sqrt((first.x - last.x) ** 2 + (first.y - last.y) ** 2)
  if (d > 0.5) return [...pts, { ...first }]
  return pts
}

/** Fallback perimeter: axis-aligned bounding rectangle from stitch extents. */
function buildBboxPerimeter(obj: EmbroideryObject): Point[] {
  const stitches = obj.stitches
  if (!stitches || stitches.length === 0) return []

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const [a, b] of stitches) {
    if (a.x < minX) minX = a.x; if (a.x > maxX) maxX = a.x
    if (b.x < minX) minX = b.x; if (b.x > maxX) maxX = b.x
    if (a.y < minY) minY = a.y; if (a.y > maxY) maxY = a.y
    if (b.y < minY) minY = b.y; if (b.y > maxY) maxY = b.y
  }

  if (!isFinite(minX)) return []

  return ensureClosed([
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ])
}
