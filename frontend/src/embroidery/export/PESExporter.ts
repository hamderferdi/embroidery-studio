/**
 * PESExporter — client-side PES (Brother) file generator.
 *
 * Produces a Truncated PES v1 file: the minimal Brother format that
 * real embroidery machines read from USB/CF cards.  All stitch
 * positioning lives in the PEC block which this encoder generates
 * from scratch — no Python backend required.
 *
 * Reference: pyembroidery PesWriter.py + PecWriter.py (source-verified).
 *
 * Machine-control sequences match the DST reference (same hardware logic):
 *  • Tie-off  — 3-stitch backtack (−3,−3,+5) along last stitch axis
 *  • Trim+travel — TRIM_CODE move to next object
 *  • Tie-in   — anchor stitch + 3-stitch triangle lock
 *
 * PEC stitch encoding:
 *  • Small delta   [−63, 62]: 1 byte  — value & 0x7F
 *  • Large delta  otherwise : 2 bytes — (0x8000 | flag<<8 | (v & 0xFFF)) split hi/lo
 *      flag 0x10 = JUMP,  flag 0x20 = TRIM,  flag 0x00 = normal stitch
 *  • END: 0xFF
 */

import { PX_PER_MM } from '../../store/canvasStore'

const TO_TENTH_MM   = 10 / PX_PER_MM
const JUMP_CODE     = 0x10
const TRIM_CODE     = 0x20
const PEC_ICW       = 6
const PEC_ICH       = 38
const THUMBNAIL_SZ  = PEC_ICW * PEC_ICH
const MAX_DELTA     = 2047

// Tie stitch lengths in 1/10 mm
const TIE_BACK = 3    // backtack distance
const TIE_FWD  = 5    // forward distance (net ≈ −1 unit)

// ── Public API ─────────────────────────────────────────────────────────────────

export function exportPES(
  stitches: { x: number; y: number; type: string }[],
  label    = 'Design',
): Uint8Array {
  if (stitches.length === 0) return new Uint8Array(0)

  // ── Strip EmbroideryEngine tie stitches — we generate our own ────────────────
  const filtered = stitches.filter(s => s.type !== 'tie-in' && s.type !== 'tie-off')

  // ── Convert world-px → 1/10 mm (no Y flip — PES viewers handle orientation) ──
  const pts = filtered.map(s => ({
    x:    Math.round(s.x * TO_TENTH_MM),
    y:    Math.round(s.y * TO_TENTH_MM),
    jump: s.type === 'jump',
  }))
  if (pts.length === 0) return new Uint8Array(0)

  // ── Extents for PEC block header ─────────────────────────────────────────────
  let minX =  Infinity, maxX = -Infinity
  let minY =  Infinity, maxY = -Infinity
  for (const p of pts) {
    if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x
    if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y
  }
  const width  = Math.max(0, maxX - minX)
  const height = Math.max(0, maxY - minY)

  // ── PEC stitch data ──────────────────────────────────────────────────────────
  const stitchBytes: number[] = []
  pecEncode(pts, stitchBytes)

  // ── PEC block ────────────────────────────────────────────────────────────────
  const blockLen = 16 + stitchBytes.length
  const pecBlock = new Uint8Array(blockLen)
  let i = 0
  pecBlock[i++] = 0x00
  pecBlock[i++] = 0x00
  pecBlock[i++] = blockLen & 0xFF
  pecBlock[i++] = (blockLen >> 8) & 0xFF
  pecBlock[i++] = (blockLen >> 16) & 0xFF
  pecBlock[i++] = 0x31
  pecBlock[i++] = 0xFF
  pecBlock[i++] = 0xF0
  pecBlock[i++] = width  & 0xFF;  pecBlock[i++] = (width  >> 8) & 0xFF
  pecBlock[i++] = height & 0xFF;  pecBlock[i++] = (height >> 8) & 0xFF
  pecBlock[i++] = 0xE0; pecBlock[i++] = 0x01
  pecBlock[i++] = 0xB0; pecBlock[i++] = 0x01
  for (const b of stitchBytes) pecBlock[i++] = b

  // ── PEC header (512 bytes) ────────────────────────────────────────────────────
  const pecHeader = new Uint8Array(512).fill(0x20)
  const enc = new TextEncoder()
  const nameStr = `LA:${label.slice(0, 8).padEnd(16, ' ')}\r`
  pecHeader.set(enc.encode(nameStr), 0)
  pecHeader[32] = 0xFF
  pecHeader[33] = 0x00
  pecHeader[34] = PEC_ICW
  pecHeader[35] = PEC_ICH
  pecHeader[48] = 0x00
  pecHeader[49] = 0x01

  // ── PEC thumbnails (blank) ────────────────────────────────────────────────────
  const pecGfx = new Uint8Array(THUMBNAIL_SZ * 2)

  // ── Truncated PES v1 file header (22 bytes) ───────────────────────────────────
  const PEC_OFFSET = 22
  const pesHdr = new Uint8Array(PEC_OFFSET)
  pesHdr.set(enc.encode('#PES0001'), 0)
  pesHdr[8]  = PEC_OFFSET & 0xFF
  pesHdr[9]  = (PEC_OFFSET >> 8)  & 0xFF
  pesHdr[10] = (PEC_OFFSET >> 16) & 0xFF
  pesHdr[11] = (PEC_OFFSET >> 24) & 0xFF

  // ── Assemble ─────────────────────────────────────────────────────────────────
  const total  = pesHdr.length + pecHeader.length + pecBlock.length + pecGfx.length
  const result = new Uint8Array(total)
  let pos = 0
  result.set(pesHdr,    pos); pos += pesHdr.length
  result.set(pecHeader, pos); pos += pecHeader.length
  result.set(pecBlock,  pos); pos += pecBlock.length
  result.set(pecGfx,    pos)
  return result
}

