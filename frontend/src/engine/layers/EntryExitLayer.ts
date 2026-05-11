/**
 * EntryExitLayer — visualizes and allows dragging of entry & exit points.
 *
 * Renders per selected object:
 *  • Green diamond  — entry point (where the machine starts sewing)
 *  • Red diamond    — exit point  (where the machine stops / trims)
 *  • Dashed blue line + arrow — sewing flow from entry → exit
 *
 * Dragging:
 *  • onPointerDown / onPointerMove / onPointerUp form a drag lifecycle.
 *  • During drag the marker moves in real time.
 *  • onPointerUp returns { objId, type, point } for the caller to persist.
 *
 * Sizes are screen-px-constant (divided by zoom) like NodeEditLayer markers.
 */

import * as PIXI from 'pixi.js'
import type { EmbroideryObject, Point } from '../../embroidery/types'

// ── Visual constants (screen-px) ──────────────────────────────────────────────
const DIAMOND_HALF   = 6.5   // half-size of diamond marker
const HIT_HALF       = 11    // hit-test radius (slightly larger than visual)
const DIAMOND_BORDER = 1.4
const FLOW_LINE_W    = 1.0
const ARROW_SIZE     = 5.5
const FLOW_ALPHA     = 0.55
const LABEL_ALPHA    = 0.85

// ── Colors ────────────────────────────────────────────────────────────────────
const C_ENTRY_FILL   = 0x2d8a4e
const C_ENTRY_BORDER = 0x1a5c31
const C_EXIT_FILL    = 0xd94040
const C_EXIT_BORDER  = 0x9b1c1c
const C_FLOW         = 0x7ab8f5
const C_DRAG_RING    = 0xffd700   // gold highlight on active drag
const C_WHITE        = 0xffffff

// ── Types ─────────────────────────────────────────────────────────────────────
export type EntryExitType = 'entry' | 'exit'

export interface EntryExitDragResult {
  objId: string
  type:  EntryExitType
  point: Point
}

interface DragState {
  objId:  string
  type:   EntryExitType
  pos:    Point   // current world position (updated each move)
}

export class EntryExitLayer {
  private container: PIXI.Container
  private gfx:       PIXI.Graphics
  private zoom_:     number = 1

  /** The objects currently being displayed. Updated on every render(). */
  private objects_:  EmbroideryObject[] = []
  private drag_:     DragState | null = null

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

  /** Re-render markers. Call whenever selection or zoom changes. */
  render(selectedObjects: EmbroideryObject[], zoom: number) {
    this.zoom_    = zoom
    this.objects_ = selectedObjects
    this.redraw()
  }

  hide() {
    this.gfx.clear()
    this.objects_ = []
    this.drag_    = null
    this.container.visible = false
  }

  // ── Pointer interaction ─────────────────────────────────────────────────────

  /**
   * Returns true if a diamond was hit and a drag has begun.
   * Caller should capture the pointer and suppress other interactions.
   */
  onPointerDown(world: Point, zoom: number): boolean {
    this.zoom_ = zoom
    const hit  = this.hitTest(world, zoom)
    if (!hit) return false

    this.drag_ = { objId: hit.objId, type: hit.type, pos: { ...world } }
    this.redraw()
    return true
  }

  /** Update drag position. Returns true while a drag is active. */
  onPointerMove(world: Point): boolean {
    if (!this.drag_) return false
    this.drag_.pos = { ...world }
    this.redraw()
    return true
  }

  /**
   * End drag. Returns the committed position and clears drag state.
   * Returns null if no drag was active.
   */
  onPointerUp(): EntryExitDragResult | null {
    if (!this.drag_) return null
    const result: EntryExitDragResult = {
      objId: this.drag_.objId,
      type:  this.drag_.type,
      point: { ...this.drag_.pos },
    }
    this.drag_ = null
    this.redraw()
    return result
  }

  get isDragging(): boolean { return this.drag_ !== null }

  destroy() {
    this.container.destroy({ children: true })
  }

  // ── Hit testing ─────────────────────────────────────────────────────────────

  private hitTest(
    world: Point, zoom: number,
  ): { objId: string; type: EntryExitType } | null {
    const hitR = HIT_HALF / zoom

    for (const obj of this.objects_) {
      if (!obj.visible) continue

      const entry = this.drag_?.objId === obj.id && this.drag_.type === 'entry'
        ? this.drag_.pos
        : obj.entryPoint
      const exit = this.drag_?.objId === obj.id && this.drag_.type === 'exit'
        ? this.drag_.pos
        : obj.exitPoint

      if (entry && distSq(world, entry) < hitR * hitR)
        return { objId: obj.id, type: 'entry' }
      if (exit && distSq(world, exit) < hitR * hitR)
        return { objId: obj.id, type: 'exit' }
    }
    return null
  }

  // ── Rendering ───────────────────────────────────────────────────────────────

