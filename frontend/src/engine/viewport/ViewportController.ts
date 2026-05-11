import * as PIXI from 'pixi.js'
import { Viewport } from 'pixi-viewport'
import { FabricLayer }    from '../layers/FabricLayer'
import { GridLayer }      from '../layers/GridLayer'
import { EmbroideryLayer }from '../layers/EmbroideryLayer'
import { SelectionLayer } from '../layers/SelectionLayer'
import { DrawingLayer, type DrawMode } from '../layers/DrawingLayer'
import { NodeEditLayer, type NodeField } from '../layers/NodeEditLayer'
import { PenLayer, type PenMode } from '../layers/PenLayer'
import type {
  EmbroideryObject, SatinFillObject, TatamiFillObject,
  RunStitchObject, SatinColumnObject, BezierPath, Point,
} from '../../embroidery/types'
import { ptsToBezier } from '../../embroidery/types'
import type { HoopDimensions } from '../../store/canvasStore'
import { PX_PER_MM } from '../../store/canvasStore'
import { useToolStore } from '../../store/toolStore'
import { useEmbroideryStore } from '../../store/embroideryStore'
import { pointInPolygon, distToPolyline } from '../../embroidery/generators/math'
import { flattenBezierPath } from '../../embroidery/geometry/BezierMath'

const WORLD_SIZE    = 8000
const MIN_ZOOM      = 0.05
const MAX_ZOOM      = 40
const DBL_CLICK_MS  = 320
const OBJ_DRAG_PX   = 4     // screen-px before a click becomes a drag

export interface ViewportCallbacks {
  onZoomChange:      (zoom: number, x: number, y: number) => void
  onObjectClick:     (id: string, multi: boolean) => void
  onBackgroundClick: () => void
  onDrawComplete:    (mode: DrawMode, leftPts: Point[], rightPts: Point[]) => void
  onPenComplete:     (mode: PenMode, path: BezierPath) => void
  onNodeLiveChange:  (id: string, field: NodeField, path: BezierPath) => void
  onNodeCommit:      (id: string, field: NodeField, path: BezierPath) => void
  onObjectMove:      (ids: string[], dx: number, dy: number) => void
}

export class ViewportController {
  private app:        PIXI.Application
  private canvas:     HTMLCanvasElement
  private viewport:   Viewport
  private fabric:     FabricLayer
  private grid:       GridLayer
  private embroidery: EmbroideryLayer
  private selection:  SelectionLayer
  private drawing:    DrawingLayer
  private nodeEdit:   NodeEditLayer
  private penLayer:   PenLayer
  private callbacks:  ViewportCallbacks
  private objects_:   EmbroideryObject[] = []

  // drawing state (existing polygon/polyline tools)
  private isDrawing_:    boolean = false
  private drawMode_:     DrawMode = 'polygon'
  private lastClickTime: number = 0
  private lastClickPos:  Point = { x: 0, y: 0 }

  // node-edit state
  private isNodeEdit_:    boolean = false
  private isDirectSelect_:boolean = false

  // pen state
  private isPen_:         boolean = false
  private penMode_:       PenMode = 'polyline'
  private penDragging_:   boolean = false

  // pan-tool state
  private panMode_:      boolean = false
  private panDragStart_: { sx: number; sy: number; cx: number; cy: number } | null = null

  // object drag state
  private objDragStart_:   Point | null = null
  private isDraggingObj_:  boolean = false
  private objDragDelta_:   Point = { x: 0, y: 0 }
  private objDragIds_:     string[] = []

  // DOM listener refs
  private _onMove:    (e: PointerEvent) => void
  private _onDown:    (e: PointerEvent) => void
  private _onUp:      (e: PointerEvent) => void
  private _onCtxMenu: (e: MouseEvent) => void