// ── PEC stitch encoder ─────────────────────────────────────────────────────────

function pecEncode(
  pts:  { x: number; y: number; jump: boolean }[],
  out:  number[],
): void {
  let xx = 0, yy = 0
  let lastDx = 0, lastDy = 0   // direction tracking for tie-off
  let wasJumping = true         // machine starts idle

  for (let i = 0; i < pts.length; i++) {
    const pt  = pts[i]
    const dx  = pt.x - xx
    const dy  = pt.y - yy

    if (pt.jump) {
      if (!wasJumping) {
        // ── Tie-off before trim ─────────────────────────────────────────────
        const net = pecTieOff(out, lastDx, lastDy)
        xx += net.x; yy += net.y
      }
      // ── Trim + travel ───────────────────────────────────────────────────────
      writeMovement(out, pt.x - xx, pt.y - yy, TRIM_CODE)
      xx = pt.x; yy = pt.y
      wasJumping = true

    } else {
      if (wasJumping) {
        // ── Tie-in after landing ────────────────────────────────────────────
        // Travel to this stitch as a final JUMP, then anchor + backtack
        writeMovement(out, dx, dy, JUMP_CODE)
        xx = pt.x; yy = pt.y

        // Direction for backtack = direction to next main stitch
        const fwd = findFirstMainStitch(pts, i + 1, xx, yy)
        const ndx = fwd ? fwd.x - xx : dx
        const ndy = fwd ? fwd.y - yy : dy
        const net = pecTieIn(out, ndx, ndy)
        xx += net.x; yy += net.y
        wasJumping = false

      } else {
        // ── Normal stitch ───────────────────────────────────────────────────
        writeMovement(out, dx, dy, 0)
        xx = pt.x; yy = pt.y
        lastDx = dx; lastDy = dy
      }
    }
  }

  // Final tie-off
  if (!wasJumping) pecTieOff(out, lastDx, lastDy)

  out.push(0xFF)   // PEC END marker
}

// ── Tie-off / tie-in helpers ───────────────────────────────────────────────────

function pecTieOff(
  out: number[],
  dx:  number, dy: number,
): { x: number; y: number } {
  const len = Math.sqrt(dx * dx + dy * dy)
  if (len < 1e-6) return { x: 0, y: 0 }
  const ux = dx / len, uy = dy / len
  const bx = Math.round(-TIE_BACK * ux), by = Math.round(-TIE_BACK * uy)
  const fx = Math.round( TIE_FWD  * ux), fy = Math.round( TIE_FWD  * uy)
  writeValue(out, bx, false, 0); writeValue(out, by, false, 0)
  writeValue(out, bx, false, 0); writeValue(out, by, false, 0)
  writeValue(out, fx, false, 0); writeValue(out, fy, false, 0)
  return { x: 2 * bx + fx, y: 2 * by + fy }
}

function pecTieIn(
  out: number[],
  ndx: number, ndy: number,
): { x: number; y: number } {
  // Anchor stitch at landing point
  writeValue(out, 0, false, 0); writeValue(out, 0, false, 0)
  const len = Math.sqrt(ndx * ndx + ndy * ndy)
  if (len < 1e-6) return { x: 0, y: 0 }
  const ux = ndx / len, uy = ndy / len
  const bx = Math.round( TIE_BACK * ux), by = Math.round( TIE_BACK * uy)
  const fx = Math.round(-TIE_FWD  * ux), fy = Math.round(-TIE_FWD  * uy)
  writeValue(out, bx, false, 0); writeValue(out, by, false, 0)
  writeValue(out, bx, false, 0); writeValue(out, by, false, 0)
  writeValue(out, fx, false, 0); writeValue(out, fy, false, 0)
  return { x: 2 * bx + fx, y: 2 * by + fy }
}

// ── Look-ahead ────────────────────────────────────────────────────────────────

const MIN_MAIN_DIST = 8

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
  for (let j = from; j < pts.length; j++) {
    if (!pts[j].jump) return pts[j]
  }
  return null
}

// ── PEC value encoder ─────────────────────────────────────────────────────────

/**
 * Emit one or more PEC records for a single (dx, dy) delta.
 * Chains when |delta| > MAX_DELTA.
 */
function writeMovement(out: number[], dx: number, dy: number, flag: number): void {
  while (Math.abs(dx) > MAX_DELTA || Math.abs(dy) > MAX_DELTA) {
    const sdx = clampDelta(dx)
    const sdy = clampDelta(dy)
    writeValue(out, sdx, true, flag)
    writeValue(out, sdy, true, flag)
    dx -= sdx
    dy -= sdy
  }
  const forceLong = flag !== 0
  writeValue(out, dx, forceLong, flag)
  writeValue(out, dy, forceLong, flag)
}

/**
 * Encode a single axis delta.
 * Small (−63..62, non-forced): 1 byte = v & 0x7F
 * Large: 2 bytes = (0x8000 | flag<<8 | (v & 0x0FFF)) hi/lo
 */
function writeValue(out: number[], value: number, long: boolean, flag: number): void {
  if (!long && value > -64 && value < 63) {
    out.push(value & 0x7F)
  } else {
    const v = (value & 0x0FFF) | 0x8000 | (flag << 8)
    out.push((v >> 8) & 0xFF)
    out.push( v       & 0xFF)
  }
}

function clampDelta(v: number): number {
  return Math.sign(v) * Math.min(Math.abs(v), MAX_DELTA)
}
