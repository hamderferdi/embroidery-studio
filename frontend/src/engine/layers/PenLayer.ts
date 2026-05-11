/**
 * Pen Tool layer — Illustrator-style Bézier path creation.
 *
 * Interactions:
 *  • Click               → place corner anchor (no handles)
 *  • Click + drag        → place smooth anchor; drag direction sets handleOut
 *  • Click on first node → close path
 *  • Enter / dbl-click   → finish open path
 *  • Escape              → cancel / undo last point
 *
 * Works in two draw modes:
 *  'polyline' → produces an open BezierPath  (used by run-stitch, satin-column)
 *  'polygon'  → produces a closed BezierPath (used by satin-fill, tatami-fill)
 */

import * as PIXI from 'pixi.js'
import type { BezierPath, BezierPoint, Point } from '../../embroidery/types'
import { evalCubic } from '../../embroidery/geometry/BezierMath'

export type PenMode = 'polygon' | 'polyline'

const SNAP_R     = 12   // screen-px — snap-to-close radius
const DOT_R      = 4.5
const HANDLE_R   = 3.5
const LINE_W     = 1.5
const C_PATH     = 0x40916c
const C_ANCHOR   = 0xffffff
const C_ANCHOR_F = 0x40916c
const C_HANDLE   = 0x74a77a
const C_RUBBER   = 0x40916c
const C_PREVIEW  = 0x40916c
const DBL_MS     = 280   // double-click interval

export class PenLayer {
  private container:  PIXI.Container
  private pathGfx:    PIXI.Graphics   // committed segments
  private rubberGfx:  PIXI.Graphics   // rubber-band / preview
  private nodeGfx:    PIXI.Graphics   // anchors + handle knobs
  private fillGfx:    PIXI.Graphics   // shape fill preview

  private mode_:      PenMode = 'polygon'
  private points_:    BezierPoint[] = []
  private dragging_:  boolean = false
  private dragStart_: Point = { x: 0, y: 0 }
  private cursor_:    Point | null = null
  private zoom_:      number = 1

  private lastClickTime_: number = 0
  private lastClickPos_:  Point  = { x: 0, y: 0 }

  constructor() {
    this.container = new PIXI.Container()
    this.fillGfx   = new PIXI.Graphics()
    this.pathGfx   = new PIXI.Graphics()
    this.rubberGfx = new PIXI.Graphics()
    this.nodeGfx   = new PIXI.Graphics()
    this.container.addChild(this.fillGfx, this.pathGfx, this.rubberGfx, this.nodeGfx)
    this.container.visible = false
  }

  get displayObject(): PIXI.Container { return this.container }
  get pointCount(): number { return this.points_.length }
  get currentPath(): BezierPath { return { points: [...this.points_], closed: false } }

  // ── Public API ──────────────────────────────────────────────────────────────

  start(mode: PenMode) {
    this.mode_   = mode
    this.points_ = []
    this.cursor_ = null
    this.dragging_ = false
    this.container.visible = true
    this.clear()
  }

  stop() {
    this.points_   = []
    this.cursor_   = null
    this.dragging_ = false
    this.container.visible = false
    this.clear()
  }

  updateCursor(world: Point, zoom: number) {
    this.zoom_   = zoom
    this.cursor_ = world
    this.redraw()
  }

  /**
   * Called on pointerdown.
   * Returns:
   *  'close'    — user clicked the first anchor → close path
   *  'complete' — double-click → complete open path
   *  'placed'   — normal point placed
   */
  onPointerDown(
    world: Point, zoom: number,
  ): 'close' | 'complete' | 'placed' {
    this.zoom_ = zoom

    // Double-click detection
    const now = Date.now()
    const ddx = world.x - this.lastClickPos_.x, ddy = world.y - this.lastClickPos_.y
    const isDbl = (now - this.lastClickTime_ < DBL_MS) &&
                  Math.sqrt(ddx * ddx + ddy * ddy) < 8 / zoom
    this.lastClickTime_ = now
    this.lastClickPos_  = { ...world }

    if (isDbl && this.points_.length >= 2) return 'complete'

    // Snap-to-close: clicking near first anchor when ≥ 3 points
    if (this.mode_ === 'polygon' && this.points_.length >= 3) {
      const fp = this.points_[0]
      const dx = world.x - fp.x, dy = world.y - fp.y
      if (Math.sqrt(dx * dx + dy * dy) < SNAP_R / zoom) return 'close'
    }

    // Begin drag: we'll update handleOut on pointerMove
    this.dragging_  = true
    this.dragStart_ = { ...world }

    this.points_.push({ x: world.x, y: world.y, type: 'corner' })
    this.redraw()
    return 'placed'
  }

