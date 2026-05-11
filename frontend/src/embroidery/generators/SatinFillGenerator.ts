import type { Point, StitchPair, SatinFillObject } from '../types'
import { rotatePoint, scanlineIntersect, polyBounds } from './math'
import { flattenBezierPath } from '../geometry/BezierMath'

/**
 * Generates satin-fill stitches for a closed polygon boundary.
 * All stitches run parallel at stitchAngle degrees, spaced by density mm.
 * Stitches alternate direction each row for efficient travel.
 */
export function generateSatinFill(obj: SatinFillObject): StitchPair[] {
  const { stitchAngle, density } = obj
  const boundary = flattenBezierPath(obj.boundary)
  if (boundary.length < 3) return []

  const angleRad = (stitchAngle * Math.PI) / 180

  // Rotate boundary so stitches are "horizontal" in that frame
  const rotated = boundary.map(p => rotatePoint(p, -angleRad))
  const { minY, maxY } = polyBounds(rotated)

  const stitches: StitchPair[] = []
  let row = 0
  const padding = density * 0.5

  for (let y = minY - padding; y <= maxY + padding; y += density) {
    const xs = scanlineIntersect(y, rotated)
    if (xs.length < 2) continue

    // Process pairs of intersections
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const x0 = xs[i]
      const x1 = xs[i + 1]
      if (Math.abs(x1 - x0) < 0.05) continue

      // Alternate row direction for cleaner coverage
      const start: Point = row % 2 === 0
        ? rotatePoint({ x: x0, y }, angleRad)
        : rotatePoint({ x: x1, y }, angleRad)
      const end: Point = row % 2 === 0
        ? rotatePoint({ x: x1, y }, angleRad)
        : rotatePoint({ x: x0, y }, angleRad)

      stitches.push([start, end])
    }
    row++
  }

  return stitches
}
