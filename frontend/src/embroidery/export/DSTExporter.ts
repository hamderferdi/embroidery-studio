/**
 * DSTExporter — client-side DST (Tajima) file generator.
 *
 * DST is the most universal embroidery format.  We encode it entirely
 * in the browser so no backend is required.
 *
 * Format overview:
 *  • 512-byte ASCII header with design metadata
 *  • Body: 3 bytes per stitch record (relative coordinates, 1/10 mm)
 *  • Coordinates: max ±40 per record; larger moves chain multiple records
 *  • Y axis: DST is Y-up; screen/world coords are Y-down → negate dy
 *  • End record: 0x00 0x00 0xF3
 */

import { PX_PER_MM } from '../../store/canvasStore'

const TO_TENTH_MM = 10 / PX_PER_MM  // world-px → 1/10 mm
const MAX_STEP    = 40               // max delta per DST record in each axis

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Convert a flat compiled stitch sequence into a DST file binary.
 *
 * @param stitches  Output of flattenForExport() — {x, y, type} in world pixels
 * @param label     Optional design name (max 14 chars, truncated if longer)
 */
export function exportDST(
  stitches: { x: number; y: number; type: string }[],
  label    = 'Design',
): Uint8Array {
  if (stitches.length === 0) return new Uint8Array(0)

  // ── Convert to 1/10 mm, flip Y for DST orientation ──────────────────────────
  const pts = stitches.map(s => ({
    x:    Math.round(s.x * TO_TENTH_MM),
    y:    Math.round(-s.y * TO_TENTH_MM),  // Y-up for DST
    jump: s.type === 'jump',
  }))

  // ── Compute extents for header ───────────────────────────────────────────────
  let minX =  Infinity, maxX = -Infinity
  let minY =  Infinity, maxY = -Infinity
  for (const p of pts) {
    if (p.x < minX) minX = p.x
    if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y
    if (p.y > maxY) maxY = p.y
  }

  // ── Build stitch body ────────────────────────────────────────────────────────
  const records: number[] = []
  let cx = 0, cy = 0

  for (const pt of pts) {
    addRecords(records, pt.x - cx, pt.y - cy, pt.jump)
    cx = pt.x
    cy = pt.y
  }
  records.push(0x00, 0x00, 0xF3)  // END record

  // ── Build 512-byte header ────────────────────────────────────────────────────
  const header = new Uint8Array(512).fill(0x20)   // spaces as default padding
  const enc    = new TextEncoder()
  let pos      = 0

  const write = (s: string) => {
    const b = enc.encode(s)
    header.set(b, pos)
    pos += b.length
  }
  const cr = () => { header[pos++] = 0x0D }
  // Zero-pad a non-negative integer to `w` digits
  const pad = (n: number, w: number) => String(Math.max(0, Math.round(n))).padStart(w, '0')

  // Label: exactly 16 chars (14 + \r), padded with spaces
  const lbl = label.slice(0, 14).padEnd(14, ' ')
  write(`LA:${lbl}`); cr()

  // Stitch count (7 digits, not counting the END record)
  write(`ST:${pad(records.length / 3 - 1, 7)}`); cr()

  // Color changes (TODO: count actual color changes; 0 for now)
  write(`CO:00`); cr()

  // Extents in 1/10 mm (always non-negative in header)
  write(`+X:${pad(maxX,           5)}`); cr()
  write(`-X:${pad(minX < 0 ? -minX : 0, 5)}`); cr()
  write(`+Y:${pad(maxY,           5)}`); cr()
  write(`-Y:${pad(minY < 0 ? -minY : 0, 5)}`); cr()

  // End position AX / AY (with explicit sign)
  const axSign = cx >= 0 ? '+' : '-'
  const aySign = cy >= 0 ? '+' : '-'
  write(`AX:${axSign}${pad(Math.abs(cx), 5)}`); cr()
  write(`AY:${aySign}${pad(Math.abs(cy), 5)}`); cr()

  write(`MX:+00000`); cr()
  write(`MY:+00000`); cr()
  write(`PD:******`); cr()
  header[pos] = 0x1A  // Ctrl-Z / EOF marker

  // ── Combine header + body ────────────────────────────────────────────────────
  const result = new Uint8Array(512 + records.length)
  result.set(header)
  result.set(new Uint8Array(records), 512)
  return result
}