  /** Called while dragging (after pointerdown, before pointerup) */
  onPointerDrag(world: Point, zoom: number) {
    if (!this.dragging_ || this.points_.length === 0) return
    this.zoom_ = zoom

    const last  = this.points_[this.points_.length - 1]
    const dx    = world.x - last.x, dy = world.y - last.y
    const lenSq = dx * dx + dy * dy
    const minLen = (2 / zoom) ** 2

    if (lenSq > minLen) {
      // Symmetric handles — drag direction = handleOut
      const pt = this.points_[this.points_.length - 1]
      this.points_[this.points_.length - 1] = {
        ...pt,
        type: 'symmetric',
        ho: { x:  dx, y:  dy },
        hi: { x: -dx, y: -dy },
      }
    }
    this.cursor_ = world
    this.redraw()
  }

  onPointerUp(zoom: number) {
    this.zoom_     = zoom
    this.dragging_ = false
    this.redraw()
  }

  /** Remove the last placed point (Escape) */
  removeLastPoint() {
    if (this.points_.length > 0) this.points_.pop()
    this.redraw()
  }

  /** Build the final BezierPath from placed points */
  buildPath(closed: boolean): BezierPath {
    return { points: [...this.points_], closed }
  }

  isNearFirst(world: Point): boolean {
    if (this.points_.length < 3) return false
    const fp = this.points_[0]
    const dx = world.x - fp.x, dy = world.y - fp.y
    return Math.sqrt(dx * dx + dy * dy) < SNAP_R / this.zoom_
  }

  // ── Rendering ───────────────────────────────────────────────────────────────

  private redraw() {
    this.clear()
    const pts   = this.points_
    const n     = pts.length
    const z     = this.zoom_
    const lw    = LINE_W   / z
    const dr    = DOT_R    / z
    const hr    = HANDLE_R / z

    if (n === 0 && !this.cursor_) return

    // ── Fill preview (polygon mode) ────────────────────────────────────────
    if (this.mode_ === 'polygon' && n >= 2) {
      this.fillGfx.lineStyle(0)
      this.fillGfx.beginFill(C_PATH, 0.08)
      this.fillGfx.moveTo(pts[0].x, pts[0].y)
      for (let i = 0; i < n - 1; i++) {
        const { p1, p2, p3 } = this.segCP(i, pts)
        this.fillGfx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y)
      }
      if (this.cursor_) this.fillGfx.lineTo(this.cursor_.x, this.cursor_.y)
      this.fillGfx.closePath()
      this.fillGfx.endFill()
    }

