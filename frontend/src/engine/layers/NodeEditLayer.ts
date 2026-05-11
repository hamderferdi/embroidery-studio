/**
 * Professional node editing layer — Illustrator / Affinity Designer quality.
 *
 * Supports:
 *  • Bézier anchor drag (corner + smooth + symmetric)
 *  • Handle-in / handle-out drag with smooth / symmetric constraints
 *  • Box (rubber-band) selection of multiple nodes
 *  • Hover highlight with correct priority (handle > anchor > segment)
 *  • Segment click → insert node at nearest t
 *  • Alt+click anchor → cycle corner ↔ smooth ↔ symmetric
 *  • Live callbacks (no history) while dragging; commit on pointer-up
 */

import * as PIXI from 'pixi.js'
import type {
  EmbroideryObject,
  SatinFillObject, TatamiFillObject,
  RunStitchObject, SatinColumnObject,
  BezierPath, BezierPoint, Point,
} from '../../embroidery/types'
import {
  segmentCPs, nearestOnPath, applyHandleConstraint, insertNodeAt, dist2, evalCubic,
} from '../../embroidery/geometry/BezierMath'

// ── Visual constants (all in screen-px; divide by zoom to get world units) ────

const ANCHOR_CORNER_HALF = 4.5   // half-size of corner square
const ANCHOR_SMOOTH_R    = 4.5   // radius of smooth circle
const HANDLE_KNOB_R      = 3.5   // handle knob radius
const HANDLE_LINE_W      = 1.0   // tangent line width
const PATH_LINE_W        = 1.5   // path outline width
const HIT_ANCHOR         = 10    // hit radius for anchors
const HIT_HANDLE         = 9     // hit radius for handle knobs
const HIT_SEGMENT        = 8     // proximity for segment hit

// ── Colors ────────────────────────────────────────────────────────────────────

const C_PATH       = 0x40916c   // path outline
const C_ANCHOR     = 0xffffff   // anchor fill
const C_ANCHOR_SEL = 0x4a90e2   // selected anchor fill
const C_ANCHOR_HOV = 0xffe066   // hovered anchor fill
const C_ANCHOR_OUT = 0x2d6a4f   // anchor outline
const C_HANDLE_LINE= 0x74a77a   // tangent line
const C_HANDLE_KNOB= 0xffffff   // handle knob fill
const C_HANDLE_SEL = 0x4a90e2   // selected handle fill
const C_BOX_STROKE = 0x4a90e2
const C_BOX_FILL   = 0x4a90e2

// ── Types ─────────────────────────────────────────────────────────────────────

export type NodeField = 'boundary' | 'path' | 'leftPath' | 'rightPath'

/** Unique key for a node: "objId:field:index" */
type NodeKey = string
function nodeKey(objId: string, field: NodeField, index: number): NodeKey {
  return `${objId}:${field}:${index}`
}
function parseKey(key: NodeKey): { objId: string; field: NodeField; index: number } {
  const [objId, field, idx] = key.split(':')
  return { objId, field: field as NodeField, index: parseInt(idx, 10) }
}

type HandleType = 'in' | 'out'

interface DragAnchor {
  kind:    'anchor'
  keys:    NodeKey[]     // all selected nodes being dragged together
  startWorld: Point
  // per-node original anchor positions (parallel to keys)
  origPositions: Point[]
}

interface DragHandle {
  kind:      'handle'
  key:       NodeKey
  hType:     HandleType
  origOffset: Point
}

interface BoxSelect {
  kind:   'box'
  startWorld: Point
  curWorld:   Point
}

type DragState = DragAnchor | DragHandle | BoxSelect

export interface NodeEditCallbacks {
  /** Called on every drag frame — no history entry */
  onLiveChange: (id: string, field: NodeField, path: BezierPath) => void
  /** Called on pointer-up — creates history entry */
  onCommit:     (id: string, field: NodeField, path: BezierPath) => void
}

interface ActiveEntry {
  obj:   EmbroideryObject
  field: NodeField
  path:  BezierPath   // mutable working copy during drag
}

// ── Layer class ───────────────────────────────────────────────────────────────

export class NodeEditLayer {
  private container:      PIXI.Container
  private pathGfx:        PIXI.Graphics
  private handleLineGfx:  PIXI.Graphics
  private handleKnobGfx:  PIXI.Graphics
  private anchorGfx:      PIXI.Graphics
  private hoverGfx:       PIXI.Graphics
  private boxSelectGfx:   PIXI.Graphics

