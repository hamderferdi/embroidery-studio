import * as PIXI from 'pixi.js'
import type { EmbroideryObject, LetteringObject } from '../../embroidery/types'
import { StitchRenderer } from '../renderers/StitchRenderer'
import { PX_PER_MM } from '../../store/canvasStore'

interface ObjectEntry {
  renderer:    StitchRenderer
  placeholder: PIXI.Graphics | null   // shown when no stitches yet
  dirty:       boolean
}

/**
 * EmbroideryLayer manages one StitchRenderer per EmbroideryObject.
 *
 * For lettering objects that have text but no stitches yet (font still loading
 * or Apply not yet clicked), a lightweight PIXI.Graphics placeholder renders
 * the letter positions so the canvas is never blank.
 */
export class EmbroideryLayer {
  private container: PIXI.Container
  private entries:   Map<string, ObjectEntry> = new Map()
  private zoom_:     number = 1

  constructor() {
    this.container = new PIXI.Container()
  }

  get displayObject(): PIXI.Container {
    return this.container
  }

  setZoom(zoom: number) {
    this.zoom_ = zoom
  }

  syncObjects(objects: EmbroideryObject[]) {
    const incomingIds = new Set(objects.map(o => o.id))

    // Remove stale entries
    for (const [id, entry] of this.entries) {
      if (!incomingIds.has(id)) {
        this.container.removeChild(entry.renderer.displayObject)
        entry.renderer.destroy()
        if (entry.placeholder) {
          this.container.removeChild(entry.placeholder)
          entry.placeholder.destroy()
        }
        this.entries.delete(id)
      }
    }

    // Add / update
    for (const obj of objects) {
      if (!obj.visible) {
        const entry = this.entries.get(obj.id)
        if (entry) {
          entry.renderer.displayObject.visible = false
          if (entry.placeholder) entry.placeholder.visible = false
        }
        continue
      }

      if (!this.entries.has(obj.id)) {
        const renderer    = new StitchRenderer()
        const placeholder = obj.type === 'lettering' ? new PIXI.Graphics() : null
        this.container.addChild(renderer.displayObject)
        if (placeholder) this.container.addChild(placeholder)
        this.entries.set(obj.id, { renderer, placeholder, dirty: true })
        console.log(`[TEXT] EmbroideryLayer: entry created for ${obj.id}`)
      }

      const entry = this.entries.get(obj.id)!
      entry.renderer.displayObject.visible = true

      const hasStitches = (obj.stitches?.length ?? 0) > 0

      if (hasStitches) {
        // Normal stitch rendering
        entry.renderer.render(obj.stitches!, obj.color, this.zoom_)
        if (entry.placeholder) entry.placeholder.visible = false
        console.log(`[TEXT] EmbroideryLayer: rendered ${obj.stitches!.length} stitches for ${obj.id}`)
      } else if (obj.type === 'lettering' && entry.placeholder) {
        // Lettering placeholder — draw glyph outlines or a simple text indicator
        this.renderLetteringPlaceholder(entry.placeholder, obj as LetteringObject)
        entry.renderer.displayObject.visible = false
      }
    }
  }

  /**
   * Render a lightweight preview for a lettering object that has no stitches yet.
   * If letterBoundaries exist, draw glyph outlines; otherwise draw a simple label box.
   */
  private renderLetteringPlaceholder(gfx: PIXI.Graphics, obj: LetteringObject) {
    gfx.clear()
    gfx.visible = true

    const z  = this.zoom_
    const lw = 1.0 / z
    const c  = parseInt(obj.color.hex.replace('#', ''), 16)

    if (obj.letterBoundaries && obj.letterBoundaries.length > 0) {
      // Draw glyph outlines from stored bezier paths
      gfx.lineStyle(lw, c, 0.6)
      for (const contours of obj.letterBoundaries) {
        if (!contours) continue
        for (const contour of contours) {
          const pts = contour.points
          if (pts.length < 2) continue
          gfx.moveTo(pts[0].x, pts[0].y)
          for (let i = 0; i < pts.length; i++) {
            const a = pts[i]
            const b = pts[(i + 1) % pts.length]
            const p1x = a.x + (a.ho?.x ?? 0)
            const p1y = a.y + (a.ho?.y ?? 0)
            const p2x = b.x + (b.hi?.x ?? 0)
            const p2y = b.y + (b.hi?.y ?? 0)
            if (a.ho || b.hi) {
              gfx.bezierCurveTo(p1x, p1y, p2x, p2y, b.x, b.y)
            } else {
              gfx.lineTo(b.x, b.y)
            }
          }
          if (contour.closed) gfx.closePath()
        }
      }
    } else if (obj.text) {
      // No boundaries yet — draw a simple indicator box so the object is visible
      const h = (obj.fontSizeMm ?? 10) * PX_PER_MM * 1.4
      const w = h * obj.text.length * 0.65
      gfx.lineStyle(lw, c, 0.4)
      gfx.drawRect(obj.x, obj.y - h, w, h)
    }
  }

  rerenderAll(objects: EmbroideryObject[]) {
    for (const obj of objects) {
      if (!obj.visible) continue
      const entry = this.entries.get(obj.id)
      if (!entry) continue

      const hasStitches = (obj.stitches?.length ?? 0) > 0
      if (hasStitches && obj.stitches) {
        entry.renderer.render(obj.stitches, obj.color, this.zoom_)
        if (entry.placeholder) entry.placeholder.visible = false
        entry.renderer.displayObject.visible = true
      } else if (obj.type === 'lettering' && entry.placeholder) {
        this.renderLetteringPlaceholder(entry.placeholder, obj as LetteringObject)
        entry.renderer.displayObject.visible = false
      }
    }
  }

  setObjectOffset(id: string, dx: number, dy: number) {
    const entry = this.entries.get(id)
    if (entry) {
      entry.renderer.displayObject.position.set(dx, dy)
      if (entry.placeholder) entry.placeholder.position.set(dx, dy)
    }
  }

  clearOffsets() {
    for (const entry of this.entries.values()) {
      entry.renderer.displayObject.position.set(0, 0)
      if (entry.placeholder) entry.placeholder.position.set(0, 0)
    }
  }

  destroy() {
    for (const entry of this.entries.values()) {
      entry.renderer.destroy()
      if (entry.placeholder) entry.placeholder.destroy()
    }
    this.entries.clear()
    this.container.destroy({ children: true })
  }
}
