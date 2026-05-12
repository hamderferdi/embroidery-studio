/**
 * MachineCompiler — converts the editor's EmbroideryObject list into a flat
 * sequence of MachineStitch instructions ready for export or debug rendering.
 *
 * The SAME output is used for both rendering (StitchPointLayer / debug mode)
 * AND for DST/PES export. There is no separate "preview stitch" vs "real stitch".
 *
 * Pipeline:
 *  1. Nearest-neighbour object sequencing (minimises jump travel)
 *  2. Group colour-adjacent objects to minimise colour changes
 *  3. Between objects: insert jump stitches + trim if gap > JUMP_THRESH
 *  4. At each colour change: insert trim + color-change command
 *  5. Wrap each object's stitches as 'normal' MachineStitch records
 *  6. Mark tie-in / tie-off stitches by type (they're already in StitchPair[])
 */

import type { EmbroideryObject, MachineStitch, MachineStitchType, ThreadColor, StitchPair } from './types'
import { PX_PER_MM } from '../store/canvasStore'

// Jump stitches longer than this become trim + jump sequences
const JUMP_THRESH_MM  = 3.0
const JUMP_THRESH_PX  = JUMP_THRESH_MM * PX_PER_MM

// Number of tie-in / tie-off pairs generated per object (must match EmbroideryEngine)
const TIE_STITCH_COUNT = 4   // 4 extra StitchPairs prepended (tie-in) + 4 appended (tie-off)

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Compile all embroidery objects into a flat MachineStitch sequence.
 * Only visible objects with stitches are included.
 */
export function compileMachineStitches(
  objects: EmbroideryObject[],
): MachineStitch[] {
  const visible = objects.filter(o => o.visible && (o.stitches?.length ?? 0) > 0)
  if (visible.length === 0) return []

  // 1. Sequence objects (nearest-neighbour travel minimisation)
  const sequenced = sequenceObjects(visible)

  const result: MachineStitch[] = []
  let currentPos = { x: 0, y: 0 }
  let currentColor: string | null = null
  let layerIndex = 0

  for (const obj of sequenced) {
    const stitches = obj.stitches!
    const entry    = stitches[0][0]

    // 2. Gap between current position and object entry
    const gapDx  = entry.x - currentPos.x
    const gapDy  = entry.y - currentPos.y
    const gapLen = Math.sqrt(gapDx * gapDx + gapDy * gapDy)

    if (result.length > 0 && gapLen > 0.1) {
      if (gapLen > JUMP_THRESH_PX) {
        // Long gap: trim + jump
        result.push(makeCommand('trim',        currentPos, obj.color, obj.id, layerIndex))
        result.push(makeJump(currentPos, entry, obj.color, obj.id, layerIndex))
      } else {
        // Short gap: single jump stitch
        result.push(makeJump(currentPos, entry, obj.color, obj.id, layerIndex))
      }
    }

    // 3. Colour change
    if (currentColor !== null && currentColor !== obj.color.hex) {
      result.push(makeCommand('trim',         entry, obj.color, obj.id, layerIndex))
      result.push(makeCommand('color-change', entry, obj.color, obj.id, layerIndex))
    }
    currentColor = obj.color.hex

    // 4. Expand StitchPairs → MachineStitch records
    const hasTieIn  = obj.tieIn
    const hasTieOff = obj.tieOff
    const tieInEnd  = hasTieIn  ? TIE_STITCH_COUNT : 0
    const tieOffStart = hasTieOff ? stitches.length - TIE_STITCH_COUNT : stitches.length

    for (let i = 0; i < stitches.length; i++) {
      const [a, b] = stitches[i]
      let type: MachineStitchType = 'normal'
      if (hasTieIn  && i < tieInEnd)      type = 'tie-in'
      if (hasTieOff && i >= tieOffStart)  type = 'tie-off'

      const dx   = b.x - a.x
      const dy   = b.y - a.y
      const lenPx = Math.sqrt(dx * dx + dy * dy)

      result.push({
        x:           a.x,
        y:           a.y,
        type,
        color:       obj.color,
        angleDeg:    Math.atan2(dy, dx) * 180 / Math.PI,
        lengthMm:    lenPx / PX_PER_MM,
        objectId:    obj.id,
        stitchIndex: i,
        layerIndex,
      })
    }

    // Advance position to last needle-up
    const last = stitches[stitches.length - 1]
    currentPos = { ...last[1] }
    layerIndex++
  }

  // End of design
  result.push(makeCommand('trim', currentPos, sequenced[sequenced.length - 1].color, '', layerIndex))

  return result
}

/**
 * Flatten compiled MachineStitch[] for export to the backend.
 * Returns only the (x, y, type) needed by DST/PES generators.
 */
export function flattenForExport(
  stitches: MachineStitch[],
): { x: number; y: number; type: string }[] {
  return stitches
    .filter(s => s.type !== 'trim' && s.type !== 'color-change')  // commands have no position
    .map(s => ({ x: s.x, y: s.y, type: s.type }))
}

// ── Nearest-neighbour object sequencing ───────────────────────────────────────

function sequenceObjects(objects: EmbroideryObject[]): EmbroideryObject[] {
  if (objects.length <= 1) return [...objects]

  const remaining = [...objects]
  const result:    EmbroideryObject[] = []
  let   curX = 0, curY = 0

  while (remaining.length > 0) {
    let bestIdx  = 0
    let bestDist = Infinity

    for (let i = 0; i < remaining.length; i++) {
      const entry = remaining[i].entryPoint ?? remaining[i].stitches?.[0]?.[0]
      if (!entry) continue
      const d = dist(curX, curY, entry.x, entry.y)
      if (d < bestDist) { bestDist = d; bestIdx = i }
    }

    const obj  = remaining.splice(bestIdx, 1)[0]
    const exit = obj.exitPoint ?? obj.stitches?.[obj.stitches.length - 1]?.[1]
    if (exit) { curX = exit.x; curY = exit.y }
    result.push(obj)
  }

  return result
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeCommand(
  type: MachineStitchType,
  pos:  { x: number; y: number },
  color: ThreadColor,
  objId: string,
  layer: number,
): MachineStitch {
  return { x: pos.x, y: pos.y, type, color, angleDeg: 0, lengthMm: 0, objectId: objId, stitchIndex: -1, layerIndex: layer }
}

function makeJump(
  from: { x: number; y: number },
  to:   { x: number; y: number },
  color: ThreadColor,
  objId: string,
  layer: number,
): MachineStitch {
  const dx  = to.x - from.x
  const dy  = to.y - from.y
  const len = Math.sqrt(dx * dx + dy * dy)
  return {
    x:           from.x,
    y:           from.y,
    type:        'jump',
    color,
    angleDeg:    Math.atan2(dy, dx) * 180 / Math.PI,
    lengthMm:    len / PX_PER_MM,
    objectId:    objId,
    stitchIndex: -1,
    layerIndex:  layer,
  }
}

function dist(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}
