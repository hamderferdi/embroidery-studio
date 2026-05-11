import { create } from 'zustand'

export type HoopSize = '100x100' | '130x180' | '200x200' | '300x200' | '360x200'

export interface HoopDimensions {
  width: number   // mm
  height: number  // mm
  label: string
}

export const HOOP_SIZES: Record<HoopSize, HoopDimensions> = {
  '100x100': { width: 100, height: 100, label: '100 × 100 mm' },
  '130x180': { width: 130, height: 180, label: '130 × 180 mm' },
  '200x200': { width: 200, height: 200, label: '200 × 200 mm' },
  '300x200': { width: 300, height: 200, label: '300 × 200 mm' },
  '360x200': { width: 360, height: 200, label: '360 × 200 mm' },
}

export interface CanvasPersistedState {
  hoopSize:    HoopSize
  fabricColor: string
  showGrid:    boolean
  showRulers:  boolean
  showHoop:    boolean
}

export interface CanvasState {
  zoom: number
  panX: number
  panY: number
  viewportWidth: number
  viewportHeight: number
  hoopSize: HoopSize
  showGrid: boolean
  showRulers: boolean
  showHoop: boolean
  showStitchPoints: boolean
  gridSpacing: number       // mm
  fabricColor: string       // hex
  mmPerPixel: number        // current mm-to-pixel ratio (depends on zoom)

  setZoom: (z: number) => void
  setPan: (x: number, y: number) => void
  setViewportSize: (w: number, h: number) => void
  setHoopSize: (h: HoopSize) => void
  toggleGrid: () => void
  toggleRulers: () => void
  toggleHoop: () => void
  toggleStitchPoints: () => void
  setFabricColor: (c: string) => void
  /** Wipe viewport transforms — call before loading a new project. */
  reset: () => void
  /** Restore per-project canvas settings. */
  hydrateCanvas: (state: Partial<CanvasPersistedState>) => void
}

// Base resolution: 1 mm = 3.78 px at 96 DPI
const BASE_PX_PER_MM = 3.78

export const useCanvasStore = create<CanvasState>((set) => ({
  zoom: 1,
  panX: 0,
  panY: 0,
  viewportWidth: 800,
  viewportHeight: 600,
  hoopSize: '130x180',
  showGrid: true,
  showRulers: true,
  showHoop: true,
  showStitchPoints: false,
  gridSpacing: 10,
  fabricColor: '#f4efe6',
  mmPerPixel: 1 / BASE_PX_PER_MM,

  setZoom: (z) => set({ zoom: z, mmPerPixel: 1 / (BASE_PX_PER_MM * z) }),
  setPan: (x, y) => set({ panX: x, panY: y }),
  setViewportSize: (w, h) => set({ viewportWidth: w, viewportHeight: h }),
  setHoopSize: (h) => set({ hoopSize: h }),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toggleRulers: () => set((s) => ({ showRulers: !s.showRulers })),
  toggleHoop: () => set((s) => ({ showHoop: !s.showHoop })),
  toggleStitchPoints: () => set((s) => ({ showStitchPoints: !s.showStitchPoints })),
  setFabricColor: (c) => set({ fabricColor: c }),

  reset: () => set({
    zoom:       1,
    panX:       0,
    panY:       0,
    hoopSize:   '130x180',
    fabricColor: '#f4efe6',
    showGrid:   true,
    showRulers: true,
    showHoop:   true,
    showStitchPoints: false,
    mmPerPixel: 1 / BASE_PX_PER_MM,
  }),

  hydrateCanvas: (s) => set((cur) => ({
    hoopSize:    s.hoopSize    ?? cur.hoopSize,
    fabricColor: s.fabricColor ?? cur.fabricColor,
    showGrid:    s.showGrid    ?? cur.showGrid,
    showRulers:  s.showRulers  ?? cur.showRulers,
    showHoop:    s.showHoop    ?? cur.showHoop,
  })),
}))

export const PX_PER_MM = BASE_PX_PER_MM
