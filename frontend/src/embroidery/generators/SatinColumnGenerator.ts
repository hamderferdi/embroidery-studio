import type { Point, StitchPair, SatinColumnObject } from '../types'
import { dist, lerpPoint } from './math'
import { flattenBezierPath } from '../geometry/BezierMath'

/**
 * Generates satin column stitches between two parallel paths.
 * Walks both paths simultaneously, zipping corresponding points together.
 * The density controls how many stitches per unit length.
 */
export function generateSatinColumn(obj: SatinColumnObject): StitchPair[] {
  const leftPath  = flattenBezierPath(obj.leftPath)
  const rightPath = flattenBezierPath(obj.rightPath)
  const { density } = obj
  if (leftPath.length < 2 || rightPath.length < 2) return []

  // Compute total arc length for each path
  const leftLengths = cumulativeLengths(leftPath)
  const rightLengths = cumulativeLengths(rightPath)
  const leftTotal = leftLengths[leftLengths.length - 1]
  const rightTotal = rightLengths[rightLengths.length - 1]
  const avgLength = (leftTotal + rightTotal) / 2

  const stitchCount = Math.max(2, Math.round(avgLength / density))
  const stitches: StitchPair[] = []

  for (let i = 0; i <= stitchCount; i++) {
    const t = i / stitchCount
    const lp = samplePolyline(leftPath, leftLengths, t * leftTotal)
    const rp = samplePolyline(rightPath, rightLengths, t * rightTotal)
    stitches.push([lp, rp])
  }

  return stitches
}

function cumulativeLengths(pts: Point[]): number[] {
  const lens = [0]
  for (let i = 1; i < pts.length; i++) {
    lens.push(lens[i - 1] + dist(pts[i - 1], pts[i]))
  }
  return lens
}

function samplePolyline(pts: Point[], lens: number[], targetLen: number): Point {
  if (targetLen <= 0) return { ...pts[0] }
  const total = lens[lens.length - 1]
  if (targetLen >= total) return { ...pts[pts.length - 1] }

  for (let i = 1; i < lens.length; i++) {
    if (lens[i] >= targetLen) {
      const segLen = lens[i] - lens[i - 1]
      const t = segLen < 1e-10 ? 0 : (targetLen - lens[i - 1]) / segLen
      return lerpPoint(pts[i - 1], pts[i], t)
    }
  }
  return { ...pts[pts.length - 1] }
}
