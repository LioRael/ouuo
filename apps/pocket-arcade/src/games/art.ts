export const ink = '#141b32'
export const cream = '#fff1dd'
export const coral = '#ff9587'
export const lavender = '#c6b8ed'
export const cyan = '#87dfdf'
export const gold = '#f5d27d'

export function text(
  ctx: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  color = cream,
  size = 12,
) {
  ctx.fillStyle = color
  ctx.font = `bold ${size}px monospace`
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText(value, x, y)
}

export function clear(ctx: CanvasRenderingContext2D) {
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = ink
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
}
