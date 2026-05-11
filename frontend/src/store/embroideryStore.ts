import { create } from 'zustand'
import { v4 as uuid } from 'uuid'
import type {
  EmbroideryObject, ThreadColor, TatamiFillObject,
  SatinFillObject, SatinColumnObject, RunStitchObject, LetteringObject,
  Point, BezierPath,
} from '../embroidery/types'
import { defaultObjectBase, THREAD_PALETTE, ptsToBezier } from '../embroidery/types'
import { generateStitches } from '../embroidery/EmbroideryEngine'
import { PX_PER_MM } from './canvasStore'

const MAX_HISTORY = 50

export interface EmbroideryState {
  objects: EmbroideryObject[]
  selectedIds: string[]
  activeColor: ThreadColor
  stitchCount: number
  // history
  past:   EmbroideryObject[][]
  future: EmbroideryObject[][]
  canUndo: boolean
  canRedo: boolean

  addObject:       (obj: EmbroideryObject) => void
  removeObject:    (id: string) => void
  updateObject:    (id: string, patch: Partial<EmbroideryObject>) => void
  /** Update geometry without creating a history entry (used during live node drag) */
  liveUpdate:      (id: string, patch: Partial<EmbroideryObject>) => void
  selectObject:    (id: string, multi?: boolean) => void
  clearSelection:  () => void
  setActiveColor:  (c: ThreadColor) => void
  regenerateAll:   () => void
  regenerateObject:(id: string) => void
  setObjects:      (objects: EmbroideryObject[]) => void
  undo:            () => void
  redo:            () => void
  loadDemo:        () => void

  moveObjects:             (ids: string[], dx: number, dy: number) => void

  // called by drawing tools to create a new object from a drawn shape
  createFillFromBoundary:  (boundary: BezierPath, type: 'satin-fill' | 'tatami-fill') => void
  createRunFromPath:       (path: BezierPath) => void
  createColumnFromPaths:   (left: BezierPath, right: BezierPath) => void
  createLettering:         (params: {
    text: string; fontFamily: string; fontSizeMm: number
    x: number; y: number; tracking?: number
    alignment?: 'left' | 'center' | 'right'
    letterBoundaries?: import('../embroidery/types').BezierPath[][]
  }) => void
  /** Re-layout letter boundaries after font loads (updates without history). */
  relayoutLettering:       (id: string, boundaries: import('../embroidery/types').BezierPath[][]) => void
}

function regenObject(obj: EmbroideryObject): EmbroideryObject {
  const stitches = generateStitches(obj)
  return { ...obj, stitches, needsRegenerate: false } as EmbroideryObject
}

function countStitches(objects: EmbroideryObject[]): number {
  return objects.reduce((acc, o) => acc + (o.stitches?.length ?? 0), 0)
}

function withHistory(
  set: (fn: (s: EmbroideryState) => Partial<EmbroideryState>) => void,
  get: () => EmbroideryState,
  producer: (s: EmbroideryState) => Partial<EmbroideryState>,
) {
  const current = get()
  const snapshot = current.objects
  const newPast = [...current.past, snapshot].slice(-MAX_HISTORY)
  set((s) => ({
    ...producer(s),
    past:   newPast,
    future: [],
    canUndo: true,
    canRedo: false,
  }))
}

