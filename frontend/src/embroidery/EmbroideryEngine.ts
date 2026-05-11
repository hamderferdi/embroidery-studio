import type { EmbroideryObject, StitchPair } from './types'
import { generateSatinFill } from './generators/SatinFillGenerator'
import { generateSatinColumn } from './generators/SatinColumnGenerator'
import { generateTatamiFill } from './generators/TatamiFillGenerator'
import { generateRunStitch } from './generators/RunStitchGenerator'
import { generateLettering } from './text/LetteringEngine'

export function generateStitches(obj: EmbroideryObject): StitchPair[] {
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

export function countStitches(stitches: StitchPair[]): number {
  return stitches.length
}
