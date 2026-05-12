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
 * PEC stitch encoding:
 *  • Small delta   [-63, 62]: 1 byte  — value & 0x7F
 *  • Large delta  otherwise : 2 bytes — (0x8000 | flag<<8 | (v & 0xFFF)) split into hi/lo
 *      flag 0x10 = JUMP,  flag 0x20 = TRIM,  flag 0x00 = normal stitch
 *  • END: 0xFF
 */

import { PX_PER_MM } from '../../store/canvasStore'

const TO_TENTH_MM   = 10 / PX_PER_MM   // world-px → 1/10 mm
const JUMP_CODE     = 0x10
const TRIM_CODE     = 0x20
const PEC_ICW       = 6                 // PEC_ICON_WIDTH / 8  (48 px / 8 = 6 bytes)
const PEC_ICH       = 38               // PEC_ICON_HEIGHT
const THUMBNAIL_SZ  = PEC_ICW * PEC_ICH  // 228 bytes per colour thumbnail
const MAX_DELTA     = 2047              // 12-bit signed max

// ── Public API ─────────────────────────────────────────────────────────────────

/**
 * Convert a flat compiled stitch sequence into a PES (Brother) file binary.
 *
 * @param stitches  Output of flattenForExport() — {x, y, type} in world pixels
 * @param label     Design name (max 8 chars in PEC header)
 */
export function exportPES(
  stitches: { x: number; y: number; type: string }[],
  label    = 'Design',
): Uint8Array {
  if (stitches.length === 0) return new Uint8Array(0)

  // ── Convert world-px → 1/10 mm, flip Y ──────────────────────────────────────
  const pts = stitches.map(s => ({
    x:    Math.round( s.x * TO_TENTH_MM),
    y:    Math.round(-s.y * TO_TENTH_MM),   // Y-up for Brother machines
    jump: s.type === 'jump',
  }))

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
  // 16-byte fixed header + stitch data; block length written at bytes 2-4.
  const blockLen = 16 + stitchBytes.length
  const pecBlock = new Uint8Array(blockLen)
  let i = 0
  pecBlock[i++] = 0x00
  pecBlock[i++] = 0x00
  // uint24 LE block length (bytes 2-4)
  pecBlock[i++] = blockLen & 0xFF
  pecBlock[i++] = (blockLen >> 8) & 0xFF
  pecBlock[i++] = (blockLen >> 16) & 0xFF
  pecBlock[i++] = 0x31
  pecBlock[i++] = 0xFF
  pecBlock[i++] = 0xF0
  // width / height (uint16 LE each)
  pecBlock[i++] = width  & 0xFF;  pecBlock[i++] = (width  >> 8) & 0xFF
  pecBlock[i++] = height & 0xFF;  pecBlock[i++] = (height >> 8) & 0xFF
  // magic constants 0x01E0, 0x01B0
  pecBlock[i++] = 0xE0; pecBlock[i++] = 0x01
  pecBlock[i++] = 0xB0; pecBlock[i++] = 0x01
  for (const b of stitchBytes) pecBlock[i++] = b

  // ── PEC header (512 bytes) ────────────────────────────────────────────────────
  // "LA:name_padded_to_16_chars\r" then fixed fields and colour table.
  const pecHeader = new Uint8Array(512).fill(0x20)   // default fill = space
  const enc = new TextEncoder()
  // Label: "LA:" + up-to-8-char name padded to 16 + CR = 20 bytes
  const nameStr = `LA:${label.slice(0, 8).padEnd(16, ' ')}\r`
  pecHeader.set(enc.encode(nameStr), 0)
  // Fixed marker at bytes 32-33
  pecHeader[32] = 0xFF
  pecHeader[33] = 0x00
  // Icon dimensions at bytes 34-35
  pecHeader[34] = PEC_ICW    // 6
  pecHeader[35] = PEC_ICH    // 38
  // bytes 36-47: already 0x20 (12 padding spaces before colour table)
  // Colour table (1 thread): [count-1=0, palette_index]
  pecHeader[48] = 0x00       // colour_count - 1 = 0 for single thread
  pecHeader[49] = 0x01       // palette index (1 = dark red; visually arbitrary)
  // bytes 50-511: already 0x20

  // ── PEC thumbnails (blank — 228 bytes each × 2 for 1-colour design) ──────────
  const pecGfx = new Uint8Array(THUMBNAIL_SZ * 2)   // all zeros = empty thumbnails

  // ── Truncated PES v1 file header (22 bytes) ───────────────────────────────────
  // #PES0001 + uint32 LE PEC offset (=22) + 10 zero bytes
  const PEC_OFFSET = 22
  const pesHdr = new Uint8Array(PEC_OFFSET)
  pesHdr.set(enc.encode('#PES0001'), 0)
  // PEC offset at bytes 8-11
  pesHdr[8]  = PEC_OFFSET & 0xFF
  pesHdr[9]  = (PEC_OFFSET >> 8)  & 0xFF
  pesHdr[10] = (PEC_OFFSET >> 16) & 0xFF
  pesHdr[11] = (PEC_OFFSET >> 24) & 0xFF
  // bytes 12-21: already 0x00

  // ── Assemble ─────────────────────────────────────────────────────────────────
  const total  = pesHdr.length + pecHeader.length + pecBlock.length + pecGfx.length
  const result = new Uint8Array(total)
  let pos = 0
  result.set(pesHdr,   pos); pos += pesHdr.length
  result.set(pecHeader, pos); pos += pecHeader.length
  result.set(pecBlock, pos); pos += pecBlock.length
  result.set(pecGfx,   pos)
  return result
}

// ── PEC stitch encoder ─────────────────────────────────────────────────────────

function pecEncode(
  pts:  { x: number; y: number; jump: boolean }[],
  out:  number[],
): void {
  let xx = 0, yy = 0
  let jumping = true   // machine starts in "needle up / travel" mode
  let init    = true   // first command distinguishes initial jump vs trim-jump

  for (const pt of pts) {
    const dx = pt.x - xx
    const dy = pt.y - yy
    xx = pt.x
    yy = pt.y

    if (pt.jump) {
      jumping = true
      // Initial travels use JUMP_CODE; subsequent use TRIM_CODE (thread cut + move)
      writeMovement(out, dx, dy, init ? JUMP_CODE : TRIM_CODE)
    } else {
      // Stitch
      if (jumping) {
        // After a jump with diagonal movement, the machine needs a "land" stitch
        // at the current position before moving to the needle-down point.
        if (dx !== 0 && dy !== 0) {
          writeValue(out, 0, false, 0)
          writeValue(out, 0, false, 0)
        }
        jumping = false
      }
      writeMovement(out, dx, dy, 0)
    }

    init = false
  }

  out.push(0xFF)  // PEC END marker
}

/**
 * Emit one or more PEC records for a single delta (chains for |delta| > MAX_DELTA).
 * @param flag  0=stitch, JUMP_CODE=jump, TRIM_CODE=trim
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
  // Final (or only) record — for normal stitches use small encoding if possible
  const forceLong = flag !== 0
  writeValue(out, dx, forceLong, flag)
  writeValue(out, dy, forceLong, flag)
}

/**
 * Encode a single axis delta into 1 (small) or 2 (large) bytes.
 *
 * Small:   -63 ≤ v ≤ 62  →  1 byte = v & 0x7F
 * Large:   otherwise      →  2 bytes: (0x8000 | flag<<8 | (v & 0x0FFF)) split hi/lo
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
