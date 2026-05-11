import * as PIXI from 'pixi.js'
import { Viewport } from 'pixi-viewport'
import { FabricLayer } from '../layers/FabricLayer'
import { GridLayer } from '../layers/GridLayer'
import { EmbroideryLayer } from '../layers/EmbroideryLayer'
import { SelectionLayer } from '../layers/SelectionLayer'
import { DrawingLayer, type DrawMode } from '../layers/DrawingLayer'
import { NodeEditLayer } from '../layers/NodeEditLayer'
import type {
  EmbroideryObject, SatinFillObject, TatamiFillObject,
  RunStitchObject, SatinColumnObject, Point,
} from '../../embroidery/types'
import type { HoopDimensions } from '../../store/canvasStore'
import { PX_PER_MM } from '../../store/canvasStore'
import { useToolStore } from '../../store/toolStore'
import { useEmbroideryStore } from '../../store/embroideryStore'
import { pointInPolygon, distToPolyline } from '../../embroidery/generators/math'

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
  onNodeChange:      (id: string, field: string, pts: Point[]) => void
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
  private callbacks:  ViewportCallbacks
  private objects_:   EmbroideryObject[] = []

  // drawing state
  private isDrawing_:    boolean = false
  private drawMode_:     DrawMode = 'polygon'
  private lastClickTime: number = 0
  private lastClickPos:  Point = { x: 0, y: 0 }

  // node-edit state
  private isNodeEdit_:   boolean = false
  private nodeDragging_: boolean = false

  // pan-tool state
  private panMode_: boolean = false

  // object drag state
  private objDragStart_:   Point | null = null
  private isDraggingObj_:  boolean = false
  private objDragDelta_:   Point = { x: 0, y: 0 }
  private objDragIds_:     string[] = []

  // DOM listener refs (needed to remove them on destroy)
  private _onMove:    (e: PointerEvent) => void
  private _onDown:    (e: PointerEvent) => void
  private _onUp:      (e: PointerEvent) => void
  private _onCtxMenu: (e: MouseEvent)   => void

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
      onBoundaryChange:  (id, b) => callbacks.onNodeChange(id, 'boundary', b),
      onPathChange:      (id, p) => callbacks.onNodeChange(id, 'path', p),
      onLeftPathChange:  (id, p) => callbacks.onNodeChange(id, 'leftPath', p),
      onRightPathChange: (id, p) => callbacks.onNodeChange(id, 'rightPath', p),
    })

    ;(this.viewport as never as PIXI.Container).addChild(
      this.fabric.displayObject,
      this.grid.displayObject,
      this.embroidery.displayObject,
      this.selection.displayObject,
      this.drawing.displayObject,
      this.nodeEdit.displayObject,
    )

    this.viewport.moveCenter(0, 0)
    this.viewport.setZoom(1.8, true)
    this.updateGrid()

    // ── DOM pointer events — bypass PixiJS hit-testing ───────────────────────
    // Arrow functions preserve `this` and serve as stable refs for removeEventListener
    this._onMove    = (e) => this.onPointerMove(e)
    this._onDown    = (e) => this.onPointerDown(e)
    this._onUp      = (e) => this.onPointerUp(e)
    this._onCtxMenu = (e) => this.onContextMenu(e)

    this.canvas.addEventListener('pointermove',  this._onMove)
    this.canvas.addEventListener('pointerdown',  this._onDown)
    this.canvas.addEventListener('pointerup',    this._onUp)
    this.canvas.addEventListener('contextmenu',  this._onCtxMenu)

    this.viewport.on('zoomed',  this.onZoomed,        this)
    this.viewport.on('moved',   this.onMoved,          this)
    this.viewport.on('clicked', this.onViewportClick, this)
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
  }

  syncSelection(selectedIds: string[], objects: EmbroideryObject[]) {
    const selected = objects.filter(o => selectedIds.includes(o.id))
    this.selection.render(selected, this.viewport.scale.x)
  }

  syncNodeEdit(obj: EmbroideryObject | null) {
    this.nodeEdit.setObject(obj, this.viewport.scale.x)
  }

  resize(w: number, h: number) {
    this.viewport.resize(w, h)
    this.app.renderer.resize(w, h)
    this.updateGrid()
  }

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
    this.isNodeEdit_ = true
    this.viewport.plugins.pause('drag')
    this.viewport.plugins.pause('decelerate')
  }

  stopNodeEdit() {
    this.isNodeEdit_ = false
    this.nodeDragging_ = false
    this.nodeEdit.hide()
    this.resumeNav()
  }

  setPanMode(enable: boolean) {
    this.panMode_ = enable
    this.viewport.plugins.remove('drag')
    this.viewport.drag({ mouseButtons: enable ? 'left' : 'middle' })
  }

  enableSpacePan(enable: boolean) {
    this.viewport.plugins.remove('drag')
    this.viewport.drag({ mouseButtons: enable ? 'left' : (this.panMode_ ? 'left' : 'middle') })
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
    const pt = this.viewport.toWorld(sx, sy);  return { x: pt.x, y: pt.y }
  }

  // ── DOM → world coordinate conversion ────────────────────────────────────────

  private domToWorld(e: MouseEvent): Point {
    const rect = this.canvas.getBoundingClientRect()
    // clientX/Y and getBoundingClientRect are both in CSS pixels
    const sx = e.clientX - rect.left
    const sy = e.clientY - rect.top
    const w  = this.viewport.toWorld(sx, sy)
    return { x: w.x, y: w.y }
  }

  // ── Pointer handlers ─────────────────────────────────────────────────────────

  private onPointerMove(e: PointerEvent) {
    const world = this.domToWorld(e)
    const zoom  = this.viewport.scale.x

    if (this.isDrawing_) {
      this.drawing.update(world, zoom)
      return
    }

    if (this.isNodeEdit_ && this.nodeDragging_) {
      this.nodeEdit.onPointerMove(world, zoom, true)
      this.embroidery.rerenderAll(this.objects_)
      return
    }

    // Object drag — only while left button is held
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

    // ── Node edit ────────────────────────────────────────────────────────────
    if (this.isNodeEdit_) {
      const hit = this.nodeEdit.onPointerDown(world, zoom)
      if (hit) this.nodeDragging_ = true
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
      const newScale = Math.min(Math.max(this.viewport.scale.x * factor, MIN_ZOOM), MAX_ZOOM)
      const center   = this.viewport.center
      const cx = center.x + (world.x - center.x) * 0.35
      const cy = center.y + (world.y - center.y) * 0.35
      this.viewport.animate({ scale: newScale, position: { x: cx, y: cy }, time: 200, ease: 'easeOutQuart' })
      return
    }

    // ── Select — hit-test objects ─────────────────────────────────────────────
    if (tool === 'select') {
      const hitId = this.hitTestObjects(world, zoom)
      if (hitId) {
        this.callbacks.onObjectClick(hitId, e.shiftKey || e.metaKey || e.ctrlKey)
        // Zustand updates synchronously — capture the new selection for drag
        this.objDragStart_  = world
        this.isDraggingObj_ = false
        this.objDragDelta_  = { x: 0, y: 0 }
        this.objDragIds_    = useEmbroideryStore.getState().selectedIds
      } else {
        // Background click — deselect immediately on pointer-down
        this.callbacks.onBackgroundClick()
      }
    }
  }

  private onPointerUp(e: PointerEvent) {
    // ── Node drag end ────────────────────────────────────────────────────────
    if (this.isNodeEdit_ && this.nodeDragging_) {
      this.nodeDragging_ = false
      this.nodeEdit.onPointerUp(this.viewport.scale.x)
      this.embroidery.rerenderAll(this.objects_)
    }

    // ── Object drag commit ───────────────────────────────────────────────────
    if (this.objDragStart_) {
      if (this.isDraggingObj_) {
        const { x: dx, y: dy } = this.objDragDelta_
        this.embroidery.clearOffsets()
        this.selection.clearDragOffset()
        if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
          this.callbacks.onObjectMove(this.objDragIds_, dx, dy)
        }
      }
      this.objDragStart_  = null
      this.isDraggingObj_ = false
      this.objDragDelta_  = { x: 0, y: 0 }
      this.objDragIds_    = []
    }
  }

  private onContextMenu(e: MouseEvent) {
    e.preventDefault()
    if (!this.isDrawing_) return
    const world = this.domToWorld(e)
    void world  // consumed only for side-effect

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

  // pixi-viewport emits 'clicked' with { world, screen, viewport, event }
  private onViewportClick(data: { world: Point; screen: Point }) {
    if (this.isDrawing_ || this.isNodeEdit_) return
    const tool = useToolStore.getState().activeTool
    if (tool === 'zoom-in' || tool === 'zoom-out' || tool === 'pan') return
    if (tool !== 'select') { this.callbacks.onBackgroundClick(); return }
    const zoom = this.viewport.scale.x
    if (!data?.world || !this.hitTestObjects(data.world, zoom)) {
      this.callbacks.onBackgroundClick()
    }
  }

  // ── Hit testing ──────────────────────────────────────────────────────────────

  private hitTestObjects(world: Point, zoom: number): string | null {
    const hitR = 8 / zoom  // 8 screen-px tolerance in world space

    for (let i = this.objects_.length - 1; i >= 0; i--) {
      const obj = this.objects_[i]
      if (!obj.visible) continue

      if (obj.type === 'satin-fill' || obj.type === 'tatami-fill') {
        const b = (obj as SatinFillObject | TatamiFillObject).boundary
        if (b && b.length >= 3 && pointInPolygon(world, b)) return obj.id

      } else if (obj.type === 'run-stitch') {
        const p = (obj as RunStitchObject).path
        if (p && p.length >= 2 && distToPolyline(world, p) < hitR) return obj.id

      } else if (obj.type === 'satin-column') {
        const col = obj as SatinColumnObject
        const r3  = hitR * 3
        if ((col.leftPath  && distToPolyline(world, col.leftPath)  < r3) ||
            (col.rightPath && distToPolyline(world, col.rightPath) < r3)) return obj.id
      }
    }
    return null
  }

  // ── Private utils ────────────────────────────────────────────────────────────

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

  private resumeNav() {
    if (!this.isDrawing_ && !this.isNodeEdit_) {
      this.viewport.plugins.resume('drag')
      this.viewport.plugins.resume('decelerate')
    }
  }

  private onZoomed() {
    const z = this.viewport.scale.x
    this.embroidery.setZoom(z)
    this.embroidery.rerenderAll(this.objects_)
    this.updateGrid()
    this.callbacks.onZoomChange(z, this.viewport.center.x, this.viewport.center.y)
  }

  private onMoved() { this.updateGrid() }

  private updateGrid() {
    const vp   = this.viewport
    const zoom = vp.scale.x
    const cx   = vp.center.x
    const cy   = vp.center.y
    const vw   = this.app.screen.width  / zoom
    const vh   = this.app.screen.height / zoom
    this.grid.update(cx - vw / 2, cy - vh / 2, vw, vh, zoom)
  }

  destroy() {
    this.canvas.removeEventListener('pointermove',  this._onMove)
    this.canvas.removeEventListener('pointerdown',  this._onDown)
    this.canvas.removeEventListener('pointerup',    this._onUp)
    this.canvas.removeEventListener('contextmenu',  this._onCtxMenu)

    this.viewport.off('zoomed',  this.onZoomed,        this)
    this.viewport.off('moved',   this.onMoved,          this)
    this.viewport.off('clicked', this.onViewportClick, this)

    this.embroidery.destroy()
    this.viewport.destroy()
  }
}
