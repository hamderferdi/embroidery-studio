import * as PIXI from 'pixi.js'
import type { EmbroideryObject } from '../../embroidery/types'
import { StitchRenderer } from '../renderers/StitchRenderer'

interface ObjectEntry {
  renderer: StitchRenderer
  dirty:    boolean
}

/**
 * EmbroideryLayer manages one StitchRenderer per EmbroideryObject,
 * batching their display objects in the scene graph.
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

    // Remove stale objects
    for (const [id, entry] of this.entries) {
      if (!incomingIds.has(id)) {
        this.container.removeChild(entry.renderer.displayObject)
        entry.renderer.destroy()
        this.entries.delete(id)
      }
    }

    // Add / update
    for (const obj of objects) {
      if (!obj.visible) {
        const entry = this.entries.get(obj.id)
        if (entry) entry.renderer.displayObject.visible = false
        continue
      }

      if (!this.entries.has(obj.id)) {
        const renderer = new StitchRenderer()
        this.container.addChild(renderer.displayObject)
        this.entries.set(obj.id, { renderer, dirty: true })
      }

      const entry = this.entries.get(obj.id)!
      entry.renderer.displayObject.visible = true

      if (obj.stitches) {
        entry.renderer.render(obj.stitches, obj.color, this.zoom_)
      }
    }
  }

  /** Re-render all visible objects (e.g. after zoom change affects thread width) */
  rerenderAll(objects: EmbroideryObject[]) {
    for (const obj of objects) {
      if (!obj.visible) continue
      const entry = this.entries.get(obj.id)
      if (entry && obj.stitches) {
        entry.renderer.render(obj.stitches, obj.color, this.zoom_)
      }
    }
  }

  setObjectOffset(id: string, dx: number, dy: number) {
    const entry = this.entries.get(id)
    if (entry) entry.renderer.displayObject.position.set(dx, dy)
  }

  clearOffsets() {
    for (const entry of this.entries.values()) {
      entry.renderer.displayObject.position.set(0, 0)
    }
  }

  destroy() {
    for (const entry of this.entries.values()) {
      entry.renderer.destroy()
    }
    this.entries.clear()
    this.container.destroy({ children: true })
  }
}