  private callbacks:      NodeEditCallbacks
  private entries:        ActiveEntry[] = []
  private selectedNodes:  Set<NodeKey> = new Set()
  private hoveredNode:    NodeKey | null = null
  private hoveredSeg:     { entry: ActiveEntry; segIndex: number; t: number } | null = null
  private drag:           DragState | null = null
  private zoom_:          number = 1

  constructor(callbacks: NodeEditCallbacks) {
    this.callbacks    = callbacks
    this.container    = new PIXI.Container()
    this.pathGfx      = new PIXI.Graphics()
    this.handleLineGfx= new PIXI.Graphics()
    this.handleKnobGfx= new PIXI.Graphics()
    this.anchorGfx    = new PIXI.Graphics()
    this.hoverGfx     = new PIXI.Graphics()
    this.boxSelectGfx = new PIXI.Graphics()

    this.container.addChild(
      this.pathGfx, this.handleLineGfx, this.handleKnobGfx,
      this.anchorGfx, this.hoverGfx, this.boxSelectGfx,
    )
    this.container.visible = false
  }

  get displayObject(): PIXI.Container { return this.container }

  // ── Public API ──────────────────────────────────────────────────────────────

  setObjects(objs: EmbroideryObject[], zoom: number) {
    this.zoom_ = zoom
    this.entries = buildEntries(objs)
    this.container.visible = this.entries.length > 0
    this.selectedNodes.clear()
    this.drag = null
    this.redraw()
  }

  /** Update the working copies (e.g. after external store update, undo/redo). */
  syncObjects(objs: EmbroideryObject[], zoom: number) {
    this.zoom_ = zoom

    const newEntries = buildEntries(objs)

    if (this.drag !== null) {
      // A drag is in progress — keep the current entry paths (which are ahead
      // of the store by one liveUpdate frame).  Only add/remove entries for
      // objects that appear/disappear; don't overwrite geometry mid-drag.
      const prevByKey = new Map(this.entries.map(e => [`${e.obj.id}:${e.field}`, e]))
      this.entries = newEntries.map(e => {
        const key  = `${e.obj.id}:${e.field}`
        const prev = prevByKey.get(key)
        return prev ?? e   // keep the in-progress path if it exists
      })
    } else {
      // No drag — refresh path data from store (handles undo/redo, external updates)
      const prevByKey = new Map(this.entries.map(e => [`${e.obj.id}:${e.field}`, e]))
      this.entries = newEntries.map(e => {
        const key = `${e.obj.id}:${e.field}`
        prevByKey.get(key)  // (referenced to keep selectedNodes valid)
        return e
      })
    }

    this.container.visible = this.entries.length > 0
    this.redraw()
  }

  hide() {
    this.entries = []
    this.selectedNodes.clear()
    this.drag = null
    this.container.visible = false
    this.clearGfx()
  }

  updateZoom(zoom: number) {
    if (this.zoom_ === zoom) return
    this.zoom_ = zoom
    this.redraw()
  }

  onPointerMove(world: Point, zoom: number, altKey: boolean): boolean {
    this.zoom_ = zoom

    if (this.drag?.kind === 'anchor') {
      this.applyAnchorDrag(world)
      this.redraw()
      return true
    }
    if (this.drag?.kind === 'handle') {
      this.applyHandleDrag(world)
      this.redraw()
      return true
    }
    if (this.drag?.kind === 'box') {
      this.drag.curWorld = { ...world }
      this.redraw()
      return true
    }

    // Hover hit-test
    const prev = this.hoveredNode
    const prevSeg = this.hoveredSeg
    this.hoveredNode  = null
    this.hoveredSeg   = null

    const hh = this.hitTestHandle(world, zoom)
    if (hh) {
      this.hoveredNode = hh.key
    } else {
      const ha = this.hitTestAnchor(world, zoom)
      if (ha) {
        this.hoveredNode = ha.key
      } else if (!altKey) {
        this.hoveredSeg = this.hitTestSegment(world, zoom)
      }
    }

    if (this.hoveredNode !== prev || this.hoveredSeg !== prevSeg) this.redraw()
    return false
  }

