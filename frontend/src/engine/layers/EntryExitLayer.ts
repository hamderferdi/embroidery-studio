/**
 * EntryExitLayer — perimeter-constrained entry & exit point editor.
 *
 * Entry and exit points are ALWAYS constrained to the object's outline.
 * Dragging slides the marker along the perimeter — it can never float
 * into the interior or outside the shape.
 *
 * Visual language:
 *  • Green diamond  — entry (machine starts sewing here)
 *  • Red diamond    — exit  (machine stops / trims here)
 *  • Dashed flow line + arrow — sewing direction
 *  • Perimeter overlay — shown during drag to make the edge visible
 *  • Active edge highlight — the specific segment being targeted
 *
 * All sizes are screen-px-constant (divided by zoom) like NodeEditLayer.
 */

import * as PIXI from 'pixi.js'
import type { EmbroideryObject, PerimeterPoint, Point } from '../../embroidery/types'
import {
  extractPerimeter,
  projectOntoPerimeter,
} from '../../embroidery/perimeterUtils'

// ── Visual constants (screen-px) ──────────────────────────────────────────────
const DIAMOND_HALF    = 6.5
const HIT_HALF        = 12     // hit radius larger than visual for easier grab
const DIAMOND_BORDER  = 1.4
const FLOW_LINE_W     = 1.0
const ARROW_SIZE      = 5.5
const FLOW_ALPHA      = 0.55
const LABEL_ALPHA     = 0.88
const PERIMETER_LW    = 1.5    // perimeter overlay line width during drag
const PERIMETER_ALPHA = 0.45

// ── Colors ────────────────────────────────────────────────────────────────────
const C_ENTRY_FILL    = 0x2d8a4e
const C_ENTRY_BORDER  = 0x1a5c31
const C_EXIT_FILL     = 0xd94040
const C_EXIT_BORDER   = 0x9b1c1c
const C_FLOW          = 0x7ab8f5
const C_DRAG_RING     = 0xffd700
const C_WHITE         = 0xffffff

// ── Types ─────────────────────────────────────────────────────────────────────
export type EntryExitType = 'entry' | 'exit'

export interface EntryExitDragResult {
  objId:          string
  type:           EntryExitType
  perimeterPoint: PerimeterPoint
}

interface DragState {
  objId:          string
  type:           EntryExitType
  perimeter:      Point[]          // cached perimeter polyline for this drag
  pp:             PerimeterPoint   // current constrained position
}

// ── Layer ─────────────────────────────────────────────────────────────────────

export class EntryExitLayer {
  private container:  PIXI.Container
  private perimGfx:   PIXI.Graphics   // perimeter overlay (shown while dragging)
  private markerGfx:  PIXI.Graphics   // diamonds + flow line
  private zoom_:      number = 1
  private objects_:   EmbroideryObject[] = []
  private drag_:      DragState | null = null

  constructor() {
    this.container = new PIXI.Container()
    this.perimGfx  = new PIXI.Graphics()
    this.markerGfx = new PIXI.Graphics()
    // Perimeter behind markers
    this.container.addChild(this.perimGfx, this.markerGfx)
    this.container.visible = false
  }

  get displayObject(): PIXI.Container { return this.container }

  setZoom(zoom: number) { this.zoom_ = zoom }

  render(selectedObjects: EmbroideryObject[], zoom: number) {
    this.zoom_    = zoom
    this.objects_ = selectedObjects
    this.redraw()
  }

  hide() {
    this.perimGfx.clear()
    this.markerGfx.clear()
    this.objects_ = []
    this.drag_    = null
    this.container.visible = false
  }

  // ── Pointer interaction ─────────────────────────────────────────────────────

  onPointerDown(world: Point, zoom: number): boolean {
    this.zoom_ = zoom
    const hit  = this.hitTest(world, zoom)
    if (!hit) return false

    const perimeter = extractPerimeter(hit.obj)
    if (perimeter.length < 2) return false

    const pp = projectOntoPerimeter(perimeter, world)
    this.drag_ = { objId: hit.obj.id, type: hit.type, perimeter, pp }
    this.redraw()
    return true
  }

  onPointerMove(world: Point): boolean {
    if (!this.drag_) return false
    this.drag_.pp = projectOntoPerimeter(this.drag_.perimeter, world)
    this.redraw()
    return true
  }

