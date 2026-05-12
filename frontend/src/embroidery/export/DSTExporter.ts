/**
 * DSTExporter — client-side DST (Tajima) file generator.
 *
 * Format overview:
 *  • 512-byte ASCII header with design metadata
 *  • Body: 3 bytes per stitch record (relative coordinates, 1/10 mm)
 *  • Coordinates: balanced-ternary ±{1,3,9,27} per axis; max ±40 per record
 *  • Larger moves chain multiple records
 *  • Y axis: DST is Y-up → negate dy
 *  • End record: 0x00 0x00 0xF3
 *
 * Machine-control sequences (reverse-engineered from reference hardware files):
 *  • Tie-off  — 3-stitch backtack along last stitch axis: (−3,−3,+5) units
 *  • Wobble   — 3 zero-net JUMP records before every travel: (+4,+4,−8)
 *  • Tie-in   — 0x07 anchor stitch + 3 small stitches forming a triangle lock
 *  • Jump cmd bytes — 0x83 for single/first/last record, 0x8b for chain midpoints
 */

import { PX_PER_MM } from '../../store/canvasStore'

const TO_TENTH_MM = 10 / PX_PER_MM   // world-px → 1/10 mm
const MAX_STEP    = 40                // max delta per DST record in each axis

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Convert a flat compiled stitch sequence into a DST file binary.
 *
 * @param stitches  Output of flattenForExport() — {x, y, type} in world pixels
 * @param label     Optional design name (max 14 chars)
 */
export function exportDST(
  stitches: { x: number; y: number; type: string }[],
  label    = 'Design',
): Uint8Array {
  if (stitches.length === 0) return new Uint8Array(0)

  // ── Filter tie-in / tie-off — we generate our own machine-correct versions ──
  const filtered = stitches.filter(s => s.type !== 'tie-in' && s.type !== 'tie-off')

  // ── Convert to 1/10 mm, flip Y for DST orientation ─────────────────────────
  const pts = filtered.map(s => ({
    x:    Math.round( s.x * TO_TENTH_MM),
    y:    Math.round(-s.y * TO_TENTH_MM),   // Y-up for DST
    jump: s.type === 'jump',
  }))
  if (pts.length === 0) return new Uint8Array(0)

  // ── Compute extents for header ───────────────────────────────────────────────
  let minX =  Infinity, maxX = -Infinity
  let minY =  Infinity, maxY = -Infinity
  for (const p of pts) {
    if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y
  }

  // ── Build stitch body ────────────────────────────────────────────────────────
  const records: number[] = []
  let cx = 0, cy = 0
  let lastDx = 0, lastDy = 0     // direction of last emitted stitch (for tie-off)
  let wasJumping = true           // machine starts in travel/idle mode

  for (let i = 0; i < pts.length; i++) {
    const pt = pts[i]
    const dx = pt.x - cx
    const dy = pt.y - cy

    if (pt.jump) {
      if (!wasJumping) {
        // ── Tie-off: 3-stitch backtack along last stitch direction ──────────
        const net = emitTieOff(records, lastDx, lastDy)
        cx += net.x; cy += net.y
        // ── Wobble: zero-net jump to help thread cutter engage ──────────────
        emitWobble(records)
      }
      // ── Jump travel ────────────────────────────────────────────────────────
      addJumpRecords(records, pt.x - cx, pt.y - cy)
      cx = pt.x; cy = pt.y
      wasJumping = true

    } else {
      if (wasJumping) {
        // ── First stitch after jump: travel as jump records + tie-in ─────────
        // Travel to this stitch's position entirely as jumps
        addJumpRecords(records, dx, dy)
        cx = pt.x; cy = pt.y

        // Look ahead for direction of first MAIN stitch (skip any that are
        // very close — these are the EmbroideryEngine's return-to-anchor stitches)
        const fwd = findFirstMainStitch(pts, i + 1, cx, cy)
        const ndx = fwd ? fwd.x - cx : dx
        const ndy = fwd ? fwd.y - cy : dy

        const net = emitTieIn(records, ndx, ndy)
        cx += net.x; cy += net.y
        wasJumping = false
        // Don't record lastDx/lastDy here — the next loop iteration will do it

      } else {
        // ── Normal stitch ─────────────────────────────────────────────────────
        addRecord(records, dx, dy, 0x03)
        cx = pt.x; cy = pt.y
        lastDx = dx; lastDy = dy
      }
    }
  }

  // ── Final tie-off at end of design ──────────────────────────────────────────
  if (!wasJumping) {
    emitTieOff(records, lastDx, lastDy)
  }

  records.push(0x00, 0x00, 0xF3)   // END record

  // ── Build 512-byte ASCII header ──────────────────────────────────────────────
  const header = new Uint8Array(512).fill(0x20)
  const enc    = new TextEncoder()
  let pos      = 0

  const write = (s: string) => { const b = enc.encode(s); header.set(b, pos); pos += b.length }
  const cr    = () => { header[pos++] = 0x0D }
  const pad   = (n: number, w: number) => String(Math.max(0, Math.round(n))).padStart(w, '0')

  const stitchCount = records.length / 3 - 1   // excludes END record
  const lbl = label.slice(0, 14).padEnd(14, ' ')
  write(`LA:${lbl}`); cr()
  write(`ST:${pad(stitchCount, 7)}`); cr()
  write(`CO:00`); cr()
  write(`+X:${pad(maxX,              5)}`); cr()
  write(`-X:${pad(minX < 0 ? -minX : 0, 5)}`); cr()
  write(`+Y:${pad(maxY,              5)}`); cr()
  write(`-Y:${pad(minY < 0 ? -minY : 0, 5)}`); cr()

  const axSign = cx >= 0 ? '+' : '-'
  const aySign = cy >= 0 ? '+' : '-'
  write(`AX:${axSign}${pad(Math.abs(cx), 5)}`); cr()
  write(`AY:${aySign}${pad(Math.abs(cy), 5)}`); cr()
  write(`MX:+00000`); cr()
  write(`MY:+00000`); cr()
  write(`PD:******`); cr()
  header[pos] = 0x1A   // Ctrl-Z

  // ── Assemble ─────────────────────────────────────────────────────────────────
  const result = new Uint8Array(512 + records.length)
  result.set(header)
  result.set(new Uint8Array(records), 512)
  return result
}