export const useEmbroideryStore = create<EmbroideryState>((set, get) => ({
  objects:     [],
  selectedIds: [],
  activeColor: THREAD_PALETTE[7],
  stitchCount: 0,
  past:    [],
  future:  [],
  canUndo: false,
  canRedo: false,

  addObject: (obj) => {
    withHistory(set, get, () => {
      const regen = regenObject(obj)
      const objects = [...get().objects, regen]
      return { objects, stitchCount: countStitches(objects) }
    })
  },

  removeObject: (id) => {
    withHistory(set, get, (s) => {
      const objects = s.objects.filter(o => o.id !== id)
      return {
        objects,
        selectedIds: s.selectedIds.filter(i => i !== id),
        stitchCount: countStitches(objects),
      }
    })
  },

  updateObject: (id, patch) => {
    withHistory(set, get, (s) => {
      const objects = s.objects.map(o => {
        if (o.id !== id) return o
        return regenObject({ ...o, ...patch, needsRegenerate: true } as EmbroideryObject)
      })
      return { objects, stitchCount: countStitches(objects) }
    })
  },

  liveUpdate: (id, patch) => {
    set((s) => {
      const objects = s.objects.map(o => {
        if (o.id !== id) return o
        return regenObject({ ...o, ...patch, needsRegenerate: true } as EmbroideryObject)
      })
      return { objects, stitchCount: countStitches(objects) }
    })
  },

  setObjects: (objects) => {
    set({ objects, stitchCount: countStitches(objects) })
  },

  undo: () => {
    const { past, objects, future } = get()
    if (past.length === 0) return
    const prev = past[past.length - 1]
    const newPast = past.slice(0, -1)
    const newFuture = [objects, ...future].slice(0, MAX_HISTORY)
    set({
      objects:    prev,
      stitchCount: countStitches(prev),
      past:    newPast,
      future:  newFuture,
      canUndo: newPast.length > 0,
      canRedo: true,
    })
  },

  redo: () => {
    const { future, objects, past } = get()
    if (future.length === 0) return
    const next = future[0]
    const newFuture = future.slice(1)
    const newPast = [...past, objects].slice(-MAX_HISTORY)
    set({
      objects:    next,
      stitchCount: countStitches(next),
      past:    newPast,
      future:  newFuture,
      canUndo: true,
      canRedo: newFuture.length > 0,
    })
  },

  selectObject: (id, multi = false) => {
    set((s) => ({
      selectedIds: multi
        ? s.selectedIds.includes(id)
          ? s.selectedIds.filter(i => i !== id)
          : [...s.selectedIds, id]
        : [id],
    }))
  },

  clearSelection: () => set({ selectedIds: [] }),
  setActiveColor: (c) => set({ activeColor: c }),

  regenerateAll: () => {
    set((s) => {
      const objects = s.objects.map(regenObject)
      return { objects, stitchCount: countStitches(objects) }
    })
  },

  regenerateObject: (id) => {
    set((s) => {
      const objects = s.objects.map(o => o.id === id ? regenObject(o) : o)
      return { objects, stitchCount: countStitches(objects) }
    })
  },

  moveObjects: (ids, dx, dy) => {
    withHistory(set, get, (s) => {
      const shiftPath = (bp: BezierPath): BezierPath => ({
        ...bp,
        points: bp.points.map(p => ({ ...p, x: p.x + dx, y: p.y + dy })),
      })
      const objects = s.objects.map(o => {
        if (!ids.includes(o.id)) return o
        let patched = { ...o }
        if (o.type === 'satin-fill' || o.type === 'tatami-fill') {
          patched = { ...o, boundary: shiftPath((o as SatinFillObject | TatamiFillObject).boundary) }
        } else if (o.type === 'run-stitch') {
          patched = { ...o, path: shiftPath((o as RunStitchObject).path) }
        } else if (o.type === 'satin-column') {
          patched = { ...o, leftPath: shiftPath((o as SatinColumnObject).leftPath), rightPath: shiftPath((o as SatinColumnObject).rightPath) }
        } else if (o.type === 'lettering') {
          const lo = o as LetteringObject
          const shiftedBoundaries = lo.letterBoundaries?.map(contours => contours.map(shiftPath))
          patched = { ...lo, x: lo.x + dx, y: lo.y + dy, letterBoundaries: shiftedBoundaries }
        }
        return regenObject({ ...patched, needsRegenerate: true } as EmbroideryObject)
      })
      return { objects, stitchCount: countStitches(objects) }
    })
  },

  createFillFromBoundary: (boundary, type) => {
    const color = get().activeColor
    const obj: SatinFillObject | TatamiFillObject = type === 'satin-fill'
      ? { id: uuid(), type: 'satin-fill', name: 'Satin Fill', ...defaultObjectBase({ color }), boundary } as SatinFillObject
      : { id: uuid(), type: 'tatami-fill', name: 'Tatami Fill', ...defaultObjectBase({ color }), boundary, rowOffset: 0.5, stitchRows: 2, stitchLength: 4 } as TatamiFillObject
    get().addObject(obj)
  },

  createRunFromPath: (path) => {
    const color = get().activeColor
    const obj: RunStitchObject = {
      id: uuid(), type: 'run-stitch', name: 'Run Stitch',
      ...defaultObjectBase({ color }), path, stitchLength: 3, passes: 1,
    } as RunStitchObject
    get().addObject(obj)
  },

  createColumnFromPaths: (left, right) => {
    const color = get().activeColor
    const obj: SatinColumnObject = {
      id: uuid(), type: 'satin-column', name: 'Satin Column',
      ...defaultObjectBase({ color, density: 0.38 }), leftPath: left, rightPath: right,
    } as SatinColumnObject
    get().addObject(obj)
  },

  createLettering: ({ text, fontFamily, fontSizeMm, x, y, tracking = 0, alignment = 'left', letterBoundaries }) => {
    const color = get().activeColor
    const id    = uuid()
    const name  = text.trim() ? `Text: ${text.slice(0, 20)}` : 'Text (empty)'
    const obj: LetteringObject = {
      id, type: 'lettering', name,
      ...defaultObjectBase({ color }),
      text, fontFamily, fontSizeMm, x, y, tracking, alignment,
      letterBoundaries,
    } as LetteringObject
    // addObject writes history; then we select immediately so the sidebar opens
    get().addObject(obj)
    set({ selectedIds: [id] })
  },

  relayoutLettering: (id, boundaries) => {
    set((s) => {
      const objects = s.objects.map(o => {
        if (o.id !== id || o.type !== 'lettering') return o
        const updated = { ...o, letterBoundaries: boundaries } as LetteringObject
        return regenObject({ ...updated, needsRegenerate: true } as EmbroideryObject)
      })
      return { objects, stitchCount: countStitches(objects) }
    })
  },

  loadDemo: () => {
    const R = PX_PER_MM
    const ringRadius = 55 * R
    const ringPts = Array.from({ length: 73 }, (_, i) => {
      const a = (i / 72) * Math.PI * 2
      return { x: Math.cos(a) * ringRadius, y: Math.sin(a) * ringRadius }
    })
    const ringObj: RunStitchObject = {
      id: uuid(), type: 'run-stitch', name: 'Ring Border',
      ...defaultObjectBase({ color: THREAD_PALETTE[3], density: 0.5, stitchLength: 2.5 }),
      path: ptsToBezier(ringPts), stitchLength: 2.5, passes: 1,
    } as RunStitchObject

    const fillRadius = 40 * R
    const fillPts = Array.from({ length: 64 }, (_, i) => {
      const a = (i / 64) * Math.PI * 2
      return { x: Math.cos(a) * fillRadius, y: Math.sin(a) * fillRadius }
    })
    const fillObj: TatamiFillObject = {
      id: uuid(), type: 'tatami-fill', name: 'Center Fill',
      ...defaultObjectBase({ color: THREAD_PALETTE[9], stitchAngle: 45, density: 0.42 }),
      boundary: ptsToBezier(fillPts, true), rowOffset: 0.5, stitchRows: 2, stitchLength: 4,
    } as TatamiFillObject

    const leaves = [0, 60, 120, 180, 240, 300].map((deg, i) => {
      const a = (deg * Math.PI) / 180
      const tipX = Math.cos(a) * 60 * R
      const tipY = Math.sin(a) * 60 * R
      const bx = Math.cos(a) * 20 * R
      const by = Math.sin(a) * 20 * R
      const w = 10 * R
      const perp = { x: -Math.sin(a), y: Math.cos(a) }
      const boundaryPts = [
        { x: bx + perp.x * w, y: by + perp.y * w },
        { x: tipX, y: tipY },
        { x: bx - perp.x * w, y: by - perp.y * w },
        { x: bx + perp.x * w, y: by + perp.y * w },
      ]
      return {
        id: uuid(), type: 'satin-fill' as const, name: `Leaf ${i + 1}`,
        ...defaultObjectBase({ color: i % 2 === 0 ? THREAD_PALETTE[7] : THREAD_PALETTE[8], stitchAngle: (deg + 90) % 180, density: 0.38 }),
        boundary: ptsToBezier(boundaryPts, true),
      } as SatinFillObject
    })

    const colRadius = 18 * R
    const satinCols = Array.from({ length: 8 }, (_, i) => {
      const a0 = (i / 8) * Math.PI * 2
      const a1 = ((i + 1) / 8) * Math.PI * 2
      const w = 4 * R, r0 = colRadius - w / 2, r1 = colRadius + w / 2
      const leftPts  = Array.from({ length: 8 }, (__, s) => { const a = a0 + (a1 - a0) * s / 7; return { x: Math.cos(a) * r0, y: Math.sin(a) * r0 } })
      const rightPts = Array.from({ length: 8 }, (__, s) => { const a = a0 + (a1 - a0) * s / 7; return { x: Math.cos(a) * r1, y: Math.sin(a) * r1 } })
      return { id: uuid(), type: 'satin-column' as const, name: `Spoke ${i + 1}`, ...defaultObjectBase({ color: THREAD_PALETTE[3], density: 0.35 }), leftPath: ptsToBezier(leftPts), rightPath: ptsToBezier(rightPts) } as SatinColumnObject
    })

    const allObjects: EmbroideryObject[] = [fillObj, ...satinCols, ...leaves, ringObj]
    const regen = allObjects.map(regenObject)
    set({ objects: regen, stitchCount: countStitches(regen), selectedIds: [], past: [], future: [], canUndo: false, canRedo: false })
  },
}))