  constructor(app: PIXI.Application, callbacks: ViewportCallbacks) {
    this.app       = app
    this.canvas    = app.view as HTMLCanvasElement
    this.callbacks = callbacks

    this.viewport = new Viewport({
      screenWidth:  app.screen.width,
      screenHeight: app.screen.height,
      worldWidth:   WORLD_SIZE,
      worldHeight:  WORLD_SIZE,
      events:       (app.renderer as PIXI.Renderer).events,
    } as never)

    this.viewport
      .drag({ mouseButtons: 'middle' })
      .pinch()
      .wheel({ smooth: 3, percent: 0.08 })
      .decelerate({ friction: 0.93 })
      .clampZoom({ minScale: MIN_ZOOM, maxScale: MAX_ZOOM })

    app.stage.addChild(this.viewport as never)

    // ── Scene graph ──────────────────────────────────────────────────────────
    this.fabric     = new FabricLayer()
    this.grid       = new GridLayer()
    this.embroidery = new EmbroideryLayer()
    this.selection  = new SelectionLayer()
    this.drawing    = new DrawingLayer()
    this.nodeEdit   = new NodeEditLayer({
      onLiveChange: (id, field, path) => callbacks.onNodeLiveChange(id, field, path),
      onCommit:     (id, field, path) => callbacks.onNodeCommit(id, field, path),
    })
    this.penLayer   = new PenLayer()

    ;(this.viewport as never as PIXI.Container).addChild(
      this.fabric.displayObject,
      this.grid.displayObject,
      this.embroidery.displayObject,
      this.selection.displayObject,
      this.drawing.displayObject,
      this.nodeEdit.displayObject,
      this.penLayer.displayObject,
    )

    this.viewport.moveCenter(0, 0)
    this.viewport.setZoom(1.8, true)
    this.updateGrid()

    this._onMove    = (e) => this.onPointerMove(e)
    this._onDown    = (e) => this.onPointerDown(e)
    this._onUp      = (e) => this.onPointerUp(e)
    this._onCtxMenu = (e) => this.onContextMenu(e)

    this.canvas.addEventListener('pointermove',  this._onMove)
    this.canvas.addEventListener('pointerdown',  this._onDown)
    this.canvas.addEventListener('pointerup',    this._onUp)
    this.canvas.addEventListener('contextmenu',  this._onCtxMenu)

    this.viewport.on('zoomed', this.onZoomed, this)
    this.viewport.on('moved',  this.onMoved,  this)
  }

  // ── Public API ───────────────────────────────────────────────────────────────

  initFabric(color: string, hoop: HoopDimensions, showHoop: boolean) {
    this.fabric.initTexture(color)
    this.fabric.updateHoop(hoop, showHoop)
  }

  updateFabricColor(color: string) { this.fabric.updateFabricColor(color) }
  updateHoop(hoop: HoopDimensions, visible: boolean) { this.fabric.updateHoop(hoop, visible) }
  setGridVisible(v: boolean) { this.grid.setVisible(v) }

  syncObjects(objects: EmbroideryObject[]) {
    this.objects_ = objects
    this.embroidery.setZoom(this.viewport.scale.x)
    this.embroidery.syncObjects(objects)
    // Keep node-edit layer in sync when in direct-select mode
    if (this.isDirectSelect_) {
      this.nodeEdit.syncObjects(objects, this.viewport.scale.x)
    }
  }

  syncSelection(selectedIds: string[], objects: EmbroideryObject[]) {
    const selected = objects.filter(o => selectedIds.includes(o.id))
    this.selection.render(selected, this.viewport.scale.x)
  }

  /** Called when node-edit tool is active — shows nodes for selected object */
  syncNodeEdit(obj: EmbroideryObject | null) {
    if (!this.isNodeEdit_) return
    const objs = obj ? [obj] : []
    this.nodeEdit.setObjects(objs, this.viewport.scale.x)
  }

  /** Called when direct-select tool is active — shows ALL visible object nodes */
  syncDirectSelect(objects: EmbroideryObject[]) {
    if (!this.isDirectSelect_) return
    this.nodeEdit.setObjects(objects, this.viewport.scale.x)
  }

  resize(w: number, h: number) {
    this.viewport.resize(w, h)
    this.app.renderer.resize(w, h)
    this.updateGrid()
  }

  // ── Tool activation ──────────────────────────────────────────────────────────

  startDrawMode(mode: DrawMode) {
    this.isDrawing_ = true
    this.drawMode_  = mode
    this.drawing.startDrawing(mode)
    this.viewport.plugins.pause('drag')
    this.viewport.plugins.pause('decelerate')
  }

  stopDrawMode() {
    this.isDrawing_ = false
    this.drawing.stopDrawing()
    this.resumeNav()
  }

  startNodeEdit() {
    this.isNodeEdit_     = true
    this.isDirectSelect_ = false
    this.viewport.plugins.pause('drag')
    this.viewport.plugins.pause('decelerate')
  }

  stopNodeEdit() {
    this.isNodeEdit_     = false
    this.isDirectSelect_ = false
    this.nodeEdit.hide()
    this.resumeNav()
  }

  startDirectSelect() {
    this.isDirectSelect_ = true
    this.isNodeEdit_     = false
    // Direct select doesn't pause drag — it handles its own events and falls
    // through to pan when nothing is hit
  }

  stopDirectSelect() {
    this.isDirectSelect_ = false
    this.nodeEdit.hide()
  }