  /**
   * Returns true if a node/handle/segment was hit (caller should NOT start
   * viewport pan). Returns false if nothing was hit (caller may pan or deselect).
   */
  onPointerDown(world: Point, zoom: number, altKey: boolean, shiftKey: boolean): boolean {
    this.zoom_ = zoom

    // 1. Handle knob
    const hh = this.hitTestHandle(world, zoom)
    if (hh) {
      const { key, hType } = hh
      const { objId, field, index } = parseKey(key)
      const entry = this.findEntry(objId, field)
      if (!entry) return false

      const pt = entry.path.points[index]
      const origOffset = hType === 'in'
        ? (pt.hi ?? { x: 0, y: 0 })
        : (pt.ho ?? { x: 0, y: 0 })

      this.drag = { kind: 'handle', key, hType, origOffset: { ...origOffset } }
      return true
    }

    // 2. Anchor node
    const ha = this.hitTestAnchor(world, zoom)
    if (ha) {
      const { key } = ha

      if (altKey) {
        // Cycle node type: corner → symmetric → smooth → corner
        this.cycleNodeType(key)
        return true
      }

      if (shiftKey) {
        // Toggle selection
        if (this.selectedNodes.has(key)) this.selectedNodes.delete(key)
        else this.selectedNodes.add(key)
      } else {
        if (!this.selectedNodes.has(key)) {
          this.selectedNodes.clear()
          this.selectedNodes.add(key)
        }
      }

      // Begin anchor drag — drag all currently selected nodes together
      const origPositions = [...this.selectedNodes].map(k => {
        const { objId, field, index } = parseKey(k)
        const e = this.findEntry(objId, field)
        const pt = e?.path.points[index]
        return pt ? { x: pt.x, y: pt.y } : { x: 0, y: 0 }
      })
      this.drag = {
        kind: 'anchor',
        keys: [...this.selectedNodes],
        startWorld: { ...world },
        origPositions,
      }
      this.redraw()
      return true
    }

    // 3. Segment → insert node
    const hs = this.hitTestSegment(world, zoom)
    if (hs) {
      const newPath = insertNodeAt(hs.entry.path, hs.segIndex, hs.t)
      hs.entry.path = newPath
      // Select the newly inserted node
      this.selectedNodes.clear()
      this.selectedNodes.add(nodeKey(hs.entry.obj.id, hs.entry.field, hs.segIndex + 1))
      this.callbacks.onLiveChange(hs.entry.obj.id, hs.entry.field, newPath)
      this.callbacks.onCommit(hs.entry.obj.id, hs.entry.field, newPath)
      this.redraw()
      return true
    }

    // 4. Nothing hit → box select
    if (!shiftKey) this.selectedNodes.clear()
    this.drag = { kind: 'box', startWorld: { ...world }, curWorld: { ...world } }
    this.redraw()
    return true   // consume the event (prevent viewport pan in direct-select mode)
  }

  onPointerUp(_zoom: number) {
    if (this.drag?.kind === 'anchor' || this.drag?.kind === 'handle') {
      // Commit each modified entry to history
      const modified = new Set<string>()
      for (const key of (this.drag.kind === 'anchor' ? this.drag.keys : [this.drag.key])) {
        const { objId, field } = parseKey(key)
        const id = `${objId}:${field}`
        if (!modified.has(id)) {
          modified.add(id)
          const entry = this.findEntry(objId, field)
          if (entry) this.callbacks.onCommit(entry.obj.id, entry.field, entry.path)
        }
      }
    } else if (this.drag?.kind === 'box') {
      this.finishBoxSelect()
    }
    this.drag = null
    this.redraw()
  }

  // ── Drag application ────────────────────────────────────────────────────────

  private applyAnchorDrag(world: Point) {
    const d = this.drag as DragAnchor
    const dx = world.x - d.startWorld.x
    const dy = world.y - d.startWorld.y

    const committed = new Set<string>()
    for (let i = 0; i < d.keys.length; i++) {
      const key  = d.keys[i]
      const orig = d.origPositions[i]
      const { objId, field, index } = parseKey(key)
      const entry = this.findEntry(objId, field)
      if (!entry) continue

      const pts     = entry.path.points
      const updated = [...pts]
      updated[index] = { ...pts[index], x: orig.x + dx, y: orig.y + dy }
      entry.path = { ...entry.path, points: updated }

      const eid = `${objId}:${field}`
      if (!committed.has(eid)) {
        committed.add(eid)
        this.callbacks.onLiveChange(objId, field, entry.path)
      }
    }
  }

  private applyHandleDrag(world: Point) {
    const d = this.drag as DragHandle
    const { objId, field, index } = parseKey(d.key)
    const entry = this.findEntry(objId, field)
    if (!entry) return

    const pts   = entry.path.points
    const pt    = pts[index]
    const newOff: Point = {
      x: world.x - pt.x,
      y: world.y - pt.y,
    }

    const updated = [...pts]
    updated[index] = applyHandleConstraint(pt, d.hType, newOff)
    entry.path = { ...entry.path, points: updated }
    this.callbacks.onLiveChange(objId, field, entry.path)
  }

