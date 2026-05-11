import * as PIXI from 'pixi.js'
import type { EmbroideryObject } from '../../embroidery/types'
import { PX_PER_MM } from '../../store/canvasStore'

const HANDLE_SIZE  = 7    // px, screen space
const ACCENT_COLOR = 0x40916c
const OUTLINE_ALPHA = 0.85

/**
 * Renders selection outlines and handles for selected embroidery objects.
 */
export class SelectionLayer {
  private container: PIXI.Container
  private gfx:       PIXI.Graphics

  constructor() {
    this.container = new PIXI.Container()
    this.gfx       = new PIXI.Graphics()
    this.container.addChild(this.gfx)
  }

  get displayObject(): PIXI.Container {
    return this.container
  }

  clear() {
    this.gfx.clear()
  }

  setDragOffset(dx: number, dy: number) {
    this.container.position.set(dx, dy)
  }

  clearDragOffset() {
    this.container.position.set(0, 0)
  }

  render(selectedObjects: EmbroideryObject[], zoom: number) {
    this.gfx.clear()
    if (selectedObjects.length === 0) return

    const hs = HANDLE_SIZE / zoom   // handle size in world space

    for (const obj of selectedObjects) {
      if (!obj.stitches || obj.stitches.length === 0) continue

      // Compute bounding box of stitches
      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
      for (const [a, b] of obj.stitches) {
        if (a.x < minX) minX = a.x; if (a.x > maxX) maxX = a.x
        if (b.x < minX) minX = b.x; if (b.x > maxX) maxX = b.x
        if (a.y < minY) minY = a.y; if (a.y > maxY) maxY = a.y
        if (b.y < minY) minY = b.y; if (b.y > maxY) maxY = b.y
      }

      const pad = 4 / zoom
      minX -= pad; minY -= pad; maxX += pad; maxY += pad
      const w = maxX - minX
      const h = maxY - minY

      // Dashed selection rect
      this.gfx.lineStyle(1.5 / zoom, ACCENT_COLOR, OUTLINE_ALPHA)
      this.drawDashedRect(minX, minY, w, h, 6 / zoom)

      // Corner handles
      this.gfx.lineStyle(1.5 / zoom, ACCENT_COLOR, 1)
      this.gfx.beginFill(0xffffff, 0.9)
      const corners = [
        [minX, minY], [maxX, minY],
        [maxX, maxY], [minX, maxY],
      ]
      for (const [cx, cy] of corners) {
        this.gfx.drawRect(cx - hs / 2, cy - hs / 2, hs, hs)
      }

      // Mid-edge handles
      const mids = [
        [(minX + maxX) / 2, minY],
        [maxX, (minY + maxY) / 2],
        [(minX + maxX) / 2, maxY],
        [minX, (minY + maxY) / 2],
      ]
      for (const [cx, cy] of mids) {
        this.gfx.drawRect(cx - hs / 2, cy - hs / 2, hs, hs)
      }
      this.gfx.endFill()

      // Color swatch indicator
      this.gfx.lineStyle(1.5 / zoom, 0xffffff, 0.6)
      this.gfx.beginFill(
        parseInt(obj.color.hex.replace('#', ''), 16),
        1,
      )
      this.gfx.drawCircle(minX + w / 2, minY - 8 / zoom, 4 / zoom)
      this.gfx.endFill()
    }
  }

  private drawDashedRect(x: number, y: number, w: number, h: number, dashLen: number) {
    this.drawDashedLine(x,     y,     x + w, y,     dashLen)
    this.drawDashedLine(x + w, y,     x + w, y + h, dashLen)
    this.drawDashedLine(x + w, y + h, x,     y + h, dashLen)
    this.drawDashedLine(x,     y + h, x,     y,     dashLen)
  }

  private drawDashedLine(x1: number, y1: number, x2: number, y2: number, dash: number) {
    const dx   = x2 - x1
    const dy   = y2 - y1
    const len  = Math.sqrt(dx * dx + dy * dy)
    const nx   = dx / len
    const ny   = dy / len
    let pos    = 0
    let on     = true

    while (pos < len) {
      const segEnd = Math.min(pos + dash, len)
      if (on) {
        this.gfx.moveTo(x1 + nx * pos, y1 + ny * pos)
        this.gfx.lineTo(x1 + nx * segEnd, y1 + ny * segEnd)
      }
      pos += dash
      on = !on
    }
  }
}