  startPen(mode: PenMode) {
    this.isPen_    = true
    this.penMode_  = mode
    this.penLayer.start(mode)
    this.viewport.plugins.pause('drag')
    this.viewport.plugins.pause('decelerate')
  }

  stopPen() {
    this.isPen_    = false
    this.penDragging_ = false
    this.penLayer.stop()
    this.resumeNav()
  }

  setPanMode(enable: boolean) {
    this.panMode_ = enable
    if (!enable) this.panDragStart_ = null
  }

  enableSpacePan(enable: boolean) {
    this.panMode_ = enable || useToolStore.getState().activeTool === 'pan'
    if (!enable) this.panDragStart_ = null
  }

  zoomToFit(hoop: HoopDimensions) {
    const hw = hoop.width  * PX_PER_MM
    const hh = hoop.height * PX_PER_MM
    const margin = 60
    const scale = Math.min(
      (this.app.screen.width  - margin * 2) / hw,
      (this.app.screen.height - margin * 2) / hh,
    )
    this.viewport.animate({ scale, position: { x: 0, y: 0 }, time: 380, ease: 'easeInOutQuart' })
  }

  getZoom(): number { return this.viewport.scale.x }

  worldToScreen(wx: number, wy: number) {
    const pt = this.viewport.toScreen(wx, wy); return { x: pt.x, y: pt.y }
  }
  screenToWorld(sx: number, sy: number) {
    const pt = this.viewport.toWorld(sx, sy); return { x: pt.x, y: pt.y }
  }

  // ── DOM → world ───────────────────────────────────────────────────────────────

  private domToWorld(e: MouseEvent): Point {
    const rect = this.canvas.getBoundingClientRect()
    const sx   = e.clientX - rect.left
    const sy   = e.clientY - rect.top
    const w    = this.viewport.toWorld(sx, sy)
    return { x: w.x, y: w.y }
  }

  // ── Pointer handlers ─────────────────────────────────────────────────────────

  private onPointerMove(e: PointerEvent) {
    const world = this.domToWorld(e)
    const zoom  = this.viewport.scale.x

    // ── Manual pan ───────────────────────────────────────────────────────────
    if (this.panDragStart_ && (e.buttons & 1)) {
      const rect = this.canvas.getBoundingClientRect()
      const sx   = e.clientX - rect.left
      const sy   = e.clientY - rect.top
      const ddx  = (sx - this.panDragStart_.sx) / zoom
      const ddy  = (sy - this.panDragStart_.sy) / zoom
      this.viewport.moveCenter(
        this.panDragStart_.cx - ddx,
        this.panDragStart_.cy - ddy,
      )
      this.updateGrid()
      return
    }

    // ── Pen tool drag ────────────────────────────────────────────────────────
    if (this.isPen_) {
      if (this.penDragging_ && (e.buttons & 1)) {
        this.penLayer.onPointerDrag(world, zoom)
      } else {
        this.penLayer.updateCursor(world, zoom)
      }
      return
    }

    // ── Drawing ──────────────────────────────────────────────────────────────
    if (this.isDrawing_) {
      this.drawing.update(world, zoom)
      return
    }

    // ── Node / direct-select ─────────────────────────────────────────────────
    if (this.isNodeEdit_ || this.isDirectSelect_) {
      this.nodeEdit.onPointerMove(world, zoom, e.altKey)
      if (this.isNodeEdit_) this.embroidery.rerenderAll(this.objects_)
      return
    }

    // ── Object drag ──────────────────────────────────────────────────────────
    if (this.objDragStart_ && (e.buttons & 1)) {
      const dx = world.x - this.objDragStart_.x
      const dy = world.y - this.objDragStart_.y
      if (!this.isDraggingObj_ && Math.sqrt(dx * dx + dy * dy) * zoom > OBJ_DRAG_PX) {
        this.isDraggingObj_ = true
      }
      if (this.isDraggingObj_) {
        this.embroidery.clearOffsets()
        for (const id of this.objDragIds_) this.embroidery.setObjectOffset(id, dx, dy)
        this.selection.setDragOffset(dx, dy)
        this.objDragDelta_ = { x: dx, y: dy }
      }
    }
  }

