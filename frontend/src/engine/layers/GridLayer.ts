import * as PIXI from 'pixi.js'
import { PX_PER_MM } from '../../store/canvasStore'

/**
 * Renders a millimeter grid that scales with zoom.
 * Minor lines every 1 mm, major lines every 10 mm.
 */
export class GridLayer {
  private container: PIXI.Container
  private gfx:       PIXI.Graphics
  private visible_:  boolean = true

  constructor() {
    this.container = new PIXI.Container()
    this.gfx       = new PIXI.Graphics()
    this.container.addChild(this.gfx)
    this.container.alpha = 0.6
  }

  get displayObject(): PIXI.Container {
    return this.container
  }

  setVisible(v: boolean) {
    this.visible_          = v
    this.container.visible = v
  }

  /**
   * Redraws the grid to cover the visible area.
   * viewBounds: the visible rectangle in world-space pixels.
   */
  update(
    viewX: number, viewY: number,
    viewW: number, viewH: number,
    zoom: number,
  ) {
    if (!this.visible_) return
    this.gfx.clear()

    const minor = PX_PER_MM * 1         // 1mm
    const major = PX_PER_MM * 10        // 10mm

    // Only draw minor lines above zoom threshold (avoids visual clutter)
    const drawMinor = zoom > 0.6

    const startX = Math.floor(viewX / minor) * minor - minor
    const startY = Math.floor(viewY / minor) * minor - minor
    const endX   = viewX + viewW + minor
    const endY   = viewY + viewH + minor

    // Minor grid
    if (drawMinor) {
      this.gfx.lineStyle(0.5 / zoom, 0xd4c9b8, 0.25)
      for (let x = startX; x <= endX; x += minor) {
        if (Math.abs(x % major) < 0.01) continue
        this.gfx.moveTo(x, startY)
        this.gfx.lineTo(x, endY)
      }
      for (let y = startY; y <= endY; y += minor) {
        if (Math.abs(y % major) < 0.01) continue
        this.gfx.moveTo(startX, y)
        this.gfx.lineTo(endX, y)
      }
    }

    // Major grid
    const majorStartX = Math.floor(viewX / major) * major - major
    const majorStartY = Math.floor(viewY / major) * major - major

    this.gfx.lineStyle(0.75 / zoom, 0xb8a898, drawMinor ? 0.4 : 0.3)
    for (let x = majorStartX; x <= endX; x += major) {
      this.gfx.moveTo(x, startY)
      this.gfx.lineTo(x, endY)
    }
    for (let y = majorStartY; y <= endY; y += major) {
      this.gfx.moveTo(startX, y)
      this.gfx.lineTo(endX, y)
    }

    // Origin crosshair
    this.gfx.lineStyle(1 / zoom, 0x8b7355, 0.5)
    this.gfx.moveTo(0, startY)
    this.gfx.lineTo(0, endY)
    this.gfx.moveTo(startX, 0)
    this.gfx.lineTo(endX, 0)
  }
}
