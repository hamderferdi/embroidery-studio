/**
 * StitchPointLayer — penetration-point ("stitch debug") visualization.
 *
 * Renders a filled dot at every needle-down position in the compiled
 * MachineStitch sequence.  Enabled via the "Pts" toggle in the top toolbar.
 *
 * Visual language:
 *  • Dot radius is screen-space constant (~1.8 px) regardless of zoom.
 *  • Normal stitches → darkened thread color, 80% alpha.
 *  • Tie-in / tie-off → amber, slightly smaller.
 *  • Jump stitches  → thin cyan line from start to end, no dot.
 *  • Trim / color-change commands → not drawn (no position relevance).
 *
 * Performance: all dots for all objects are drawn into a single
 * PIXI.Graphics batch — no per-stitch display-object allocation.
 */

import * as PIXI from 'pixi.js'
import type { MachineStitch } from '../../embroidery/types'

// ── Visual constants (screen-px) ──────────────────────────────────────────────
const DOT_RADIUS_PX    = 1.8
const TIE_RADIUS_PX    = 1.2
const JUMP_LINE_W_PX   = 0.8
const DOT_ALPHA        = 0.80
const TIE_ALPHA        = 0.90
const JUMP_ALPHA       = 0.55
const JUMP_COLOR       = 0x40c0e8   // cyan for jump travel lines
const TIE_COLOR        = 0xf0a030   // amber for tie-in / tie-off

export class StitchPointLayer {
  private gfx:     PIXI.Graphics
  private zoom_:   number = 1
  private visible_: boolean = false

  constructor() {
    this.gfx = new PIXI.Graphics()
    this.gfx.visible = false
  }

  get displayObject(): PIXI.Graphics { return this.gfx }

  setZoom(zoom: number) { this.zoom_ = zoom }

  setVisible(v: boolean) {
    this.visible_ = v
    this.gfx.visible = v
  }

  /**
   * Redraw all stitch penetration points from the compiled machine sequence.
   * Call whenever: objects change, showStitchPoints is toggled, zoom changes.
   */
  render(stitches: MachineStitch[], zoom: number) {
    this.zoom_ = zoom
    this.gfx.clear()

    if (!this.visible_ || stitches.length === 0) return

    const z        = zoom
    const dotR     = DOT_RADIUS_PX  / z
    const tieR     = TIE_RADIUS_PX  / z
    const jumpLW   = JUMP_LINE_W_PX / z

    // Index stitches so we can pair jump from→to
    for (let i = 0; i < stitches.length; i++) {
      const s = stitches[i]

      if (s.type === 'trim' || s.type === 'color-change') continue

      if (s.type === 'jump') {
        // Draw a thin line from this stitch's position to the next normal stitch
        const next = stitches[i + 1]
        if (next && s.lengthMm > 0) {
          const tx = s.x + Math.cos(s.angleDeg * Math.PI / 180) * s.lengthMm * (z > 0 ? 1 : 1)
          // Use next stitch position for the endpoint
          const ex = next.x, ey = next.y
          this.gfx.lineStyle(jumpLW, JUMP_COLOR, JUMP_ALPHA)
          this.gfx.moveTo(s.x, s.y)
          this.gfx.lineTo(ex, ey)
          // Small diamond at jump start
          this.gfx.lineStyle(0)
          this.gfx.beginFill(JUMP_COLOR, JUMP_ALPHA * 0.7)
          this.gfx.drawCircle(s.x, s.y, dotR * 0.65)
          this.gfx.endFill()
        }
        continue
      }

      if (s.type === 'tie-in' || s.type === 'tie-off') {
        this.gfx.lineStyle(0)
        this.gfx.beginFill(TIE_COLOR, TIE_ALPHA)
        this.gfx.drawCircle(s.x, s.y, tieR)
        this.gfx.endFill()
        continue
      }

      // Normal stitch — use darkened thread color
      const { r, g, b } = s.color
      const dr = Math.round(r * 0.55)
      const dg = Math.round(g * 0.55)
      const db = Math.round(b * 0.55)
      const hex = (dr << 16) | (dg << 8) | db

      this.gfx.lineStyle(0)
      this.gfx.beginFill(hex, DOT_ALPHA)
      this.gfx.drawCircle(s.x, s.y, dotR)
      this.gfx.endFill()
    }
  }

  clear() {
    this.gfx.clear()
  }

  destroy() {
    this.gfx.destroy()
  }
}