  private onPointerDown(e: PointerEvent) {
    if (e.button !== 0) return

    const world = this.domToWorld(e)
    const zoom  = this.viewport.scale.x
    const tool  = useToolStore.getState().activeTool

    // ── Pan ──────────────────────────────────────────────────────────────────
    const isPanning = this.panMode_ || tool === 'pan'
    if (isPanning) {
      const rect = this.canvas.getBoundingClientRect()
      this.panDragStart_ = {
        sx: e.clientX - rect.left,
        sy: e.clientY - rect.top,
        cx: this.viewport.center.x,
        cy: this.viewport.center.y,
      }
      this.canvas.setPointerCapture(e.pointerId)
      return
    }

    // ── Pen tool ──────────────────────────────────────────────────────────────
    if (this.isPen_) {
      const result = this.penLayer.onPointerDown(world, zoom)
      if (result === 'placed') {
        this.penDragging_ = true
        this.canvas.setPointerCapture(e.pointerId)
      } else if (result === 'close' || result === 'complete') {
        const closed = result === 'close'
        this.completePen(closed)
      }
      return
    }

    // ── Node edit ────────────────────────────────────────────────────────────
    if (this.isNodeEdit_) {
      const hit = this.nodeEdit.onPointerDown(world, zoom, e.altKey, e.shiftKey)
      if (hit) {
        this.embroidery.rerenderAll(this.objects_)
        this.canvas.setPointerCapture(e.pointerId)
      }
      return
    }

    // ── Direct select ─────────────────────────────────────────────────────────
    if (this.isDirectSelect_) {
      const hit = this.nodeEdit.onPointerDown(world, zoom, e.altKey, e.shiftKey)
      if (hit) this.canvas.setPointerCapture(e.pointerId)
      // Direct select never falls through to selection/drag
      return
    }

    // ── Drawing ──────────────────────────────────────────────────────────────
    if (this.isDrawing_) {
      const now = Date.now()
      const dx  = world.x - this.lastClickPos.x
      const dy  = world.y - this.lastClickPos.y
      const dbl = (now - this.lastClickTime < DBL_CLICK_MS) &&
                  (Math.sqrt(dx * dx + dy * dy) < 8 / zoom)
      this.lastClickTime = now
      this.lastClickPos  = world

      if (dbl) { this.completeDrawing(); return }

      const done = this.drawing.addPoint(world)
      if (done) this.completeDrawing()
      else      this.drawing.update(world, zoom)
      return
    }

    // ── Zoom tools ───────────────────────────────────────────────────────────
    if (tool === 'zoom-in' || tool === 'zoom-out') {
      const factor   = tool === 'zoom-in' ? 1.6 : 1 / 1.6
      const newScale = Math.min(Math.max(zoom * factor, MIN_ZOOM), MAX_ZOOM)
      const center   = this.viewport.center
      const cx = center.x + (world.x - center.x) * 0.35
      const cy = center.y + (world.y - center.y) * 0.35
      this.viewport.animate({ scale: newScale, position: { x: cx, y: cy }, time: 200, ease: 'easeOutQuart' })
      return
    }

    // ── Select ───────────────────────────────────────────────────────────────
    if (tool === 'select') {
      const hitId = this.hitTestObjects(world, zoom)
      if (hitId) {
        this.callbacks.onObjectClick(hitId, e.shiftKey || e.metaKey || e.ctrlKey)
        this.objDragStart_  = world
        this.isDraggingObj_ = false
        this.objDragDelta_  = { x: 0, y: 0 }
        this.objDragIds_    = useEmbroideryStore.getState().selectedIds
      } else {
        this.callbacks.onBackgroundClick()
      }
    }
  }