  private redraw() {
    this.gfx.clear()

    const visible = this.objects_.filter(o => o.visible && (o.entryPoint || o.exitPoint))
    this.container.visible = visible.length > 0
    if (visible.length === 0) return

    const z   = this.zoom_
    const dh  = DIAMOND_HALF   / z
    const dlw = DIAMOND_BORDER / z
    const flw = FLOW_LINE_W    / z
    const as  = ARROW_SIZE     / z

    for (const obj of visible) {
      // Resolve positions — use drag pos while dragging this object's marker
      const entry: Point | undefined =
        this.drag_?.objId === obj.id && this.drag_.type === 'entry'
          ? this.drag_.pos
          : obj.entryPoint

      const exit: Point | undefined =
        this.drag_?.objId === obj.id && this.drag_.type === 'exit'
          ? this.drag_.pos
          : obj.exitPoint

      // ── Flow line + arrow ──────────────────────────────────────────────────
      if (entry && exit) {
        const dx  = exit.x - entry.x
        const dy  = exit.y - entry.y
        const len = Math.sqrt(dx * dx + dy * dy)
        if (len > dh * 3) {
          const ux = dx / len, uy = dy / len
          const sx = entry.x + ux * dh * 1.6
          const sy = entry.y + uy * dh * 1.6
          const ex = exit.x  - ux * dh * 1.6
          const ey = exit.y  - uy * dh * 1.6

          this.gfx.lineStyle(flw, C_FLOW, FLOW_ALPHA)
          this.drawDashed(sx, sy, ex, ey, 5 / z, 3 / z)
          this.drawArrow(ex, ey, ux, uy, as, C_FLOW, FLOW_ALPHA, flw)
        }
      }

      // ── Entry diamond ──────────────────────────────────────────────────────
      if (entry) {
        const dragging = this.drag_?.objId === obj.id && this.drag_.type === 'entry'
        this.drawDiamond(entry, dh, dlw, C_ENTRY_FILL, C_ENTRY_BORDER, dragging)
      }

      // ── Exit diamond ───────────────────────────────────────────────────────
      if (exit) {
        const dragging = this.drag_?.objId === obj.id && this.drag_.type === 'exit'
        this.drawDiamond(exit, dh, dlw, C_EXIT_FILL, C_EXIT_BORDER, dragging)
      }
    }
  }

  // ── Drawing helpers ─────────────────────────────────────────────────────────

  private drawDiamond(
    center: Point, half: number, lw: number,
    fill: number, border: number,
    active: boolean,
  ) {
    const { x, y } = center
    const ringLw    = lw + 1.2 / this.zoom_

    // Outer glow ring when dragging
    if (active) {
      this.gfx.lineStyle(ringLw + 2 / this.zoom_, C_DRAG_RING, 0.60)
      this.gfx.beginFill(0, 0)
      const h2 = half * 1.5
      this.gfx.moveTo(x,      y - h2)
      this.gfx.lineTo(x + h2, y)
      this.gfx.lineTo(x,      y + h2)
      this.gfx.lineTo(x - h2, y)
      this.gfx.closePath()
      this.gfx.endFill()
    }

    // White outer ring for contrast
    this.gfx.lineStyle(ringLw, C_WHITE, 0.70)
    this.gfx.beginFill(fill, LABEL_ALPHA)
    this.gfx.moveTo(x,          y - half)
    this.gfx.lineTo(x + half,   y)
    this.gfx.lineTo(x,          y + half)
    this.gfx.lineTo(x - half,   y)
    this.gfx.closePath()
    this.gfx.endFill()

    // Coloured border
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
    tx: number, ty: number, ux: number, uy: number,
    size: number, color: number, alpha: number, lw: number,
  ) {
    const px = -uy, py = ux
    this.gfx.lineStyle(lw, color, alpha * 0.9)
    this.gfx.beginFill(color, alpha * 0.7)
    this.gfx.moveTo(tx + ux * size, ty + uy * size)
    this.gfx.lineTo(tx - ux * size * 0.5 + px * size * 0.6,
                    ty - uy * size * 0.5 + py * size * 0.6)
    this.gfx.lineTo(tx - ux * size * 0.5 - px * size * 0.6,
                    ty - uy * size * 0.5 - py * size * 0.6)
    this.gfx.closePath()
    this.gfx.endFill()
  }

  private drawDashed(
    x0: number, y0: number, x1: number, y1: number,
    dashLen: number, gapLen: number,
  ) {
    const dx = x1 - x0, dy = y1 - y0
    const len = Math.sqrt(dx * dx + dy * dy)
    if (len < 1e-6) return
    const ux = dx / len, uy = dy / len
    let t = 0, on = true
    while (t < len) {
      const segLen = Math.min(on ? dashLen : gapLen, len - t)
      if (on) {
        this.gfx.moveTo(x0 + ux * t,            y0 + uy * t)
        this.gfx.lineTo(x0 + ux * (t + segLen), y0 + uy * (t + segLen))
      }
      t += segLen
      on = !on
    }
  }
}

// ── Util ──────────────────────────────────────────────────────────────────────
function distSq(a: Point, b: Point): number {
  const dx = a.x - b.x, dy = a.y - b.y
  return dx * dx + dy * dy
}