    // ── Committed path segments ────────────────────────────────────────────
    if (n >= 2) {
      this.pathGfx.lineStyle(lw, C_PATH, 0.85)
      this.pathGfx.moveTo(pts[0].x, pts[0].y)
      for (let i = 0; i < n - 1; i++) {
        const { p1, p2, p3 } = this.segCP(i, pts)
        this.pathGfx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y)
      }
    }

    // ── Rubber-band from last anchor to cursor ──────────────────────────────
    if (n >= 1 && this.cursor_) {
      const last    = pts[n - 1]
      const nearFirst = this.mode_ === 'polygon' && this.isNearFirst(this.cursor_)
      // handleOut of last placed node
      const hoAbs: Point = last.ho
        ? { x: last.x + last.ho.x, y: last.y + last.ho.y }
        : { x: last.x, y: last.y }
      // rubber-band target's "handleIn" is mirrored from cursor drag (or none)
      const alpha = nearFirst ? 1.0 : 0.45
      this.rubberGfx.lineStyle(lw, C_RUBBER, alpha, 0, true)
      this.rubberGfx.moveTo(last.x, last.y)
      this.rubberGfx.bezierCurveTo(
        hoAbs.x, hoAbs.y,
        this.cursor_.x, this.cursor_.y,  // degenerate cp2 = endpoint
        this.cursor_.x, this.cursor_.y,
      )

      // Close-back ghost
      if (nearFirst && n >= 3) {
        const fp = pts[0]
        this.rubberGfx.lineStyle(lw * 0.7, C_RUBBER, 0.25, 0, true)
        this.rubberGfx.moveTo(this.cursor_.x, this.cursor_.y)
        this.rubberGfx.lineTo(fp.x, fp.y)
      }
    }

    // ── Handle lines + knobs for last point being dragged ──────────────────
    if (this.dragging_ && n >= 1) {
      const last = pts[n - 1]
      if (last.ho) {
        const abs = { x: last.x + last.ho.x, y: last.y + last.ho.y }
        this.nodeGfx.lineStyle(lw * 0.8, C_HANDLE, 0.6)
        this.nodeGfx.moveTo(last.x, last.y)
        this.nodeGfx.lineTo(abs.x, abs.y)
        this.nodeGfx.lineStyle(lw, C_HANDLE, 0.9)
        this.nodeGfx.beginFill(0xffffff, 0.9)
        this.nodeGfx.drawCircle(abs.x, abs.y, hr)
        this.nodeGfx.endFill()
      }
      if (last.hi) {
        const abs = { x: last.x + last.hi.x, y: last.y + last.hi.y }
        this.nodeGfx.lineStyle(lw * 0.8, C_HANDLE, 0.6)
        this.nodeGfx.moveTo(last.x, last.y)
        this.nodeGfx.lineTo(abs.x, abs.y)
        this.nodeGfx.lineStyle(lw, C_HANDLE, 0.9)
        this.nodeGfx.beginFill(0xffffff, 0.9)
        this.nodeGfx.drawCircle(abs.x, abs.y, hr)
        this.nodeGfx.endFill()
      }
    }

    // ── Anchor dots ────────────────────────────────────────────────────────
    for (let i = 0; i < n; i++) {
      const pt = pts[i]
      const isFirst   = i === 0
      const snapClose = isFirst && this.mode_ === 'polygon' &&
                        this.cursor_ !== null && this.isNearFirst(this.cursor_)

      const isSmooth = pt.type !== 'corner'
      this.nodeGfx.lineStyle(lw, C_ANCHOR_F, 0.9)
      this.nodeGfx.beginFill(snapClose ? C_ANCHOR_F : C_ANCHOR, snapClose ? 1 : 0.92)
      if (isSmooth) {
        this.nodeGfx.drawCircle(pt.x, pt.y, dr)
      } else {
        this.nodeGfx.drawRect(pt.x - dr * 0.8, pt.y - dr * 0.8, dr * 1.6, dr * 1.6)
      }
      this.nodeGfx.endFill()
    }

    // Cursor ghost dot
    if (this.cursor_ && !this.dragging_) {
      const nearFirst = this.mode_ === 'polygon' && this.isNearFirst(this.cursor_)
      if (!nearFirst) {
        this.nodeGfx.lineStyle(lw, C_ANCHOR_F, 0.5)
        this.nodeGfx.beginFill(C_ANCHOR_F, 0.2)
        this.nodeGfx.drawCircle(this.cursor_.x, this.cursor_.y, dr * 0.65)
        this.nodeGfx.endFill()
      }
    }
  }

  private segCP(
    i: number, pts: BezierPoint[],
  ): { p1: Point; p2: Point; p3: Point } {
    const a = pts[i], b = pts[i + 1]
    return {
      p1: { x: a.x + (a.ho?.x ?? 0), y: a.y + (a.ho?.y ?? 0) },
      p2: { x: b.x + (b.hi?.x ?? 0), y: b.y + (b.hi?.y ?? 0) },
      p3: { x: b.x, y: b.y },
    }
  }

  private clear() {
    this.fillGfx.clear()
    this.pathGfx.clear()
    this.rubberGfx.clear()
    this.nodeGfx.clear()
  }
}
