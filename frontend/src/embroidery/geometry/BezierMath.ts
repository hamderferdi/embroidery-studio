/**
 * Pure Bézier geometry engine — no DOM, no PixiJS, no Paper.js dependency.
 * All functions operate on plain { x, y } objects in world-space coordinates.
 */

import type { Point } from '../types'
import type { BezierPath, BezierPoint } from '../types'

// ── Cubic evaluation ──────────────────────────────────────────────────────────

/** Evaluate a cubic Bézier at t ∈ [0,1] */
export function evalCubic(
  p0: Point, p1: Point, p2: Point, p3: Point, t: number,
): Point {
  const mt = 1 - t, mt2 = mt * mt, t2 = t * t
  return {
    x: mt2 * mt * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t2 * t * p3.x,
    y: mt2 * mt * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t2 * t * p3.y,
  }
}

/** First derivative (tangent vector, NOT normalized) at t */
export function derivCubic(
  p0: Point, p1: Point, p2: Point, p3: Point, t: number,
): Point {
  const mt = 1 - t
  return {
    x: 3 * (mt * mt * (p1.x - p0.x) + 2 * mt * t * (p2.x - p1.x) + t * t * (p3.x - p2.x)),
    y: 3 * (mt * mt * (p1.y - p0.y) + 2 * mt * t * (p2.y - p1.y) + t * t * (p3.y - p2.y)),
  }
}

// ── De Casteljau split ────────────────────────────────────────────────────────

interface Cubic { p0: Point; p1: Point; p2: Point; p3: Point }

/** Split a cubic Bézier at t → [left, right] */
export function splitCubic(
  p0: Point, p1: Point, p2: Point, p3: Point, t: number,
): [Cubic, Cubic] {
  const q0 = lerp2(p0, p1, t), q1 = lerp2(p1, p2, t), q2 = lerp2(p2, p3, t)
  const r0 = lerp2(q0, q1, t), r1 = lerp2(q1, q2, t)
  const s  = lerp2(r0, r1, t)
  return [
    { p0, p1: q0, p2: r0, p3: s },
    { p0: s, p1: r1, p2: q2, p3 },
  ]
}

// ── Adaptive flattening ───────────────────────────────────────────────────────

/**
 * Adaptively flatten a cubic Bézier segment into line points.
 * Returns inclusive endpoints: [p0, ..., p3].
 * tolerance is in world units (px).
 */
export function flattenCubic(
  p0: Point, p1: Point, p2: Point, p3: Point, tolerance = 0.5,
): Point[] {
  const pts: Point[] = [{ ...p0 }]
  _flattenRecurse(p0, p1, p2, p3, tolerance * tolerance, pts)
  pts.push({ ...p3 })
  return pts
}

function _flattenRecurse(
  p0: Point, p1: Point, p2: Point, p3: Point, tolSq: number, out: Point[],
) {
  // Approximate flatness: distance of Bézier midpoint from chord midpoint
  const mx = (p0.x + 3 * p1.x + 3 * p2.x + p3.x) * 0.125
  const my = (p0.y + 3 * p1.y + 3 * p2.y + p3.y) * 0.125
  const cx = (p0.x + p3.x) * 0.5, cy = (p0.y + p3.y) * 0.5
  const dx = mx - cx, dy = my - cy
  if (dx * dx + dy * dy <= tolSq) return
  const [a, b] = splitCubic(p0, p1, p2, p3, 0.5)
  _flattenRecurse(a.p0, a.p1, a.p2, a.p3, tolSq, out)
  out.push({ ...b.p0 })
  _flattenRecurse(b.p0, b.p1, b.p2, b.p3, tolSq, out)
}

// ── Path flattening ───────────────────────────────────────────────────────────

/**
 * Return the absolute control point positions for segment i→(i+1) in a BezierPath.
 * P0 = anchor[i], P1 = anchor[i] + ho[i], P2 = anchor[i+1] + hi[i+1], P3 = anchor[i+1]
 */
export function segmentCPs(path: BezierPath, i: number): Cubic {
  const pts = path.points
  const n   = pts.length
  const a   = pts[i]
  const b   = pts[(i + 1) % n]
  return {
    p0: { x: a.x, y: a.y },
    p1: { x: a.x + (a.ho?.x ?? 0), y: a.y + (a.ho?.y ?? 0) },
    p2: { x: b.x + (b.hi?.x ?? 0), y: b.y + (b.hi?.y ?? 0) },
    p3: { x: b.x, y: b.y },
  }
}

