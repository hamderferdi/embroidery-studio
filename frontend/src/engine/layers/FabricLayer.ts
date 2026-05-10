import * as PIXI from 'pixi.js'
import { PX_PER_MM } from '../../store/canvasStore'
import type { HoopDimensions } from '../../store/canvasStore'

const FABRIC_EXTENT = 5000  // world px — covers the full infinite canvas

/**
 * FabricLayer renders:
 *  1. Solid fabric background (fills entire world with warm off-white)
 *  2. Hoop drop-shadow
 *  3. Hoop wood-frame border
 *  4. Hoop stitchable-boundary indicator
 */
export class FabricLayer {
  private container:  PIXI.Container
  private bgRect:     PIXI.Graphics     // infinite fabric fill
  private fabricGfx:  PIXI.Graphics     // woven texture lines (drawn in world space)
  private hoopShadow: PIXI.Graphics
  private hoopBorder: PIXI.Graphics
  private colorHex:   number = 0xf4efe6

  constructor() {
    this.container  = new PIXI.Container()
    this.bgRect     = new PIXI.Graphics()
    this.fabricGfx  = new PIXI.Graphics()
    this.hoopShadow = new PIXI.Graphics()
    this.hoopBorder = new PIXI.Graphics()

    this.container.addChild(
      this.bgRect,
      this.fabricGfx,
      this.hoopShadow,
      this.hoopBorder,
    )

    // Draw the initial background immediately so SOMETHING renders
    this.drawBackground()
  }

  get displayObject(): PIXI.Container {
    return this.container
  }

  private drawBackground() {
    const E = FABRIC_EXTENT
    this.bgRect.clear()
    this.bgRect.beginFill(this.colorHex, 1)
    this.bgRect.drawRect(-E, -E, E * 2, E * 2)
    this.bgRect.endFill()

    // Woven texture — thin lines at 1mm (~3.78 world-px) spacing, very low alpha
    // Only draw a bounded region for performance; grid layer covers navigation
    this.fabricGfx.clear()
    const GRAIN = 3.78   // 1 mm in world-px
    const hAlpha = 0.032
    const vAlpha = 0.028

    // Slightly darker shade of fabric color for thread grain lines
    const dr = Math.max(0, ((this.colorHex >> 16) & 0xff) - 22)
    const dg = Math.max(0, ((this.colorHex >>  8) & 0xff) - 20)
    const db = Math.max(0, ((this.colorHex      ) & 0xff) - 14)
    const darkLine = (dr << 16) | (dg << 8) | db

    // Horizontal weave
    this.fabricGfx.lineStyle(0.6, darkLine, hAlpha)
    for (let y = -E; y <= E; y += GRAIN) {
      this.fabricGfx.moveTo(-E, y)
      this.fabricGfx.lineTo( E, y)
    }
    // Vertical weave (slightly lighter — directional sheen)
    this.fabricGfx.lineStyle(0.6, darkLine, vAlpha)
    for (let x = -E; x <= E; x += GRAIN) {
      this.fabricGfx.moveTo(x, -E)
      this.fabricGfx.lineTo(x,  E)
    }

    // Subtle diagonal sheen — makes fabric look 3D at normal zoom
    const sheen = Math.min(255, ((this.colorHex >> 16) & 0xff) + 12)
    const sheenColor = (sheen << 16) | (sheen << 8) | sheen
    this.fabricGfx.lineStyle(1.5, sheenColor, 0.06)
    for (let d = -E * 2; d <= E * 2; d += GRAIN * 4) {
      this.fabricGfx.moveTo(d, -E)
      this.fabricGfx.lineTo(d + E * 2, E)
    }
  }

  initTexture(baseColor: string) {
    // Parse hex string to number
    const hex = baseColor.replace('#', '')
    this.colorHex = parseInt(hex, 16)
    this.drawBackground()
  }

  updateHoop(hoop: HoopDimensions, visible: boolean) {
    this.hoopShadow.clear()
    this.hoopBorder.clear()

    if (!visible) return

    const hw = (hoop.width  * PX_PER_MM) / 2
    const hh = (hoop.height * PX_PER_MM) / 2
    const r  = Math.min(hw, hh) * 0.05

    // ── Outer ambient shadow (outside hoop darkens slightly) ──────────────────
    // Draw a dark rect covering everything, then punch out hoop area with blending
    // Simpler: just draw vignette rings around hoop
    for (let i = 8; i >= 1; i--) {
      const s = i * 3
      this.hoopShadow.beginFill(0x000000, 0.018 * (9 - i))
      this.hoopShadow.drawRoundedRect(-hw - s, -hh - s, (hw + s) * 2, (hh + s) * 2, r + s * 0.5)
      this.hoopShadow.endFill()
    }

    // ── Wooden hoop frame ─────────────────────────────────────────────────────
    const ringW = 6 * PX_PER_MM
    // Outer frame (wood color)
    this.hoopBorder.lineStyle(ringW, 0x8b7355, 0.7)
    this.hoopBorder.drawRoundedRect(-hw, -hh, hw * 2, hh * 2, r)

    // Frame highlight (top-left lighter edge)
    this.hoopBorder.lineStyle(1.5, 0xc4a47a, 0.5)
    this.hoopBorder.drawRoundedRect(
      -hw + ringW * 0.35, -hh + ringW * 0.35,
      (hw - ringW * 0.35) * 2, (hh - ringW * 0.35) * 2, r,
    )

    // Stitchable area indicator (faint red dashed)
    this.hoopBorder.lineStyle(1, 0xff4444, 0.3)
    this.hoopBorder.drawRoundedRect(-hw, -hh, hw * 2, hh * 2, r)
  }

  updateFabricColor(color: string) {
    this.initTexture(color)
  }
}
