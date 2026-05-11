/**
 * TextEditLayer — placement-indicator only.
 *
 * Shows an I-beam cursor that follows the mouse while the text tool is active.
 * Clicking creates the object; all text entry happens in the right sidebar.
 * No textarea, no live typing, no keyboard capture.
 */

import * as PIXI from 'pixi.js'

const C_CURSOR = 0xffffff
const C_BASE   = 0x40916c

export class TextEditLayer {
  private container: PIXI.Container
  private gfx:       PIXI.Graphics
  private active_  = false

  constructor() {
    this.container = new PIXI.Container()
    this.gfx       = new PIXI.Graphics()
    this.container.addChild(this.gfx)
    this.container.visible = false
  }

  get displayObject(): PIXI.Container { return this.container }
  isActive(): boolean { return this.active_ }

  start() {
    this.active_ = true
    this.container.visible = true
  }

  stop() {
    this.active_ = false
    this.gfx.clear()
    this.container.visible = false
  }

  /** Update the I-beam cursor position as the mouse moves over the canvas. */
  updateCursor(world: { x: number; y: number }, zoom: number) {
    if (!this.active_) return
    this.gfx.clear()

    const z  = zoom
    const lw = 1.0 / z
    const h  = 18 / z   // I-beam height (cap-height proxy)
    const sw = 6  / z   // serif width

    // Vertical stroke
    this.gfx.lineStyle(lw, C_CURSOR, 0.85)
    this.gfx.moveTo(world.x, world.y - h)
    this.gfx.lineTo(world.x, world.y)
    // Top serif
    this.gfx.moveTo(world.x - sw / 2, world.y - h)
    this.gfx.lineTo(world.x + sw / 2, world.y - h)
    // Baseline tick
    this.gfx.moveTo(world.x - sw / 2, world.y)
    this.gfx.lineTo(world.x + sw / 2, world.y)

    // Faint baseline guide
    this.gfx.lineStyle(lw * 0.5, C_BASE, 0.3)
    this.gfx.moveTo(world.x - 40 / z, world.y)
    this.gfx.lineTo(world.x + 40 / z, world.y)
  }

  setZoom(_zoom: number) { /* cursor redraws on next move */ }

  destroy() {
    this.container.destroy({ children: true })
  }
}
