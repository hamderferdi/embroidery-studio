import type { StitchPair, RunStitchObject } from '../types'
import { walkPolyline, lerpPoint } from './math'

export function generateRunStitch(obj: RunStitchObject): StitchPair[] {
  const { path, stitchLength, passes } = obj
  if (path.length < 2) return []

  const stitches: StitchPair[] = []
  const pts = walkPolyline(path, stitchLength)

  for (let pass = 0; pass < (passes || 1); pass++) {
    const ordered = pass % 2 === 0 ? pts : [...pts].reverse()
    for (let i = 0; i + 1 < ordered.length; i++) {
      stitches.push([{ ...ordered[i] }, { ...ordered[i + 1] }])
    }
  }

  return stitches
}