// ── Machine-control emitters ───────────────────────────────────────────────────

/**
 * Emit 3-stitch backtack tie-off along the direction of the last stitch.
 * Pattern: −3, −3, +5 (net ≈ −1 unit along axis — nearly in place).
 */
function emitTieOff(
  out: number[],
  dx: number, dy: number,
): { x: number; y: number } {
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len < 1e-6) return { x: 0, y: 0 }
  const ux = dx / len, uy = dy / len
  const bx = Math.round(-3 * ux), by = Math.round(-3 * uy)
  const fx = Math.round( 5 * ux), fy = Math.round( 5 * uy)
  addRecord(out, bx, by, 0x03)
  addRecord(out, bx, by, 0x03)
  addRecord(out, fx, fy, 0x03)
  return { x: 2 * bx + fx, y: 2 * by + fy }
}

/**
 * Emit 3-record zero-net wobble jump.
 * Helps the thread-cutter mechanism engage reliably before a trim.
 */
function emitWobble(out: number[]): void {
  addRecord(out,  4, 0, 0x83)
  addRecord(out,  4, 0, 0x83)
  addRecord(out, -8, 0, 0x83)
}

/**
 * Emit tie-in at the current position: 0x07 anchor stitch + 3-stitch
 * triangle backtack oriented along the direction of the first main stitch.
 * Returns net displacement so the caller can update cx/cy.
 */
function emitTieIn(
  out: number[],
  ndx: number, ndy: number,
): { x: number; y: number } {
  // Anchor stitch — marks "needle down, new segment starting"
  addRecord(out, 0, 0, 0x07)

  const len = Math.sqrt(ndx * ndx + ndy * ndy)
  if (len < 1e-6) return { x: 0, y: 0 }
  const ux = ndx / len, uy = ndy / len
  const bx = Math.round(3 * ux), by = Math.round(3 * uy)
  const fx = Math.round(-5 * ux), fy = Math.round(-5 * uy)
  addRecord(out, bx, by, 0x03)
  addRecord(out, bx, by, 0x03)
  addRecord(out, fx, fy, 0x03)
  return { x: 2 * bx + fx, y: 2 * by + fy }
}

// ── Low-level record builders ──────────────────────────────────────────────────

/**
 * Emit one or more jump records for a given delta.
 * Single chunk (≤40 each axis): one 0x83 record.
 * Multi-chunk: 0x83(0,0) init + 0x8b × N chunks + 0x83(0,0) terminator.
 */