/** Flatten an entire BezierPath to a Point[]. */
export function flattenBezierPath(path: BezierPath, tolerance = 0.5): Point[] {
  const pts   = path.points
  const n     = pts.length
  if (n === 0) return []
  if (n === 1) return [{ x: pts[0].x, y: pts[0].y }]

  const segs  = path.closed ? n : n - 1
  const out:  Point[] = []

  for (let i = 0; i < segs; i++) {
    const { p0, p1, p2, p3 } = segmentCPs(path, i)
    const flat = flattenCubic(p0, p1, p2, p3, tolerance)
    if (i === 0) out.push(flat[0])
    for (let k = 1; k < flat.length; k++) out.push(flat[k])
  }

  if (path.closed && out.length > 1) {
    // Close: add the first point at the end if not already there
    const first = out[0], last = out[out.length - 1]
    const dx = first.x - last.x, dy = first.y - last.y
    if (dx * dx + dy * dy > 0.001) out.push({ ...first })
  }

  return out
}

// ── Hit testing ───────────────────────────────────────────────────────────────

export interface SegmentHit {
  t:    number
  dist: number
  pt:   Point
}

/**
 * Find the nearest point on a cubic Bézier segment to `query`.
 * Uses coarse 20-step sampling followed by Newton-Raphson refinement.
 */
export function nearestOnCubic(
  p0: Point, p1: Point, p2: Point, p3: Point, query: Point,
): SegmentHit {
  let bestT = 0, bestD = Infinity, bestPt = p0

  for (let i = 0; i <= 20; i++) {
    const t = i / 20
    const q = evalCubic(p0, p1, p2, p3, t)
    const dx = q.x - query.x, dy = q.y - query.y
    const d  = Math.sqrt(dx * dx + dy * dy)
    if (d < bestD) { bestD = d; bestT = t; bestPt = q }
  }

  // Newton-Raphson refinement
  let t = bestT
  for (let iter = 0; iter < 5; iter++) {
    const q  = evalCubic(p0, p1, p2, p3, t)
    const qp = derivCubic(p0, p1, p2, p3, t)
    const dx = q.x - query.x, dy = q.y - query.y
    const denom = qp.x * qp.x + qp.y * qp.y
    if (denom < 1e-10) break
    t = Math.max(0, Math.min(1, t - (dx * qp.x + dy * qp.y) / denom))
  }

  const fp = evalCubic(p0, p1, p2, p3, t)
  const fdx = fp.x - query.x, fdy = fp.y - query.y
  return { t, dist: Math.sqrt(fdx * fdx + fdy * fdy), pt: fp }
}

/** Find the nearest point on any segment of a BezierPath. */
export function nearestOnPath(
  path: BezierPath, query: Point,
): { segIndex: number; t: number; dist: number; pt: Point } | null {
  const n    = path.points.length
  if (n < 2) return null
  const segs = path.closed ? n : n - 1

  let best: { segIndex: number; t: number; dist: number; pt: Point } | null = null

  for (let i = 0; i < segs; i++) {
    const { p0, p1, p2, p3 } = segmentCPs(path, i)
    const hit = nearestOnCubic(p0, p1, p2, p3, query)
    if (!best || hit.dist < best.dist) {
      best = { segIndex: i, t: hit.t, dist: hit.dist, pt: hit.pt }
    }
  }

  return best
}

// ── Smooth handle generation ──────────────────────────────────────────────────

/**
 * Compute symmetric Bézier handles for a smooth node at pts[i],
 * based on the chord between pts[i-1] and pts[i+1].
 * tension ∈ (0, 0.5] — 1/3 is the Catmull-Rom default.
 */
export function makeSmooth(
  prev: Point, curr: Point, next: Point, tension = 0.333,
): { hi: Point; ho: Point } {
  const chordX = next.x - prev.x
  const chordY = next.y - prev.y
  const len    = Math.sqrt(chordX * chordX + chordY * chordY)
  if (len < 1e-10) return { hi: { x: 0, y: 0 }, ho: { x: 0, y: 0 } }

  const scale = tension * len
  const nx    = (chordX / len) * scale
  const ny    = (chordY / len) * scale

  return {
    hi: { x: -nx, y: -ny },   // incoming = backward along chord
    ho: { x:  nx, y:  ny },   // outgoing = forward along chord
  }
}

