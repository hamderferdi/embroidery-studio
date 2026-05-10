import * as PIXI from 'pixi.js'

/**
 * Generates a realistic fabric/stabilizer texture via Canvas 2D API.
 * Produces a woven textile look with subtle noise and directional grain.
 */
export function createFabricTexture(
  renderer: PIXI.Renderer,
  size = 256,
  baseColor = '#f4efe6',
): PIXI.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!

  // Parse base color
  const r = parseInt(baseColor.slice(1, 3), 16)
  const g = parseInt(baseColor.slice(3, 5), 16)
  const b = parseInt(baseColor.slice(5, 7), 16)

  ctx.fillStyle = baseColor
  ctx.fillRect(0, 0, size, size)

  // Woven thread lines — horizontal
  for (let y = 0; y < size; y += 2) {
    const alpha = 0.04 + Math.random() * 0.04
    ctx.strokeStyle = `rgba(${r - 20}, ${g - 18}, ${b - 15}, ${alpha})`
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(0, y + 0.5)
    ctx.lineTo(size, y + 0.5)
    ctx.stroke()
  }

  // Woven thread lines — vertical
  for (let x = 0; x < size; x += 2) {
    const alpha = 0.03 + Math.random() * 0.03
    ctx.strokeStyle = `rgba(${r - 15}, ${g - 13}, ${b - 10}, ${alpha})`
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(x + 0.5, 0)
    ctx.lineTo(x + 0.5, size)
    ctx.stroke()
  }

  // Random fiber noise
  const imgData = ctx.getImageData(0, 0, size, size)
  const data = imgData.data
  for (let i = 0; i < data.length; i += 4) {
    const n = (Math.random() - 0.5) * 8
    data[i]     = Math.min(255, Math.max(0, data[i]     + n))
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + n * 0.9))
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + n * 0.8))
  }
  ctx.putImageData(imgData, 0, 0)

  // Diagonal sheen variation
  const grad = ctx.createLinearGradient(0, 0, size, size)
  grad.addColorStop(0,   'rgba(255,255,255,0.04)')
  grad.addColorStop(0.5, 'rgba(255,255,255,0.00)')
  grad.addColorStop(1,   'rgba(0,0,0,0.04)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)

  const base = new PIXI.BaseTexture(canvas)
  base.wrapMode = PIXI.WRAP_MODES.REPEAT
  return new PIXI.Texture(base)
}

/** Subtle shadow texture rendered below embroidery objects */
export function createShadowTexture(size = 32): PIXI.Texture {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grad.addColorStop(0, 'rgba(0,0,0,0.18)')
  grad.addColorStop(1, 'rgba(0,0,0,0.00)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  return PIXI.Texture.from(canvas)
}