  onPointerUp(): EntryExitDragResult | null {
    if (!this.drag_) return null
    const result: EntryExitDragResult = {
      objId:          this.drag_.objId,
      type:           this.drag_.type,
      perimeterPoint: { ...this.drag_.pp },
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
  ): { obj: EmbroideryObject; type: EntryExitType } | null {
    const hitR = HIT_HALF / zoom

    for (const obj of this.objects_) {
      if (!obj.visible) continue

      const entry = obj.entryPoint
      const exit  = obj.exitPoint

      if (entry && distSq(world, entry) < hitR * hitR)
        return { obj, type: 'entry' }
      if (exit && distSq(world, exit) < hitR * hitR)
        return { obj, type: 'exit' }
    }
    return null
  }

  // ── Rendering ───────────────────────────────────────────────────────────────

  private redraw() {
    this.perimGfx.clear()
    this.markerGfx.clear()

    const visible = this.objects_.filter(o => o.visible && (o.entryPoint || o.exitPoint))
    this.container.visible = visible.length > 0
    if (visible.length === 0) return

    const z   = this.zoom_
    const dh  = DIAMOND_HALF   / z
    const dlw = DIAMOND_BORDER / z
    const flw = FLOW_LINE_W    / z
    const as  = ARROW_SIZE     / z

    for (const obj of visible) {
      const isDragTarget = this.drag_?.objId === obj.id

      // ── Perimeter overlay (shown while dragging this object) ───────────────
      if (isDragTarget && this.drag_) {
        this.drawPerimeterOverlay(
          this.drag_.perimeter,
          this.drag_.type === 'entry' ? C_ENTRY_FILL : C_EXIT_FILL,
        )
      }

      // Resolve positions — use constrained drag position while dragging
      const entry: Point | undefined =
        isDragTarget && this.drag_?.type === 'entry'
          ? this.drag_.pp.position
          : obj.entryPoint

      const exit: Point | undefined =
        isDragTarget && this.drag_?.type === 'exit'
          ? this.drag_.pp.position
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
          this.markerGfx.lineStyle(flw, C_FLOW, FLOW_ALPHA)
          this.drawDashed(sx, sy, ex, ey, 5 / z, 3 / z)
          this.drawArrow(ex, ey, ux, uy, as, C_FLOW, FLOW_ALPHA, flw)
        }
      }

      // ── Diamonds ───────────────────────────────────────────────────────────
      if (entry) {
        const active = isDragTarget && this.drag_?.type === 'entry'
        this.drawDiamond(entry, dh, dlw, C_ENTRY_FILL, C_ENTRY_BORDER, active)
      }
      if (exit) {
        const active = isDragTarget && this.drag_?.type === 'exit'
        this.drawDiamond(exit, dh, dlw, C_EXIT_FILL, C_EXIT_BORDER, active)
      }
    }
  }

  // ── Perimeter overlay ───────────────────────────────────────────────────────

  private drawPerimeterOverlay(perimeter: Point[], color: number) {
    if (perimeter.length < 2) return
    const z  = this.zoom_
    const lw = PERIMETER_LW / z

    this.perimGfx.lineStyle(lw, color, PERIMETER_ALPHA)
    this.perimGfx.moveTo(perimeter[0].x, perimeter[0].y)
    for (let i = 1; i < perimeter.length; i++) {
      this.perimGfx.lineTo(perimeter[i].x, perimeter[i].y)
    }
  }

  // ── Drawing helpers ─────────────────────────────────────────────────────────

  private drawDiamond(
    center: Point, half: number, lw: number,
    fill: number, border: number, active: boolean,
  ) {
    const { x, y } = center

    // Gold glow ring when active
    if (active) {
      this.markerGfx.lineStyle(lw + 2.5 / this.zoom_, C_DRAG_RING, 0.55)
      this.markerGfx.beginFill(0, 0)
      const h2 = half * 1.6
      this.markerGfx.moveTo(x,      y - h2)
      this.markerGfx.lineTo(x + h2, y)
      this.markerGfx.lineTo(x,      y + h2)
      this.markerGfx.lineTo(x - h2, y)
      this.markerGfx.closePath()
      this.markerGfx.endFill()
    }

    // White outer ring
    this.markerGfx.lineStyle(lw + 1.2 / this.zoom_, C_WHITE, 0.70)
    this.markerGfx.beginFill(fill, LABEL_ALPHA)
    this.markerGfx.moveTo(x,          y - half)
    this.markerGfx.lineTo(x + half,   y)
    this.markerGfx.lineTo(x,          y + half)
    this.markerGfx.lineTo(x - half,   y)
    this.markerGfx.closePath()
    this.markerGfx.endFill()

    // Coloured border
    this.markerGfx.lineStyle(lw, border, 0.92)
    this.markerGfx.beginFill(0, 0)
    this.markerGfx.moveTo(x,          y - half)
    this.markerGfx.lineTo(x + half,   y)
    this.markerGfx.lineTo(x,          y + half)
    this.markerGfx.lineTo(x - half,   y)
    this.markerGfx.closePath()
    this.markerGfx.endFill()
  }

  private drawArrow(
    tx: number, ty: number, ux: number, uy: number,
    size: number, color: number, alpha: number, lw: number,
  ) {
    const px = -uy, py = ux
    this.markerGfx.lineStyle(lw, color, alpha * 0.9)
    this.markerGfx.beginFill(color, alpha * 0.7)
    this.markerGfx.moveTo(tx + ux * size, ty + uy * size)
    this.markerGfx.lineTo(tx - ux * size * 0.5 + px * size * 0.6,
                          ty - uy * size * 0.5 + py * size * 0.6)
    this.markerGfx.lineTo(tx - ux * size * 0.5 - px * size * 0.6,
                          ty - uy * size * 0.5 - py * size * 0.6)
    this.markerGfx.closePath()
    this.markerGfx.endFill()
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
      const seg = Math.min(on ? dashLen : gapLen, len - t)
      if (on) {
        this.markerGfx.moveTo(x0 + ux * t,       y0 + uy * t)
        this.markerGfx.lineTo(x0 + ux * (t + seg), y0 + uy * (t + seg))
      }
      t += seg
      on = !on
    }
  }
}

// ── Util ──────────────────────────────────────────────────────────────────────
function distSq(a: Point, b: Point): number {
  const dx = a.x - b.x, dy = a.y - b.y
  return dx * dx + dy * dy
}