  private onPointerUp(e: PointerEvent) {
    // ── Pan drag end ──────────────────────────────────────────────────────────
    if (this.panDragStart_) {
      this.panDragStart_ = null
      if (this.canvas.hasPointerCapture(e.pointerId))
        this.canvas.releasePointerCapture(e.pointerId)
      return
    }

    // ── Pen drag end ──────────────────────────────────────────────────────────
    if (this.isPen_ && this.penDragging_) {
      this.penDragging_ = false
      this.penLayer.onPointerUp(this.viewport.scale.x)
      if (this.canvas.hasPointerCapture(e.pointerId))
        this.canvas.releasePointerCapture(e.pointerId)
      return
    }

    // ── Node edit drag end ───────────────────────────────────────────────────
    if (this.isNodeEdit_ || this.isDirectSelect_) {
      this.nodeEdit.onPointerUp(this.viewport.scale.x)
      this.embroidery.rerenderAll(this.objects_)
      if (this.canvas.hasPointerCapture(e.pointerId))
        this.canvas.releasePointerCapture(e.pointerId)
      return
    }

    // ── Object drag commit ───────────────────────────────────────────────────
    if (this.objDragStart_) {
      if (this.isDraggingObj_) {
        const { x: dx, y: dy } = this.objDragDelta_
        this.embroidery.clearOffsets()
        this.selection.clearDragOffset()
        if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1)
          this.callbacks.onObjectMove(this.objDragIds_, dx, dy)
      }
      this.objDragStart_  = null
      this.isDraggingObj_ = false
      this.objDragDelta_  = { x: 0, y: 0 }
      this.objDragIds_    = []
    }
  }

  private onContextMenu(e: MouseEvent) {
    e.preventDefault()
    if (this.isPen_) {
      // Right-click = finish pen path
      this.completePen(false)
      return
    }
    if (!this.isDrawing_) return
    if (this.drawing.mode === 'column') {
      if (this.drawing.phase === 0 && this.drawing.leftPoints.length >= 2) {
        this.drawing.advanceColumnPhase()
      } else if (this.drawing.phase === 1 && this.drawing.rightPoints.length >= 2) {
        this.completeDrawing()
      }
    } else {
      this.completeDrawing()
    }
  }

  // ── Completion ───────────────────────────────────────────────────────────────

  private completeDrawing() {
    const left  = [...this.drawing.leftPoints]
    const right = [...this.drawing.rightPoints]
    const mode  = this.drawing.mode
    const minPts = mode === 'polygon' ? 3 : 2
    if (left.length < minPts) { this.stopDrawMode(); return }
    if (mode === 'column' && right.length < 2) { this.stopDrawMode(); return }
    this.stopDrawMode()
    this.callbacks.onDrawComplete(mode, left, right)
  }

  private completePen(closed: boolean) {
    const n = this.penLayer.pointCount
    const minPts = this.penMode_ === 'polygon' ? 3 : 2
    if (n < minPts) { this.stopPen(); return }
    const path = this.penLayer.buildPath(closed || this.penMode_ === 'polygon')
    this.stopPen()
    this.callbacks.onPenComplete(this.penMode_, path)
  }

  // ── Hit testing ───────────────────────────────────────────────────────────────

  private hitTestObjects(world: Point, zoom: number): string | null {
    const hitR = 8 / zoom

    for (let i = this.objects_.length - 1; i >= 0; i--) {
      const obj = this.objects_[i]
      if (!obj.visible) continue

      if (obj.type === 'satin-fill' || obj.type === 'tatami-fill') {
        const b = flattenBezierPath((obj as SatinFillObject | TatamiFillObject).boundary)
        if (b.length >= 3 && pointInPolygon(world, b)) return obj.id

      } else if (obj.type === 'run-stitch') {
        const p = flattenBezierPath((obj as RunStitchObject).path)
        if (p.length >= 2 && distToPolyline(world, p) < hitR) return obj.id

      } else if (obj.type === 'satin-column') {
        const col = obj as SatinColumnObject
        const r3  = hitR * 3
        const lp  = flattenBezierPath(col.leftPath)
        const rp  = flattenBezierPath(col.rightPath)
        if ((lp.length >= 2 && distToPolyline(world, lp) < r3) ||
            (rp.length >= 2 && distToPolyline(world, rp) < r3)) return obj.id
      }
    }
    return null
  }

  // ── Private utils ────────────────────────────────────────────────────────────

  private resumeNav() {
    if (!this.isDrawing_ && !this.isNodeEdit_ && !this.isPen_) {
      this.viewport.plugins.resume('drag')
      this.viewport.plugins.resume('decelerate')
    }
  }

  private onZoomed() {
    const z = this.viewport.scale.x
    this.embroidery.setZoom(z)
    this.embroidery.rerenderAll(this.objects_)
    this.nodeEdit.updateZoom(z)
    this.updateGrid()
    this.callbacks.onZoomChange(z, this.viewport.center.x, this.viewport.center.y)
  }

  private onMoved() { this.updateGrid() }

  private updateGrid() {
    const vp   = this.viewport
    const zoom = vp.scale.x
    const cx   = vp.center.x, cy = vp.center.y
    const vw   = this.app.screen.width  / zoom
    const vh   = this.app.screen.height / zoom
    this.grid.update(cx - vw / 2, cy - vh / 2, vw, vh, zoom)
  }

  destroy() {
    this.canvas.removeEventListener('pointermove',  this._onMove)
    this.canvas.removeEventListener('pointerdown',  this._onDown)
    this.canvas.removeEventListener('pointerup',    this._onUp)
    this.canvas.removeEventListener('contextmenu',  this._onCtxMenu)
    this.viewport.off('zoomed', this.onZoomed, this)
    this.viewport.off('moved',  this.onMoved,  this)
    this.embroidery.destroy()
    this.viewport.destroy()
  }
}
