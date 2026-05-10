import * as PIXI from 'pixi.js'
import type { StitchPair, ThreadColor } from '../../embroidery/types'

// Thread is drawn in world-space at a fixed physical size (~0.4mm = 1.51 world-px).
// pixi-viewport scales the world, so the visual size grows correctly with zoom.
const THREAD_WORLD_W = 1.6   // world-px (~0.42mm) — physical thread diameter
const SHEEN_RATIO    = 0.38  // highlight stripe width relative to thread
const SHADOW_ALPHA   = 0.28
const SHADOW_OFFSET  = 0.55  // world-px

/**
 * Renders a collection of stitches as GPU-efficient graphics.
 * Each stitch is drawn in three passes:
 *   1. Shadow   — dark offset line (depth illusion)
 *   2. Thread   — solid thread color
 *   3. Highlight — lighter central stripe (sheen/roundness illusion)
 */
export class StitchRenderer {
  private shadow:    PIXI.Graphics
  private body:      PIXI.Graphics
  private highlight: PIXI.Graphics
  private container: PIXI.Container

  constructor() {
    this.container = new PIXI.Container()
    this.shadow    = new PIXI.Graphics()
    this.body      = new PIXI.Graphics()
    this.highlight = new PIXI.Graphics()
    this.container.addChild(this.shadow, this.body, this.highlight)
  }

  get displayObject(): PIXI.Container {
    return this.container
  }

  clear() {
    this.shadow.clear()
    this.body.clear()
    this.highlight.clear()
  }

  render(stitches: StitchPair[], color: ThreadColor, _zoom: number) {
    this.clear()
    if (!stitches || stitches.length === 0) return

    // Fixed world-space sizes — pixi-viewport zoom scales them visually
    const threadW   = THREAD_WORLD_W
    const sheenW    = threadW * SHEEN_RATIO
    const shadowOff = SHADOW_OFFSET

    const hex  = PIXI.utils.string2hex(color.hex)
    const lite = shadeLite(color.r, color.g, color.b, 0.62)

    // ── Shadow pass ─────────────────────────────────────────────────────────
    this.shadow.lineStyle({
      width: threadW,
      color: 0x000000,
      alpha: SHADOW_ALPHA,
      cap: PIXI.LINE_CAP.ROUND,
    })
    for (const [a, b] of stitches) {
      this.shadow.moveTo(a.x + shadowOff, a.y + shadowOff)
      this.shadow.lineTo(b.x + shadowOff, b.y + shadowOff)
    }

    // ── Body pass ────────────────────────────────────────────────────────────
    this.body.lineStyle({
      width: threadW,
      color: hex,
      alpha: 1,
      cap: PIXI.LINE_CAP.ROUND,
    })
    for (const [a, b] of stitches) {
      this.body.moveTo(a.x, a.y)
      this.body.lineTo(b.x, b.y)
    }

    // ── Highlight pass ───────────────────────────────────────────────────────
    this.highlight.lineStyle({
      width: sheenW,
      color: lite,
      alpha: 0.72,
      cap: PIXI.LINE_CAP.ROUND,
    })
    for (const [a, b] of stitches) {
      // Offset the highlight perpendicular to the stitch direction
      const dx = b.x - a.x
      const dy = b.y - a.y
      const len = Math.sqrt(dx * dx + dy * dy) || 1
      const nx = (-dy / len) * (threadW * 0.18)
      const ny = ( dx / len) * (threadW * 0.18)

      this.highlight.moveTo(a.x + nx, a.y + ny)
      this.highlight.lineTo(b.x + nx, b.y + ny)
    }
  }

  destroy() {
    this.container.destroy({ children: true })
  }
}

// ─── Color helpers ────────────────────────────────────────────────────────────

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
