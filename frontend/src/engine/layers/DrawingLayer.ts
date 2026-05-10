import * as PIXI from 'pixi.js'
import type { Point } from '../../embroidery/types'

const ACCENT      = 0x40916c
const ACCENT_FILL = 0x40916c
const SNAP_DIST   = 12   // screen-px — how close to first point triggers snap hint
const DOT_R       = 4    // screen-px

export type DrawMode = 'polygon' | 'polyline' | 'column'

/**
 * Renders the in-progress drawing: placed anchor points, connecting lines,
 * rubber-band to cursor, and a semi-transparent shape fill preview.
 */
export class DrawingLayer {
  private container:  PIXI.Container
  private fillGfx:    PIXI.Graphics   // shape fill preview
  private lineGfx:    PIXI.Graphics   // placed lines + rubber-band
  private dotGfx:     PIXI.Graphics   // anchor point dots
  private mode_:      DrawMode = 'polygon'
  private phase_:     number = 0      // for column mode: 0=left, 1=right
  private leftPts:    Point[] = []
  private rightPts:   Point[] = []

  constructor() {
    this.container = new PIXI.Container()
    this.fillGfx   = new PIXI.Graphics()
    this.lineGfx   = new PIXI.Graphics()
    this.dotGfx    = new PIXI.Graphics()
    this.container.addChild(this.fillGfx, this.lineGfx, this.dotGfx)
    this.container.visible = false
  }

  get displayObject(): PIXI.Container { return this.container }
  get mode(): DrawMode { return this.mode_ }
  get phase(): number { return this.phase_ }
  get leftPoints(): Point[] { return this.leftPts }
  get rightPoints(): Point[] { return this.rightPts }

  // ── Public ──────────────────────────────────────────────────────────────────

  startDrawing(mode: DrawMode) {
    this.mode_   = mode
    this.phase_  = 0
    this.leftPts  = []
    this.rightPts = []
    this.container.visible = true
    this.clear()
  }

  stopDrawing() {
    this.container.visible = false
    this.clear()
    this.leftPts  = []
    this.rightPts = []
    this.phase_   = 0
  }

  addPoint(pt: Point): boolean {
    // Returns true if the shape is complete (snapped to first point)
    if (this.mode_ === 'column') {
      if (this.phase_ === 0) this.leftPts.push(pt)
      else                   this.rightPts.push(pt)
      return false
    }

    if (this.mode_ === 'polygon') {
      // Snap-close: if clicking near first point, complete
      if (this.leftPts.length >= 3 && this.isNearFirst(pt)) return true
      this.leftPts.push(pt)
      return false
    }

    // polyline
    this.leftPts.push(pt)
    return false
  }

  advanceColumnPhase() {
    // Called by right-click during column drawing
    if (this.mode_ !== 'column') return
    if (this.phase_ === 0) this.phase_ = 1
  }

  isNearFirst(cursor: Point, zoom = 1): boolean {
    if (this.leftPts.length < 3) return false
    const [f] = this.leftPts
    const dx = (cursor.x - f.x), dy = (cursor.y - f.y)
    return Math.sqrt(dx * dx + dy * dy) < SNAP_DIST / zoom
  }

  /**
   * Called every frame while mouse moves — redraws the preview.
   */
  update(cursor: Point | null, zoom: number) {
    this.fillGfx.clear()
    this.lineGfx.clear()
    this.dotGfx.clear()

    const pts = this.mode_ === 'column' && this.phase_ === 1
      ? this.rightPts : this.leftPts

    const allPts = cursor ? [...pts, cursor] : pts
    if (allPts.length === 0) return

    const dotR    = DOT_R / zoom
    const lineW   = 1.5 / zoom
    const snapDot = SNAP_DIST / zoom

    // ── Fill preview (polygon only) ────────────────────────────────────────
    if (this.mode_ === 'polygon' && pts.length >= 2) {
      this.fillGfx.beginFill(ACCENT_FILL, 0.12)
      this.fillGfx.lineStyle(0)
      this.fillGfx.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length; i++) this.fillGfx.lineTo(pts[i].x, pts[i].y)
      if (cursor) this.fillGfx.lineTo(cursor.x, cursor.y)
      this.fillGfx.closePath()
      this.fillGfx.endFill()
    }

    // ── Lines between placed points ────────────────────────────────────────
    if (pts.length >= 1) {
      this.lineGfx.lineStyle(lineW, ACCENT, 0.9)
      this.lineGfx.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length; i++) this.lineGfx.lineTo(pts[i].x, pts[i].y)
    }

    // ── Rubber-band to cursor ──────────────────────────────────────────────
    if (cursor && pts.length >= 1) {
      const last = pts[pts.length - 1]
      const nearFirst = this.mode_ === 'polygon' && this.isNearFirst(cursor, zoom)

      this.lineGfx.lineStyle(lineW, ACCENT, nearFirst ? 1 : 0.5, 0.5, true)
      this.lineGfx.moveTo(last.x, last.y)
      this.lineGfx.lineTo(cursor.x, cursor.y)

      // Close-path ghost
      if (this.mode_ === 'polygon' && pts.length >= 2) {
        this.lineGfx.lineStyle(lineW * 0.6, ACCENT, 0.25, 0.5, true)
        this.lineGfx.moveTo(cursor.x, cursor.y)
        this.lineGfx.lineTo(pts[0].x, pts[0].y)
      }
    }

    // ── Left/right path lines for column mode ─────────────────────────────
    if (this.mode_ === 'column') {
      const otherPts = this.phase_ === 1 ? this.leftPts : []
      if (otherPts.length >= 2) {
        this.lineGfx.lineStyle(lineW, 0xffa040, 0.6)
        this.lineGfx.moveTo(otherPts[0].x, otherPts[0].y)
        for (let i = 1; i < otherPts.length; i++) this.lineGfx.lineTo(otherPts[i].x, otherPts[i].y)
      }
    }

    // ── Anchor dots ────────────────────────────────────────────────────────
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i]
      const isFirst = i === 0
      const nearSnap = isFirst && this.mode_ === 'polygon' && cursor && this.isNearFirst(cursor, zoom)
      this.dotGfx.lineStyle(lineW, ACCENT, 1)
      this.dotGfx.beginFill(nearSnap ? ACCENT : 0xffffff, nearSnap ? 0.9 : 0.85)
      this.dotGfx.drawCircle(p.x, p.y, nearSnap ? dotR * 1.6 : dotR)
      this.dotGfx.endFill()
    }

    // Cursor dot
    if (cursor && !(this.mode_ === 'polygon' && this.isNearFirst(cursor, zoom))) {
      this.dotGfx.lineStyle(lineW, ACCENT, 0.6)
      this.dotGfx.beginFill(ACCENT, 0.3)
      this.dotGfx.drawCircle(cursor.x, cursor.y, dotR * 0.7)
      this.dotGfx.endFill()
    }
  }

  private clear() {
    this.fillGfx.clear()
    this.lineGfx.clear()
    this.dotGfx.clear()
  }
}
