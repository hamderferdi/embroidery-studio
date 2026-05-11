import * as PIXI from 'pixi.js'
import type { StitchPair, ThreadColor } from '../../embroidery/types'

/**
 * StitchRenderer — crisp, embroidery-authentic thread rendering.
 *
 * Rendering passes (back to front):
 *  1. Edge outline  — slightly wider, darkened line at SAME position.
 *                     Creates a thin shadow border on thread sides (no float).
 *  2. Thread body   — solid thread color, SQUARE caps (crisp needle-point ends).
 *  3. Specular sheen — narrow lighter stripe, perpendicular offset (rayon sheen).
 *
 * KEY DIFFERENCES from naive approach:
 *  ✗ NO offset shadow  → no pillow / floating / inflated look
 *  ✗ NO round caps     → no blob / capsule shapes
 *  ✓ SQUARE caps       → thread ends flush at needle entry point
 *  ✓ Narrow sheen      → directional specular, not a soft glow
 *  ✓ Edge from outline → depth comes from width difference, not position offset
 */

// Thread is rendered in world-space at physical thread diameter (~0.40mm).
// pixi-viewport zoom scales the world so visual size tracks zoom correctly.
const THREAD_WORLD_W  = 1.5    // world-px ≈ 0.40mm — physical thread diameter
const OUTLINE_RATIO   = 1.44   // edge outline = 44% wider than body
const SHEEN_RATIO     = 0.21   // specular stripe width (fraction of thread width)
const SHEEN_PERP_FRAC = 0.28   // perpendicular offset of sheen (fraction of thread width)
const OUTLINE_ALPHA   = 0.34   // edge outline darkness
const SHEEN_ALPHA     = 0.48   // specular brightness

export class StitchRenderer {
  private outline:   PIXI.Graphics   // pass 1: wide dark edge
  private body:      PIXI.Graphics   // pass 2: thread color, square caps
  private sheen:     PIXI.Graphics   // pass 3: specular highlight
  private container: PIXI.Container

  constructor() {
    this.container = new PIXI.Container()
    this.outline   = new PIXI.Graphics()
    this.body      = new PIXI.Graphics()
    this.sheen     = new PIXI.Graphics()
    this.container.addChild(this.outline, this.body, this.sheen)
  }

  get displayObject(): PIXI.Container { return this.container }

  clear() {
    this.outline.clear()
    this.body.clear()
    this.sheen.clear()
  }

  render(stitches: StitchPair[], color: ThreadColor, _zoom: number) {
    this.clear()
    if (!stitches || stitches.length === 0) return

    const tw        = THREAD_WORLD_W
    const outlineW  = tw * OUTLINE_RATIO
    const sheenW    = tw * SHEEN_RATIO
    const sheenPerp = tw * SHEEN_PERP_FRAC

    const hex      = PIXI.utils.string2hex(color.hex)
    const dark     = shadeDark(color.r, color.g, color.b, 0.52)   // 52% darker
    const lite     = shadeLite(color.r, color.g, color.b, 0.58)   // 58% lighter

    // ── Pass 1: Edge outline (wider, darker, same position) ──────────────────
    // Draws slightly wider than the body so a thin dark edge shows on each side.
    // This simulates the shadow cast directly below thread onto the fabric —
    // no position offset means no floating / puffy look.
    this.outline.lineStyle({
      width:  outlineW,
      color:  dark,
      alpha:  OUTLINE_ALPHA,
      cap:    PIXI.LINE_CAP.BUTT,
    })
    for (const [a, b] of stitches) {
      this.outline.moveTo(a.x, a.y)
      this.outline.lineTo(b.x, b.y)
    }

    // ── Pass 2: Thread body (SQUARE caps = crisp needle-entry ends) ──────────
    // SQUARE extends the line by half-width past endpoints, which is how thread
    // physically enters the fabric — no exposed endpoint gap.
    this.body.lineStyle({
      width:  tw,
      color:  hex,
      alpha:  1,
      cap:    PIXI.LINE_CAP.SQUARE,
    })
    for (const [a, b] of stitches) {
      this.body.moveTo(a.x, a.y)
      this.body.lineTo(b.x, b.y)
    }

    // ── Pass 3: Specular sheen (perpendicular to stitch direction) ──────────
    // Narrow bright stripe offset perpendicularly — simulates rayon/poly thread
    // anisotropic reflectance. Each stitch gets its own perpendicular direction
    // so the sheen correctly tracks curved satin columns.
    this.sheen.lineStyle({
      width:  sheenW,
      color:  lite,
      alpha:  SHEEN_ALPHA,
      cap:    PIXI.LINE_CAP.BUTT,
    })
    for (const [a, b] of stitches) {
      const dx  = b.x - a.x
      const dy  = b.y - a.y
      const len = Math.sqrt(dx * dx + dy * dy) || 1
      // Perpendicular unit vector (rotated 90° CCW)
      const nx  = (-dy / len) * sheenPerp
      const ny  = ( dx / len) * sheenPerp

      this.sheen.moveTo(a.x + nx, a.y + ny)
      this.sheen.lineTo(b.x + nx, b.y + ny)
    }
  }

  destroy() {
    this.container.destroy({ children: true })
  }
}

// ─── Color helpers ─────────────────────────────────────────────────────────────

/** Darken toward black by `factor` (0 = original, 1 = black). */
function shadeDark(r: number, g: number, b: number, factor: number): number {
  return rgbToHex(
    Math.round(r * (1 - factor)),
    Math.round(g * (1 - factor)),
    Math.round(b * (1 - factor)),
  )
}

/** Lighten toward white by `factor` (0 = original, 1 = white). */
function shadeLite(r: number, g: number, b: number, factor: number): number {
  return rgbToHex(
    Math.round(r + (255 - r) * factor),
    Math.round(g + (255 - g) * factor),
    Math.round(b + (255 - b) * factor),
  )
}

function rgbToHex(r: number, g: number, b: number): number {
  return ((r & 0xff) << 16) | ((g & 0xff) << 8) | (b & 0xff)
}
