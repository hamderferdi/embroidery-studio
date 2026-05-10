import * as PIXI from 'pixi.js'
import { Viewport } from 'pixi-viewport'
import { FabricLayer } from '../layers/FabricLayer'
import { GridLayer } from '../layers/GridLayer'
import { EmbroideryLayer } from '../layers/EmbroideryLayer'
import { SelectionLayer } from '../layers/SelectionLayer'
import { DrawingLayer, type DrawMode } from '../layers/DrawingLayer'
import { NodeEditLayer } from '../layers/NodeEditLayer'
import type { EmbroideryObject, Point } from '../../embroidery/types'
import type { HoopDimensions } from '../../store/canvasStore'
import { PX_PER_MM } from '../../store/canvasStore'

const WORLD_SIZE = 8000
const MIN_ZOOM   = 0.05
const MAX_ZOOM   = 40
const DBL_CLICK_MS = 320   // ms threshold for double-click detection

export interface ViewportCallbacks {
  onZoomChange:      (zoom: number, x: number, y: number) => void
  onObjectClick:     (id: string, multi: boolean) => void
  onBackgroundClick: () => void
  onDrawComplete:    (mode: DrawMode, leftPts: Point[], rightPts: Point[]) => void
  onNodeChange:      (id: string, field: string, pts: Point[]) => void
}

export class ViewportController {
  private app:        PIXI.Application
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

  constructor(app: PIXI.Application, callbacks: ViewportCallbacks) {
    this.app       = app
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

    // ── Pointer events ───────────────────────────────────────────────────────
    ;(this.viewport as never as PIXI.Container).interactive = true
    ;(this.viewport as never as PIXI.Container).on('pointermove',  this.onPointerMove,  this)
    ;(this.viewport as never as PIXI.Container).on('pointerdown',  this.onPointerDown,  this)
    ;(this.viewport as never as PIXI.Container).on('pointerup',    this.onPointerUp,    this)
    ;(this.viewport as never as PIXI.Container).on('rightclick',   this.onRightClick,   this)

    this.viewport.on('zoomed', this.onZoomed, this)
    this.viewport.on('moved',  this.onMoved,  this)
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
    // Disable middle-mouse drag so left-click draws cleanly
    this.viewport.plugins.pause('drag')
    this.viewport.plugins.pause('decelerate')
  }

  stopDrawMode() {
    this.isDrawing_ = false
    this.drawing.stopDrawing()
    this.viewport.plugins.resume('drag')
    this.viewport.plugins.resume('decelerate')
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
    this.viewport.plugins.resume('drag')
    this.viewport.plugins.resume('decelerate')
  }

  enableSpacePan(enable: boolean) {
    if (enable) {
      this.viewport.plugins.remove('drag')
      this.viewport.drag({ mouseButtons: 'left' })
    } else {
      this.viewport.plugins.remove('drag')
      this.viewport.drag({ mouseButtons: 'middle' })
    }
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

  // ── Pointer handlers ─────────────────────────────────────────────────────────

  private toWorld(e: PIXI.FederatedPointerEvent): Point {
    const g = e.global
    const w = this.viewport.toWorld(g.x, g.y)
    return { x: w.x, y: w.y }
  }

  private onPointerMove(e: PIXI.FederatedPointerEvent) {
    const world = this.toWorld(e)
    const zoom  = this.viewport.scale.x

    if (this.isDrawing_) {
      this.drawing.update(world, zoom)
    }

    if (this.isNodeEdit_ && this.nodeDragging_) {
      this.nodeEdit.onPointerMove(world, zoom, true)
      // Re-render objects after node change
      this.embroidery.rerenderAll(this.objects_)
    }
  }

  private onPointerDown(e: PIXI.FederatedPointerEvent) {
    if (e.button !== 0) return  // left button only
    const world = this.toWorld(e)
    const zoom  = this.viewport.scale.x

    if (this.isNodeEdit_) {
      const hit = this.nodeEdit.onPointerDown(world, zoom)
      if (hit) {
        this.nodeDragging_ = true
        e.stopPropagation()
      }
      return
    }

    if (this.isDrawing_) {
      const now = Date.now()
      const dx  = world.x - this.lastClickPos.x
      const dy  = world.y - this.lastClickPos.y
      const dblClick = (now - this.lastClickTime < DBL_CLICK_MS) &&
                       (Math.sqrt(dx * dx + dy * dy) < 8 / zoom)

      this.lastClickTime = now
      this.lastClickPos  = world

      if (dblClick) {
        this.completeDrawing()
        return
      }

      const done = this.drawing.addPoint(world)
      if (done) {
        this.completeDrawing()
      } else {
        this.drawing.update(world, zoom)
      }
      e.stopPropagation()
    }
  }

  private onPointerUp(e: PIXI.FederatedPointerEvent) {
    if (this.isNodeEdit_ && this.nodeDragging_) {
      this.nodeDragging_ = false
      this.nodeEdit.onPointerUp(this.viewport.scale.x)
      // Ensure embroidery layer is up to date
      this.embroidery.rerenderAll(this.objects_)
    }
  }

  private onRightClick(e: PIXI.FederatedPointerEvent) {
    if (!this.isDrawing_) return
    e.stopPropagation()

    if (this.drawing.mode === 'column') {
      if (this.drawing.phase === 0 && this.drawing.leftPoints.length >= 2) {
        this.drawing.advanceColumnPhase()
      } else if (this.drawing.phase === 1 && this.drawing.rightPoints.length >= 2) {
        this.completeDrawing()
      }
    } else {
      // Right-click completes polygon / polyline
      this.completeDrawing()
    }
  }

  private completeDrawing() {
    const left  = [...this.drawing.leftPoints]
    const right = [...this.drawing.rightPoints]
    const mode  = this.drawing.mode

    // Minimum point requirements
    const minPts = mode === 'polygon' ? 3 : (mode === 'column' ? 2 : 2)
    if (left.length < minPts) {
      this.stopDrawMode()
      return
    }
    if (mode === 'column' && right.length < 2) {
      this.stopDrawMode()
      return
    }

    this.stopDrawMode()
    this.callbacks.onDrawComplete(mode, left, right)
  }

  private onViewportClick(_e: PIXI.FederatedPointerEvent) {
    if (this.isDrawing_ || this.isNodeEdit_) return
    this.callbacks.onBackgroundClick()
  }

  // ── Private utils ────────────────────────────────────────────────────────────

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
    this.viewport.off('zoomed', this.onZoomed, this)
    this.viewport.off('moved',  this.onMoved,  this)
    this.viewport.off('clicked', this.onViewportClick, this)
    ;(this.viewport as never as PIXI.Container).off('pointermove', this.onPointerMove, this)
    ;(this.viewport as never as PIXI.Container).off('pointerdown', this.onPointerDown, this)
    ;(this.viewport as never as PIXI.Container).off('pointerup',   this.onPointerUp,   this)
    ;(this.viewport as never as PIXI.Container).off('rightclick',  this.onRightClick,  this)
    this.embroidery.destroy()
    this.viewport.destroy()
  }
}