// ── Internal record building ───────────────────────────────────────────────────

/**
 * Emit one or more DST records to move from current position by (dx, dy).
 * Movements larger than MAX_STEP are split into chained JUMP records,
 * followed by the final record at the requested command type.
 */
function addRecords(out: number[], dx: number, dy: number, isJump: boolean): void {
  // Chain JUMP records for large moves
  while (Math.abs(dx) > MAX_STEP || Math.abs(dy) > MAX_STEP) {
    const sdx = stepClamp(dx)
    const sdy = stepClamp(dy)
    const [b1, b2] = encodeDelta(sdx, sdy)
    out.push(b1, b2, 0x83)   // intermediate chunk is always JUMP
    dx -= sdx
    dy -= sdy
  }

  const [b1, b2] = encodeDelta(dx, dy)
  out.push(b1, b2, isJump ? 0x83 : 0x03)
}

function stepClamp(v: number): number {
  return Math.sign(v) * Math.min(Math.abs(v), MAX_STEP)
}

/**
 * Encode a relative delta (max ±40 in each axis) into two DST data bytes.
 *
 * Bit layout:
 *   Byte 1:  [y+1][y-1][y+9][y-9][x-9][x+9][x-1][x+1]
 *   Byte 2:  [y+3][y-3][y+27][y-27][x-27][x+27][x-3][x+3]
 *
 * Each power has an independent +/− bit, so mixed-sign combinations like
 * 27−1=26 or 9−3−1=5 are valid.  We use balanced-ternary decomposition so
 * every integer in [−40, 40] is encoded exactly (no precision loss).
 */
function encodeDelta(dx: number, dy: number): [number, number] {
  let b1 = 0, b2 = 0

  // ── X axis — balanced ternary over powers {27, 9, 3, 1} ───────────────────
  let ax = dx
  // For each power choose digit ∈ {−1,0,+1} that keeps remainder encodable.
  const x27 = ax > 13 ? 1 : ax < -13 ? -1 : 0;  ax -= x27 * 27
  const x9  = ax >  4 ? 1 : ax <  -4 ? -1 : 0;  ax -= x9  *  9
  const x3  = ax >  1 ? 1 : ax <  -1 ? -1 : 0;  ax -= x3  *  3
  const x1  = ax >  0 ? 1 : ax <   0 ? -1 : 0

  if (x27 > 0) b2 |= 0x04  // x+27
  if (x27 < 0) b2 |= 0x08  // x-27
  if (x9  > 0) b1 |= 0x04  // x+9
  if (x9  < 0) b1 |= 0x08  // x-9
  if (x3  > 0) b2 |= 0x01  // x+3
  if (x3  < 0) b2 |= 0x02  // x-3
  if (x1  > 0) b1 |= 0x01  // x+1
  if (x1  < 0) b1 |= 0x02  // x-1

  // ── Y axis — same balanced ternary ────────────────────────────────────────
  let ay = dy
  const y27 = ay > 13 ? 1 : ay < -13 ? -1 : 0;  ay -= y27 * 27
  const y9  = ay >  4 ? 1 : ay <  -4 ? -1 : 0;  ay -= y9  *  9
  const y3  = ay >  1 ? 1 : ay <  -1 ? -1 : 0;  ay -= y3  *  3
  const y1  = ay >  0 ? 1 : ay <   0 ? -1 : 0

  if (y27 > 0) b2 |= 0x20  // y+27
  if (y27 < 0) b2 |= 0x10  // y-27
  if (y9  > 0) b1 |= 0x20  // y+9
  if (y9  < 0) b1 |= 0x10  // y-9
  if (y3  > 0) b2 |= 0x80  // y+3
  if (y3  < 0) b2 |= 0x40  // y-3
  if (y1  > 0) b1 |= 0x80  // y+1
  if (y1  < 0) b1 |= 0x40  // y-1

  return [b1, b2]
}