  private finishBoxSelect() {
    const d = this.drag as BoxSelect
    const minX = Math.min(d.startWorld.x, d.curWorld.x)
    const maxX = Math.max(d.startWorld.x, d.curWorld.x)
    const minY = Math.min(d.startWorld.y, d.curWorld.y)
    const maxY = Math.max(d.startWorld.y, d.curWorld.y)

    for (const entry of this.entries) {
      entry.path.points.forEach((pt, i) => {
        if (pt.x >= minX && pt.x <= maxX && pt.y >= minY && pt.y <= maxY) {
          this.selectedNodes.add(nodeKey(entry.obj.id, entry.field, i))
        }
      })
    }
  }

  // ── Hit testing ─────────────────────────────────────────────────────────────

  private hitTestHandle(
    world: Point, zoom: number,
  ): { key: NodeKey; hType: HandleType } | null {
    const hitR = HIT_HANDLE / zoom
    for (const entry of this.entries) {
      const { obj, field, path } = entry
      const pts = path.points
      for (let i = 0; i < pts.length; i++) {
        const pt  = pts[i]
        const key = nodeKey(obj.id, field, i)
        if (!this.shouldShowHandles(key, i, path)) continue

        if (pt.hi) {
          const abs = { x: pt.x + pt.hi.x, y: pt.y + pt.hi.y }
          if (dist2(world, abs) < hitR) return { key, hType: 'in' }
        }
        if (pt.ho) {
          const abs = { x: pt.x + pt.ho.x, y: pt.y + pt.ho.y }
          if (dist2(world, abs) < hitR) return { key, hType: 'out' }
        }
      }
    }
    return null
  }

  private hitTestAnchor(world: Point, zoom: number): { key: NodeKey } | null {
    const hitR = HIT_ANCHOR / zoom
    for (const entry of this.entries) {
      const { obj, field, path } = entry
      const pts = path.points
      for (let i = 0; i < pts.length; i++) {
        if (dist2(world, pts[i]) < hitR)
          return { key: nodeKey(obj.id, field, i) }
      }
    }
    return null
  }

  private hitTestSegment(
    world: Point, zoom: number,
  ): { entry: ActiveEntry; segIndex: number; t: number } | null {
    const hitR = HIT_SEGMENT / zoom
    let best: { entry: ActiveEntry; segIndex: number; t: number; dist: number } | null = null

    for (const entry of this.entries) {
      const hit = nearestOnPath(entry.path, world)
      if (hit && hit.dist < hitR) {
        if (!best || hit.dist < best.dist)
          best = { entry, segIndex: hit.segIndex, t: hit.t, dist: hit.dist }
      }
    }
    return best ? { entry: best.entry, segIndex: best.segIndex, t: best.t } : null
  }

  // ── Node type cycling ───────────────────────────────────────────────────────

  private cycleNodeType(key: NodeKey) {
    const { objId, field, index } = parseKey(key)
    const entry = this.findEntry(objId, field)
    if (!entry) return

    const pts = entry.path.points
    const pt  = pts[index]
    const types: BezierPoint['type'][] = ['corner', 'symmetric', 'smooth']
    const next = types[(types.indexOf(pt.type) + 1) % types.length]

    const updated = [...pts]
    if (next === 'corner') {
      updated[index] = { x: pt.x, y: pt.y, type: 'corner' }
    } else if (next === 'symmetric' && (!pt.hi && !pt.ho)) {
      // Create handles from neighboring tangent
      const prev = pts[(index - 1 + pts.length) % pts.length]
      const nextP = pts[(index + 1) % pts.length]
      const len = dist2(prev, nextP) * 0.33
      const dx = nextP.x - prev.x, dy = nextP.y - prev.y
      const d = Math.sqrt(dx * dx + dy * dy)
      const ux = d > 0 ? dx / d : 1, uy = d > 0 ? dy / d : 0
      updated[index] = {
        ...pt, type: 'symmetric',
        hi: { x: -ux * len, y: -uy * len },
        ho: { x:  ux * len, y:  uy * len },
      }
    } else {
      updated[index] = { ...pt, type: next }
    }

    entry.path = { ...entry.path, points: updated }
    this.callbacks.onLiveChange(objId, field, entry.path)
    this.callbacks.onCommit(objId, field, entry.path)
    this.redraw()
  }