/**
 * Auto-smooth a BezierPath by computing Catmull-Rom-like handles for
 * every node that has type !== 'corner'.
 */
export function autoSmoothPath(path: BezierPath): BezierPath {
  const pts = path.points
  const n   = pts.length
  if (n < 2) return path

  const out: BezierPoint[] = pts.map((pt, i) => {
    if (pt.type === 'corner') return { ...pt, hi: undefined, ho: undefined }

    const prev = pts[(i - 1 + n) % n]
    const next = pts[(i + 1) % n]
    const { hi, ho } = makeSmooth(prev, pt, next)
    return { ...pt, hi, ho }
  })

  return { ...path, points: out }
}

// ── Handle constraint application ─────────────────────────────────────────────

/**
 * Apply smooth / symmetric handle mirroring when a handle is dragged.
 * Mutates `pt` in-place.
 *
 * movedHandle: 'in' | 'out'
 * newOffset:   the new offset for the moved handle (relative to anchor)
 */
export function applyHandleConstraint(
  pt: BezierPoint,
  movedHandle: 'in' | 'out',
  newOffset: Point,
): BezierPoint {
  const result = { ...pt }

  if (movedHandle === 'out') {
    result.ho = newOffset
    if (pt.type === 'symmetric') {
      result.hi = { x: -newOffset.x, y: -newOffset.y }
    } else if (pt.type === 'smooth') {
      // Keep handle-in length, mirror direction
      const hiLen = pt.hi ? Math.sqrt(pt.hi.x ** 2 + pt.hi.y ** 2) : 0
      const outLen = Math.sqrt(newOffset.x ** 2 + newOffset.y ** 2)
      if (outLen > 1e-10 && hiLen > 1e-10) {
        const scale = hiLen / outLen
        result.hi = { x: -newOffset.x * scale, y: -newOffset.y * scale }
      }
    }
  } else {
    result.hi = newOffset
    if (pt.type === 'symmetric') {
      result.ho = { x: -newOffset.x, y: -newOffset.y }
    } else if (pt.type === 'smooth') {
      const hoLen = pt.ho ? Math.sqrt(pt.ho.x ** 2 + pt.ho.y ** 2) : 0
      const inLen = Math.sqrt(newOffset.x ** 2 + newOffset.y ** 2)
      if (inLen > 1e-10 && hoLen > 1e-10) {
        const scale = hoLen / inLen
        result.ho = { x: -newOffset.x * scale, y: -newOffset.y * scale }
      }
    }
  }

  return result
}

// ── Node insertion ────────────────────────────────────────────────────────────

/**
 * Insert a new node at parameter t on segment segIndex.
 * Returns a new BezierPath with the inserted node.
 */
export function insertNodeAt(path: BezierPath, segIndex: number, t: number): BezierPath {
  const pts = path.points
  const n   = pts.length
  const a   = pts[segIndex]
  const b   = pts[(segIndex + 1) % n]

  const { p0, p1, p2, p3 } = segmentCPs(path, segIndex)
  const [left, right] = splitCubic(p0, p1, p2, p3, t)

  // New anchor at the split point
  const newPt: BezierPoint = {
    x: left.p3.x, y: left.p3.y, type: 'smooth',
    hi: { x: left.p2.x  - left.p3.x,  y: left.p2.y  - left.p3.y },
    ho: { x: right.p1.x - right.p0.x, y: right.p1.y - right.p0.y },
  }

  // Update handles of the split segment endpoints
  const newA: BezierPoint = {
    ...a,
    ho: { x: left.p1.x - a.x, y: left.p1.y - a.y },
  }
  const newB: BezierPoint = {
    ...b,
    hi: { x: right.p2.x - b.x, y: right.p2.y - b.y },
  }

  const before = pts.slice(0, segIndex)
  const after  = path.closed
    ? pts.slice((segIndex + 1) % n === 0 ? n : (segIndex + 1) % n)
    : pts.slice(segIndex + 1)

  return {
    ...path,
    points: [...before, newA, newPt, newB, ...after],
  }
}

// ── Utility ───────────────────────────────────────────────────────────────────

function lerp2(a: Point, b: Point, t: number): Point {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}

/** Euclidean distance */
export function dist2(a: Point, b: Point): number {
  const dx = a.x - b.x, dy = a.y - b.y
  return Math.sqrt(dx * dx + dy * dy)
}
