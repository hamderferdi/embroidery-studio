import type { StitchPair, TatamiFillObject, Point } from '../types'
import { rotatePoint, scanlineIntersect, polyBounds } from './math'

/**
 * Tatami (fill) stitch generation.
 * Like satin fill but with row-offset and max stitch length splitting.
 * Creates a woven, fabric-like fill texture.
 */
export function generateTatamiFill(obj: TatamiFillObject): StitchPair[] {
  const { boundary, stitchAngle, density, stitchLength, rowOffset } = obj
  if (boundary.length < 3) return []

  const angleRad = (stitchAngle * Math.PI) / 180
  const rotated = boundary.map(p => rotatePoint(p, -angleRad))
  const { minY, maxY } = polyBounds(rotated)

  const stitches: StitchPair[] = []
  let row = 0

  for (let y = minY; y <= maxY + density; y += density) {
    const xs = scanlineIntersect(y, rotated)
    if (xs.length < 2) { row++; continue }

    // Row offset — shifts stitches for tatami texture
    const offset = row % 2 === 0 ? 0 : stitchLength * (rowOffset ?? 0.5)

    for (let i = 0; i + 1 < xs.length; i += 2) {
      let x0 = xs[i]
      const x1 = xs[i + 1]
      if (Math.abs(x1 - x0) < 0.05) continue

      // Start offset for this row
      let startX = x0 + offset
      if (startX > x1) startX = x0

      // Split into individual stitches of max stitchLength
      let cx = startX
      while (cx < x1) {
        const ex = Math.min(cx + stitchLength, x1)
        const start = rotatePoint({ x: cx, y }, angleRad)
        const end = rotatePoint({ x: ex, y }, angleRad)
        stitches.push([start, end])
        cx = ex
      }
    }
    row++
  }

  return stitches
}