  // ── Rendering ───────────────────────────────────────────────────────────────

  private redraw() {
    this.clearGfx()
    if (this.entries.length === 0) return

    const z   = this.zoom_
    const lw  = PATH_LINE_W    / z
    const hlw = HANDLE_LINE_W  / z
    const hr  = HANDLE_KNOB_R  / z
    const ahs = ANCHOR_CORNER_HALF / z
    const asr = ANCHOR_SMOOTH_R    / z

    for (const entry of this.entries) {
      this.drawPathCurves(entry, lw)
      this.drawHandleLinesAndKnobs(entry, hlw, hr)
      this.drawAnchorNodes(entry, ahs, asr, lw)
    }

    if (this.drag?.kind === 'box') this.drawBoxSelect(this.drag)

    this.drawHover(ahs, asr, lw, hr)
  }

  private drawPathCurves(entry: ActiveEntry, lw: number) {
    const { path } = entry
    const pts  = path.points
    const n    = pts.length
    const segs = path.closed ? n : n - 1

    this.pathGfx.lineStyle(lw, C_PATH, 0.6)
    for (let i = 0; i < segs; i++) {
      const { p0, p1, p2, p3 } = segmentCPs(path, i)
      this.pathGfx.moveTo(p0.x, p0.y)
      this.pathGfx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y)
    }
  }

  private drawHandleLinesAndKnobs(entry: ActiveEntry, lw: number, hr: number) {
    const { obj, field, path } = entry
    const pts = path.points

    for (let i = 0; i < pts.length; i++) {
      const pt  = pts[i]
      const key = nodeKey(obj.id, field, i)

      if (!this.shouldShowHandles(key, i, path)) continue

      const isSelected = this.selectedNodes.has(key)

      if (pt.hi) {
        const abs = { x: pt.x + pt.hi.x, y: pt.y + pt.hi.y }
        // Tangent line
        this.handleLineGfx.lineStyle(lw, C_HANDLE_LINE, 0.5)
        this.handleLineGfx.moveTo(pt.x, pt.y)
        this.handleLineGfx.lineTo(abs.x, abs.y)
        // Knob
        this.handleKnobGfx.lineStyle(lw, C_HANDLE_LINE, 0.9)
        this.handleKnobGfx.beginFill(isSelected ? C_HANDLE_SEL : C_HANDLE_KNOB, 0.9)
        this.handleKnobGfx.drawCircle(abs.x, abs.y, hr)
        this.handleKnobGfx.endFill()
      }
      if (pt.ho) {
        const abs = { x: pt.x + pt.ho.x, y: pt.y + pt.ho.y }
        this.handleLineGfx.lineStyle(lw, C_HANDLE_LINE, 0.5)
        this.handleLineGfx.moveTo(pt.x, pt.y)
        this.handleLineGfx.lineTo(abs.x, abs.y)
        this.handleKnobGfx.lineStyle(lw, C_HANDLE_LINE, 0.9)
        this.handleKnobGfx.beginFill(isSelected ? C_HANDLE_SEL : C_HANDLE_KNOB, 0.9)
        this.handleKnobGfx.drawCircle(abs.x, abs.y, hr)
        this.handleKnobGfx.endFill()
      }
    }
  }

  private drawAnchorNodes(
    entry: ActiveEntry, ahs: number, asr: number, lw: number,
  ) {
    const { obj, field, path } = entry
    for (let i = 0; i < path.points.length; i++) {
      const pt  = path.points[i]
      const key = nodeKey(obj.id, field, i)
      const sel = this.selectedNodes.has(key)

      const fill = sel ? C_ANCHOR_SEL : C_ANCHOR

      this.anchorGfx.lineStyle(lw, C_ANCHOR_OUT, 0.9)
      this.anchorGfx.beginFill(fill, 0.92)

      if (pt.type === 'corner') {
        this.anchorGfx.drawRect(pt.x - ahs, pt.y - ahs, ahs * 2, ahs * 2)
      } else {
        this.anchorGfx.drawCircle(pt.x, pt.y, asr)
      }
      this.anchorGfx.endFill()
    }
  }

  private drawHover(ahs: number, asr: number, lw: number, hr: number) {
    if (!this.hoveredNode && !this.hoveredSeg) return

    if (this.hoveredNode) {
      const k = this.hoveredNode
      // Determine if this is a handle or anchor
      const { objId, field, index } = parseKey(k)
      const entry = this.findEntry(objId, field)
      if (!entry) return
      const pt = entry.path.points[index]

      // Draw highlight ring
      this.hoverGfx.lineStyle(lw * 1.5, C_ANCHOR_HOV, 0.9)
      this.hoverGfx.beginFill(0, 0)
      if (pt.type === 'corner') {
        this.hoverGfx.drawRect(pt.x - ahs * 1.4, pt.y - ahs * 1.4, ahs * 2.8, ahs * 2.8)
      } else {
        this.hoverGfx.drawCircle(pt.x, pt.y, asr * 1.4)
      }
      this.hoverGfx.endFill()
    }

    if (this.hoveredSeg) {
      const { entry, segIndex, t } = this.hoveredSeg
      const { p0, p1, p2, p3 } = segmentCPs(entry.path, segIndex)
      const pt = evalCubic(p0, p1, p2, p3, t)
      // Show "insert here" indicator — diamond
      const s = ahs * 1.3
      this.hoverGfx.lineStyle(lw, C_ANCHOR_HOV, 0.85)
      this.hoverGfx.beginFill(C_ANCHOR_HOV, 0.3)
      this.hoverGfx.moveTo(pt.x,     pt.y - s)
      this.hoverGfx.lineTo(pt.x + s, pt.y    )
      this.hoverGfx.lineTo(pt.x,     pt.y + s)
      this.hoverGfx.lineTo(pt.x - s, pt.y    )
      this.hoverGfx.closePath()
      this.hoverGfx.endFill()
    }
  }

  private drawBoxSelect(d: BoxSelect) {
    const x = Math.min(d.startWorld.x, d.curWorld.x)
    const y = Math.min(d.startWorld.y, d.curWorld.y)
    const w = Math.abs(d.curWorld.x - d.startWorld.x)
    const h = Math.abs(d.curWorld.y - d.startWorld.y)
    const z = this.zoom_
    this.boxSelectGfx.lineStyle(1 / z, C_BOX_STROKE, 0.9)
    this.boxSelectGfx.beginFill(C_BOX_FILL, 0.07)
    this.boxSelectGfx.drawRect(x, y, w, h)
    this.boxSelectGfx.endFill()
  }

  // ── Utils ────────────────────────────────────────────────────────────────────

  /** Show handles for a node only if it is selected or adjacent to a selected node */
  private shouldShowHandles(key: NodeKey, index: number, path: BezierPath): boolean {
    if (this.selectedNodes.has(key)) return true
    const n    = path.points.length
    const prev = nodeKey(parseKey(key).objId, parseKey(key).field, (index - 1 + n) % n)
    const next = nodeKey(parseKey(key).objId, parseKey(key).field, (index + 1) % n)
    return this.selectedNodes.has(prev) || this.selectedNodes.has(next)
  }

  private findEntry(objId: string, field: NodeField): ActiveEntry | undefined {
    return this.entries.find(e => e.obj.id === objId && e.field === field)
  }

  private clearGfx() {
    this.pathGfx.clear()
    this.handleLineGfx.clear()
    this.handleKnobGfx.clear()
    this.anchorGfx.clear()
    this.hoverGfx.clear()
    this.boxSelectGfx.clear()
  }
}

