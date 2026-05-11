/**
 * EntryExitLayer — visualizes entry & exit points on selected embroidery objects.
 *
 * Renders per selected object:
 *  • Green diamond  — entry point (where the machine starts sewing)
 *  • Red diamond    — exit point  (where the machine stops / trims)
 *  • Thin directional line — sewing flow from entry → exit
 *  • Small arrow head at exit to indicate direction
 *
 * All sizes are in screen-px (divided by zoom) so they stay the same size
 * regardless of viewport zoom — same as NodeEditLayer markers.
 *
 * Shown whenever one or more objects are selected.
 */

import * as PIXI from 'pixi.js'
import type { EmbroideryObject, Point } from '../../embroidery/types'

// ── Visual constants (screen-px) ──────────────────────────────────────────────
const DIAMOND_HALF    = 6.5   // half-size of diamond marker
const DIAMOND_BORDER  = 1.4   // border line width
const FLOW_LINE_W     = 1.0   // travel-path line width
const ARROW_SIZE      = 5.5   // arrow head size
const FLOW_ALPHA      = 0.55  // flow line opacity
const LABEL_ALPHA     = 0.85  // marker fill opacity

// ── Colors ────────────────────────────────────────────────────────────────────
const C_ENTRY_FILL    = 0x2d8a4e   // green — entry
const C_ENTRY_BORDER  = 0x1a5c31
const C_EXIT_FILL     = 0xd94040   // red — exit
const C_EXIT_BORDER   = 0x9b1c1c
const C_FLOW          = 0x7ab8f5   // sky blue — travel path
const C_BORDER_LIGHT  = 0xffffff   // white inner border for contrast

export class EntryExitLayer {
  private container: PIXI.Container
  private gfx:       PIXI.Graphics
  private zoom_:     number = 1

  constructor() {
    this.container = new PIXI.Container()
    this.gfx       = new PIXI.Graphics()
    this.container.addChild(this.gfx)
    this.container.visible = false
  }

  get displayObject(): PIXI.Container { return this.container }

  setZoom(zoom: number) {
    this.zoom_ = zoom
  }

  /** Re-render entry/exit markers for the given selected objects. */
  render(selectedObjects: EmbroideryObject[], zoom: number) {
    this.zoom_ = zoom
    this.gfx.clear()

    const visible = selectedObjects.filter(
      o => o.visible && (o.entryPoint || o.exitPoint),
    )

    this.container.visible = visible.length > 0
    if (visible.length === 0) return

    const z   = this.zoom_
    const dh  = DIAMOND_HALF    / z
    const dlw = DIAMOND_BORDER  / z
    const flw = FLOW_LINE_W     / z
    const as  = ARROW_SIZE      / z

    for (const obj of visible) {
      const entry = obj.entryPoint
      const exit  = obj.exitPoint

      // ── Flow line + arrow (entry → exit) ────────────────────────────────
      if (entry && exit) {
        const dx  = exit.x - entry.x
        const dy  = exit.y - entry.y
        const len = Math.sqrt(dx * dx + dy * dy)

        // Only draw the flow line if entry/exit are far enough apart
        if (len > dh * 3) {
          // Shorten the line so it doesn't overlap the diamond markers
          const ux   = dx / len
          const uy   = dy / len
          const sx   = entry.x + ux * dh * 1.6
          const sy   = entry.y + uy * dh * 1.6
          const ex   = exit.x  - ux * dh * 1.6
          const ey   = exit.y  - uy * dh * 1.6

          // Dashed travel line
          this.gfx.lineStyle(flw, C_FLOW, FLOW_ALPHA)
          this.drawDashed(sx, sy, ex, ey, 5 / z, 3 / z)

          // Arrow head at exit end
          this.drawArrow(ex, ey, ux, uy, as, C_FLOW, FLOW_ALPHA, flw)
        }
      }

      // ── Entry diamond (green) ────────────────────────────────────────────
      if (entry) {
        this.drawDiamond(entry, dh, dlw, C_ENTRY_FILL, C_ENTRY_BORDER)
      }

      // ── Exit diamond (red) ───────────────────────────────────────────────
      if (exit) {
        this.drawDiamond(exit, dh, dlw, C_EXIT_FILL, C_EXIT_BORDER)
      }
    }
  }

  hide() {
    this.gfx.clear()
    this.container.visible = false
  }

  destroy() {
    this.container.destroy({ children: true })
  }

  // ── Drawing helpers ─────────────────────────────────────────────────────────

  private drawDiamond(
    center: Point, half: number, lw: number,
    fill: number, border: number,
  ) {
    const { x, y } = center

    // White outer ring for contrast against dark fabric
    this.gfx.lineStyle(lw + 1.2 / this.zoom_, C_BORDER_LIGHT, 0.70)
    this.gfx.beginFill(fill, LABEL_ALPHA)
    this.gfx.moveTo(x,          y - half)
    this.gfx.lineTo(x + half,   y)
    this.gfx.lineTo(x,          y + half)
    this.gfx.lineTo(x - half,   y)
    this.gfx.closePath()
    this.gfx.endFill()

    // Coloured border on top
    this.gfx.lineStyle(lw, border, 0.92)
    this.gfx.beginFill(0, 0)
    this.gfx.moveTo(x,          y - half)
    this.gfx.lineTo(x + half,   y)
    this.gfx.lineTo(x,          y + half)
    this.gfx.lineTo(x - half,   y)
    this.gfx.closePath()
    this.gfx.endFill()
  }

  private drawArrow(
    tx: number, ty: number,
    ux: number, uy: number,
    size: number,
    color: number, alpha: number, lw: number,
  ) {
    // Perpendicular unit vector
    const px = -uy
    const py =  ux
    this.gfx.lineStyle(lw, color, alpha * 0.9)
    this.gfx.beginFill(color, alpha * 0.7)
    this.gfx.moveTo(tx + ux * size,           ty + uy * size)
    this.gfx.lineTo(tx - ux * size * 0.5 + px * size * 0.6,
                    ty - uy * size * 0.5 + py * size * 0.6)
    this.gfx.lineTo(tx - ux * size * 0.5 - px * size * 0.6,
                    ty - uy * size * 0.5 - py * size * 0.6)
    this.gfx.closePath()
    this.gfx.endFill()
  }

  /** Draw a dashed line by repeating moveTo/lineTo segments. */
  private drawDashed(
    x0: number, y0: number, x1: number, y1: number,
    dashLen: number, gapLen: number,
  ) {
    const dx  = x1 - x0
    const dy  = y1 - y0
    const len = Math.sqrt(dx * dx + dy * dy)
    if (len < 1e-6) return

    const ux = dx / len
    const uy = dy / len
    let   t  = 0
    let   on = true

    while (t < len) {
      const segLen = Math.min(on ? dashLen : gapLen, len - t)
      if (on) {
        this.gfx.moveTo(x0 + ux * t,          y0 + uy * t)
        this.gfx.lineTo(x0 + ux * (t + segLen), y0 + uy * (t + segLen))
      }
      t  += segLen
      on  = !on
    }
  }
}
