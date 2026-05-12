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
 */
function encodeDelta(dx: number, dy: number): [number, number] {
  let b1 = 0, b2 = 0

  // ── X axis ─────────────────────────────────────────────────────────────────
  let ax   = Math.abs(dx)
  const xn = dx < 0    // negative direction
  if (ax >= 27) { ax -= 27; b2 |= xn ? 0x08 : 0x04 }
  if (ax >=  9) { ax -=  9; b1 |= xn ? 0x08 : 0x04 }
  if (ax >=  3) { ax -=  3; b2 |= xn ? 0x02 : 0x01 }
  if (ax >=  1) {            b1 |= xn ? 0x02 : 0x01 }

  // ── Y axis ─────────────────────────────────────────────────────────────────
  let ay   = Math.abs(dy)
  const yn = dy < 0
  if (ay >= 27) { ay -= 27; b2 |= yn ? 0x10 : 0x20 }
  if (ay >=  9) { ay -=  9; b1 |= yn ? 0x10 : 0x20 }
  if (ay >=  3) { ay -=  3; b2 |= yn ? 0x40 : 0x80 }
  if (ay >=  1) {            b1 |= yn ? 0x40 : 0x80 }

  return [b1, b2]
}
