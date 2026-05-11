// ─── Geometry ────────────────────────────────────────────────────────────────

export interface Point {
  x: number
  y: number
}

/**
 * A single Bézier anchor point.
 *  type 'corner'    – sharp corner, no active handles
 *  type 'smooth'    – handles collinear, independent lengths
 *  type 'symmetric' – handles collinear, equal lengths (Illustrator "smooth")
 * hi / ho are offsets from the anchor in world units.
 */
export interface BezierPoint {
  x: number
  y: number
  type: 'corner' | 'smooth' | 'symmetric'
  hi?: Point   // handle-in offset
  ho?: Point   // handle-out offset
}

export interface BezierPath {
  points: BezierPoint[]
  closed: boolean
}

/** Wrap a Point[] as a corner-only BezierPath */
export function ptsToBezier(pts: Point[], closed = false): BezierPath {
  return {
    points: pts.map(p => ({ x: p.x, y: p.y, type: 'corner' as const })),
    closed,
  }
}

/** A single stitch: needle-down to needle-up */
export type StitchPair = [Point, Point]

// ─── Thread ──────────────────────────────────────────────────────────────────

export interface ThreadColor {
  id: string
  name: string
  hex: string      // e.g. "#c84b2f"
  r: number        // 0–255
  g: number
  b: number
  brand?: string
  catalogNumber?: string
}

export const THREAD_PALETTE: ThreadColor[] = [
  { id: 't1',  name: 'Ivory',         hex: '#f5eedc', r: 245, g: 238, b: 220 },
  { id: 't2',  name: 'Cream White',   hex: '#f8f3e8', r: 248, g: 243, b: 232 },
  { id: 't3',  name: 'Warm Sand',     hex: '#d4a96a', r: 212, g: 169, b: 106 },
  { id: 't4',  name: 'Gold',          hex: '#c8922a', r: 200, g: 146, b: 42  },
  { id: 't5',  name: 'Rust',          hex: '#b5451b', r: 181, g: 69,  b: 27  },
  { id: 't6',  name: 'Crimson',       hex: '#9b1c2e', r: 155, g: 28,  b: 46  },
  { id: 't7',  name: 'Dusty Rose',    hex: '#c97a8a', r: 201, g: 122, b: 138 },
  { id: 't8',  name: 'Forest Green',  hex: '#2d6a4f', r: 45,  g: 106, b: 79  },
  { id: 't9',  name: 'Sage',          hex: '#74a77a', r: 116, g: 167, b: 122 },
  { id: 't10', name: 'Teal',          hex: '#1b6e72', r: 27,  g: 110, b: 114 },
  { id: 't11', name: 'Navy',          hex: '#1a2f5e', r: 26,  g: 47,  b: 94  },
  { id: 't12', name: 'Sky Blue',      hex: '#5b9bd5', r: 91,  g: 155, b: 213 },
  { id: 't13', name: 'Violet',        hex: '#6a3d8f', r: 106, g: 61,  b: 143 },
  { id: 't14', name: 'Charcoal',      hex: '#3a3632', r: 58,  g: 54,  b: 50  },
  { id: 't15', name: 'Black',         hex: '#1a1614', r: 26,  g: 22,  b: 20  },
]

// ─── Underlay ─────────────────────────────────────────────────────────────────

export type UnderlayType = 'none' | 'center-run' | 'zig-zag' | 'edge-run' | 'double-edge'

export interface UnderlaySettings {
  type: UnderlayType
  density: number  // mm between underlay rows
  inset: number    // mm inset from edge
}

// ─── Object Base ──────────────────────────────────────────────────────────────

export type EmbroideryObjectType =
  | 'satin-column'
  | 'satin-fill'
  | 'tatami-fill'
  | 'run-stitch'
  | 'manual-stitch'
  | 'lettering'
  | 'applique'

export interface EmbroideryObjectBase {
  id: string
  type: EmbroideryObjectType
  name: string
  color: ThreadColor
  stitchAngle: number        // degrees (0 = horizontal)
  density: number            // mm between stitch rows
  stitchLength: number       // mm max stitch length
  pullCompensation: number   // mm to compensate for pull
  underlay: UnderlaySettings
  tieIn: boolean
  tieOff: boolean
  locked: boolean
  visible: boolean
  stitches?: StitchPair[]    // cached
  needsRegenerate: boolean
  bounds?: BoundingBox
}

export interface BoundingBox {
  x: number
  y: number
  width: number
  height: number
}

// ─── Concrete Object Types ────────────────────────────────────────────────────

export interface SatinColumnObject extends EmbroideryObjectBase {
  type: 'satin-column'
  leftPath:  BezierPath
  rightPath: BezierPath
}

export interface SatinFillObject extends EmbroideryObjectBase {
  type: 'satin-fill'
  boundary: BezierPath
}

export interface TatamiFillObject extends EmbroideryObjectBase {
  type: 'tatami-fill'
  boundary:   BezierPath
  rowOffset:  number  // 0–1
  stitchRows: number  // alternating direction rows
}

export interface RunStitchObject extends EmbroideryObjectBase {
  type: 'run-stitch'
  path:         BezierPath
  stitchLength: number
  passes:       number
}

export interface ManualStitchObject extends EmbroideryObjectBase {
  type: 'manual-stitch'
  points: Point[]
}

export type EmbroideryObject =
  | SatinColumnObject
  | SatinFillObject
  | TatamiFillObject
  | RunStitchObject
  | ManualStitchObject

// ─── Factory Defaults ─────────────────────────────────────────────────────────

export function defaultObjectBase(overrides: Partial<EmbroideryObjectBase> = {}): Omit<EmbroideryObjectBase, 'id' | 'type' | 'name'> {
  return {
    color: THREAD_PALETTE[7],  // Forest Green
    stitchAngle: 45,
    density: 0.4,
    stitchLength: 3.5,
    pullCompensation: 0.2,
    underlay: { type: 'center-run', density: 0.8, inset: 0.4 },
    tieIn: true,
    tieOff: true,
    locked: false,
    visible: true,
    needsRegenerate: true,
    ...overrides,
  }
}