// ── Helper: build ActiveEntry list from EmbroideryObject[] ───────────────────

function buildEntries(objs: EmbroideryObject[]): ActiveEntry[] {
  const entries: ActiveEntry[] = []
  for (const obj of objs) {
    if (!obj.visible) continue

    if (obj.type === 'satin-fill' || obj.type === 'tatami-fill') {
      const b = (obj as SatinFillObject | TatamiFillObject).boundary
      if (b) entries.push({ obj, field: 'boundary', path: clonePath(b) })
    } else if (obj.type === 'run-stitch') {
      const p = (obj as RunStitchObject).path
      if (p) entries.push({ obj, field: 'path', path: clonePath(p) })
    } else if (obj.type === 'satin-column') {
      const col = obj as SatinColumnObject
      if (col.leftPath)  entries.push({ obj, field: 'leftPath',  path: clonePath(col.leftPath)  })
      if (col.rightPath) entries.push({ obj, field: 'rightPath', path: clonePath(col.rightPath) })
    }
  }
  return entries
}

function clonePath(p: BezierPath): BezierPath {
  return {
    closed: p.closed,
    points: p.points.map(pt => ({
      ...pt,
      hi: pt.hi ? { ...pt.hi } : undefined,
      ho: pt.ho ? { ...pt.ho } : undefined,
    })),
  }
}
