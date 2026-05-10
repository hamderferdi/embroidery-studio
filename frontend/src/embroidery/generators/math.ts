import type { Point } from '../types'

export function rotatePoint(p: Point, angle: number, origin: Point = { x: 0, y: 0 }): Point {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const dx = p.x - origin.x
  const dy = p.y - origin.y
  return {
    x: origin.x + dx * cos - dy * sin,
    y: origin.y + dx * sin + dy * cos,
  }
}

export function dist(a: Point, b: Point): number {
  const dx = b.x - a.x
  const dy = b.y - a.y
  return Math.sqrt(dx * dx + dy * dy)
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function lerpPoint(a: Point, b: Point, t: number): Point {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) }
}

export function normalize(p: Point): Point {
  const len = Math.sqrt(p.x * p.x + p.y * p.y)
  if (len === 0) return { x: 0, y: 0 }
  return { x: p.x / len, y: p.y / len }
}

export function perpendicular(p: Point): Point {
  return { x: -p.y, y: p.x }
}

/** Line-line segment intersection. Returns null if parallel or outside segments. */
export function segmentIntersect(
  a1: Point, a2: Point,
  b1: Point, b2: Point
): Point | null {
  const d1x = a2.x - a1.x
  const d1y = a2.y - a1.y
  const d2x = b2.x - b1.x
  const d2y = b2.y - b1.y

  const denom = d1x * d2y - d1y * d2x
  if (Math.abs(denom) < 1e-10) return null

  const t = ((b1.x - a1.x) * d2y - (b1.y - a1.y) * d2x) / denom
  const u = ((b1.x - a1.x) * d1y - (b1.y - a1.y) * d1x) / denom

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: a1.x + t * d1x,
      y: a1.y + t * d1y,
    }
  }
  return null
}

/**
 * Intersect an infinite horizontal line at y with a closed polygon.
 * Returns x-coordinates of all intersections, sorted ascending.
 */
export function scanlineIntersect(y: number, polygon: Point[]): number[] {
  const xs: number[] = []
  const n = polygon.length

  for (let i = 0; i < n; i++) {
    const a = polygon[i]
    const b = polygon[(i + 1) % n]

    const minY = Math.min(a.y, b.y)
    const maxY = Math.max(a.y, b.y)
    if (y < minY || y > maxY) continue
    if (Math.abs(maxY - minY) < 1e-10) continue

    const t = (y - a.y) / (b.y - a.y)
    xs.push(a.x + t * (b.x - a.x))
  }

  return xs.sort((a, b) => a - b)
}

/** Walk a polyline at fixed intervals, returning sampled points */
export function walkPolyline(points: Point[], interval: number): Point[] {
  if (points.length < 2) return []
  const result: Point[] = []
  let accumulated = 0
  result.push({ ...points[0] })

  for (let i = 1; i < points.length; i++) {
    const segLen = dist(points[i - 1], points[i])
    let covered = 0
    while (accumulated + (segLen - covered) >= interval) {
      const need = interval - accumulated
      const t = (covered + need) / segLen
      result.push(lerpPoint(points[i - 1], points[i], t))
      covered += need
      accumulated = 0
    }
    accumulated += segLen - covered
  }

  return result
}

/** Compute axis-aligned bounding box */
export function polyBounds(points: Point[]): { minX: number; maxX: number; minY: number; maxY: number } {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const p of points) {
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y
    if (p.y > maxY) maxY = p.y
  }
  return { minX, maxX, minY, maxY }
}
