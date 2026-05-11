/**
 * Thin singleton that lets EditorPage ask EmbroideryViewport for a thumbnail
 * and a zoom-to-fit, without prop-drilling or a global PixiJS reference.
 */

interface ViewportAPI {
  /**
   * Temporarily frames the viewport to the stitch bounding box (no hoop/grid),
   * forces a synchronous render, and returns the live canvas element.
   * Returns null if there are no stitches to display.
   */
  captureForThumbnail: () => HTMLCanvasElement | null
  /** Zoom viewport to fit the current hoop. */
  fitToHoop: () => void
}

let api: ViewportAPI | null = null

export function registerViewport(impl: ViewportAPI | null) {
  api = impl
}

/**
 * Capture a downscaled JPEG thumbnail focused on the embroidery objects.
 * Returns a base64 data-URL, or null if the viewport isn't ready / empty.
 */
export function captureSnapshot(maxW = 420, maxH = 280): string | null {
  const srcCanvas = api?.captureForThumbnail() ?? null
  if (!srcCanvas || srcCanvas.width === 0 || srcCanvas.height === 0) return null

  const scale = Math.min(maxW / srcCanvas.width, maxH / srcCanvas.height, 1)
  const w = Math.max(1, Math.round(srcCanvas.width  * scale))
  const h = Math.max(1, Math.round(srcCanvas.height * scale))

  const offscreen = document.createElement('canvas')
  offscreen.width  = w
  offscreen.height = h
  const ctx = offscreen.getContext('2d')
  if (!ctx) return srcCanvas.toDataURL('image/jpeg', 0.72)

  ctx.drawImage(srcCanvas, 0, 0, w, h)
  return offscreen.toDataURL('image/jpeg', 0.72)
}

/** Ask the viewport to zoom-to-fit the current hoop. */
export function fitViewportToHoop() {
  api?.fitToHoop()
}
