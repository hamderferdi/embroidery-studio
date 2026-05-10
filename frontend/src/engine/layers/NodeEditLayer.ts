import * as PIXI from 'pixi.js'
import type { Point, EmbroideryObject, SatinFillObject, TatamiFillObject, RunStitchObject, SatinColumnObject } from '../../embroidery/types'

const HANDLE_R   = 5    // screen-px
const ACCENT     = 0x40916c
const LINE_COLOR = 0x40916c

export interface NodeEditCallbacks {
  onBoundaryChange: (id: string, boundary: Point[]) => void
  onPathChange:     (id: string, path: Point[]) => void
  onLeftPathChange: (id: string, path: Point[]) => void
  onRightPathChange:(id: string, path: Point[]) => void
}

interface Handle {
  index:    number
  field:    'boundary' | 'path' | 'leftPath' | 'rightPath'
  worldPos: Point
}

/**
 * Renders draggable node handles for the selected embroidery object.
 * Handles boundary polygons, run-stitch paths, and satin-column dual paths.
 */
export class NodeEditLayer {
  private container: PIXI.Container
  private lineGfx:   PIXI.Graphics
  private handleGfx: PIXI.Graphics
  private active:    EmbroideryObject | null = null
  private dragging:  Handle | null = null
  private handles:   Handle[] = []
  private callbacks: NodeEditCallbacks

  constructor(callbacks: NodeEditCallbacks) {
    this.callbacks  = callbacks
    this.container  = new PIXI.Container()
    this.lineGfx    = new PIXI.Graphics()
    this.handleGfx  = new PIXI.Graphics()
    this.container.addChild(this.lineGfx, this.handleGfx)
    this.container.visible = false
    this.container.interactive = true
  }

  get displayObject(): PIXI.Container { return this.container }

  setObject(obj: EmbroideryObject | null, zoom: number) {
    this.active = obj
    this.dragging = null
    this.container.visible = obj !== null
    this.rebuild(zoom)
  }

  hide() {
    this.active = null
    this.container.visible = false
    this.rebuild(1)
  }

  private rebuild(zoom: number) {
    this.lineGfx.clear()
    this.handleGfx.clear()
    this.handles = []
    if (!this.active) return

    const obj = this.active
    const r   = HANDLE_R / zoom
    const lw  = 1.2 / zoom

    const drawHandles = (pts: Point[], field: Handle['field'], color: number) => {
      if (!pts || pts.length === 0) return

      // Path outline
      this.lineGfx.lineStyle(lw, color, 0.45, 0.5, true)
      this.lineGfx.moveTo(pts[0].x, pts[0].y)
      for (let i = 1; i < pts.length; i++) this.lineGfx.lineTo(pts[i].x, pts[i].y)
      if (field === 'boundary') this.lineGfx.closePath()

      // Handles
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i]
        this.handles.push({ index: i, field, worldPos: { ...p } })
        this.handleGfx.lineStyle(lw, color, 0.9)
        this.handleGfx.beginFill(0xffffff, 0.88)
        this.handleGfx.drawCircle(p.x, p.y, r)
        this.handleGfx.endFill()
      }
    }

    if (obj.type === 'satin-fill' || obj.type === 'tatami-fill') {
      drawHandles((obj as SatinFillObject | TatamiFillObject).boundary, 'boundary', ACCENT)
    } else if (obj.type === 'run-stitch') {
      drawHandles((obj as RunStitchObject).path, 'path', ACCENT)
    } else if (obj.type === 'satin-column') {
      drawHandles((obj as SatinColumnObject).leftPath,  'leftPath',  ACCENT)
      drawHandles((obj as SatinColumnObject).rightPath, 'rightPath', 0xffa040)
    }
  }

  /** Call on every pointermove while node-edit is active */
  onPointerMove(world: Point, zoom: number, isDragging: boolean) {
    if (!this.active) return
    if (isDragging && this.dragging) {
      this.applyDrag(world, zoom)
    }
  }

  /** Returns true if a handle was hit */
  onPointerDown(world: Point, zoom: number): boolean {
    if (!this.active) return false
    const hitR = (HANDLE_R + 4) / zoom
    for (const h of this.handles) {
      const dx = world.x - h.worldPos.x, dy = world.y - h.worldPos.y
      if (Math.sqrt(dx * dx + dy * dy) < hitR) {
        this.dragging = h
        return true
      }
    }
    return false
  }

  onPointerUp(zoom: number) {
    if (!this.dragging || !this.active) { this.dragging = null; return }
    this.dragging = null
    this.rebuild(zoom)
  }

  private applyDrag(world: Point, zoom: number) {
    if (!this.dragging || !this.active) return
    const { index, field } = this.dragging
    const obj = this.active

    const clone = (arr: Point[]) => arr.map(p => ({ ...p }))

    if (field === 'boundary' && (obj.type === 'satin-fill' || obj.type === 'tatami-fill')) {
      const b = clone((obj as SatinFillObject).boundary)
      b[index] = { ...world }
      this.callbacks.onBoundaryChange(obj.id, b)
      ;(this.active as SatinFillObject).boundary = b
    } else if (field === 'path' && obj.type === 'run-stitch') {
      const p = clone((obj as RunStitchObject).path)
      p[index] = { ...world }
      this.callbacks.onPathChange(obj.id, p)
      ;(this.active as RunStitchObject).path = p
    } else if (field === 'leftPath' && obj.type === 'satin-column') {
      const p = clone((obj as SatinColumnObject).leftPath)
      p[index] = { ...world }
      this.callbacks.onLeftPathChange(obj.id, p)
      ;(this.active as SatinColumnObject).leftPath = p
    } else if (field === 'rightPath' && obj.type === 'satin-column') {
      const p = clone((obj as SatinColumnObject).rightPath)
      p[index] = { ...world }
      this.callbacks.onRightPathChange(obj.id, p)
      ;(this.active as SatinColumnObject).rightPath = p
    }

    this.dragging.worldPos = { ...world }
    this.rebuild(zoom)
  }
}