function addJumpRecords(out: number[], dx: number, dy: number): void {
  if (dx === 0 && dy === 0) return

  if (Math.abs(dx) <= MAX_STEP && Math.abs(dy) <= MAX_STEP) {
    addRecord(out, dx, dy, 0x83)
    return
  }
  // Multi-chunk travel
  addRecord(out, 0, 0, 0x83)     // initialiser
  let rdx = dx, rdy = dy
  while (Math.abs(rdx) > MAX_STEP || Math.abs(rdy) > MAX_STEP) {
    const sdx = stepClamp(rdx), sdy = stepClamp(rdy)
    addRecord(out, sdx, sdy, 0x8b)
    rdx -= sdx; rdy -= sdy
  }
  addRecord(out, rdx, rdy, 0x8b)  // final chunk
  addRecord(out, 0, 0, 0x83)      // terminator
}

/** Emit a single 3-byte DST record. */
function addRecord(out: number[], dx: number, dy: number, cmd: number): void {
  const [b1, b2] = encodeDelta(dx, dy)
  out.push(b1, b2, cmd)
}

// ── Look-ahead helper ─────────────────────────────────────────────────────────

/**
 * Find the first non-jump stitch ahead that is at least MIN_MAIN_DIST units
 * away from (cx, cy) — skipping tiny return-to-anchor stitches that
 * EmbroideryEngine appends as the last tie-in pair.
 */
const MIN_MAIN_DIST = 8   // 0.8 mm in 1/10mm units

function findFirstMainStitch(
  pts:  { x: number; y: number; jump: boolean }[],
  from: number,
  cx:   number,
  cy:   number,
): { x: number; y: number } | null {
  for (let j = from; j < pts.length; j++) {
    if (pts[j].jump) break
    const dx = pts[j].x - cx, dy = pts[j].y - cy
    if (Math.sqrt(dx * dx + dy * dy) >= MIN_MAIN_DIST) return pts[j]
  }
  // Fall back to the very next non-jump stitch
  for (let j = from; j < pts.length; j++) {
    if (!pts[j].jump) return pts[j]
  }
  return null
}

// ── Coordinate encoder ─────────────────────────────────────────────────────────

/**
 * Encode a relative delta (max ±40 in each axis) into two DST data bytes.
 *
 * Bit layout:
 *   Byte 1:  [y+1][y-1][y+9][y-9][x-9][x+9][x-1][x+1]
 *   Byte 2:  [y+3][y-3][y+27][y-27][x-27][x+27][x-3][x+3]
 *
 * Balanced-ternary decomposition — all integers in [−40, 40] are exact.
 */
function encodeDelta(dx: number, dy: number): [number, number] {
  let b1 = 0, b2 = 0

  // ── X axis ─────────────────────────────────────────────────────────────────
  let ax = dx
  const x27 = ax > 13 ? 1 : ax < -13 ? -1 : 0;  ax -= x27 * 27
  const x9  = ax >  4 ? 1 : ax <  -4 ? -1 : 0;  ax -= x9  *  9
  const x3  = ax >  1 ? 1 : ax <  -1 ? -1 : 0;  ax -= x3  *  3
  const x1  = ax >  0 ? 1 : ax <   0 ? -1 : 0

  if (x27 > 0) b2 |= 0x04;  if (x27 < 0) b2 |= 0x08
  if (x9  > 0) b1 |= 0x04;  if (x9  < 0) b1 |= 0x08
  if (x3  > 0) b2 |= 0x01;  if (x3  < 0) b2 |= 0x02
  if (x1  > 0) b1 |= 0x01;  if (x1  < 0) b1 |= 0x02

  // ── Y axis ─────────────────────────────────────────────────────────────────
  let ay = dy
  const y27 = ay > 13 ? 1 : ay < -13 ? -1 : 0;  ay -= y27 * 27
  const y9  = ay >  4 ? 1 : ay <  -4 ? -1 : 0;  ay -= y9  *  9
  const y3  = ay >  1 ? 1 : ay <  -1 ? -1 : 0;  ay -= y3  *  3
  const y1  = ay >  0 ? 1 : ay <   0 ? -1 : 0

  if (y27 > 0) b2 |= 0x20;  if (y27 < 0) b2 |= 0x10
  if (y9  > 0) b1 |= 0x20;  if (y9  < 0) b1 |= 0x10
  if (y3  > 0) b2 |= 0x80;  if (y3  < 0) b2 |= 0x40
  if (y1  > 0) b1 |= 0x80;  if (y1  < 0) b1 |= 0x40

  return [b1, b2]
}

function stepClamp(v: number): number {
  return Math.sign(v) * Math.min(Math.abs(v), MAX_STEP)
}
