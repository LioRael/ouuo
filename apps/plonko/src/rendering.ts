import { keys, noteColor } from './music'
import type { ScoreNote } from './score'

export type NoteTrail = { midi: number; start: number; end?: number }

export function renderPiano(
  canvas: HTMLCanvasElement,
  state: {
    time: number
    notes: readonly ScoreNote[]
    played: ReadonlySet<number>
    active: ReadonlySet<number>
    trails: NoteTrail[]
    free: boolean
    reduced: boolean
    effects: boolean
    hints: boolean
  },
) {
  const context = canvas.getContext('2d')
  if (!context) return
  const { width, height } = canvas.getBoundingClientRect()
  const ratio = Math.min(devicePixelRatio || 1, 2)
  if (
    canvas.width !== Math.round(width * ratio) ||
    canvas.height !== Math.round(height * ratio)
  ) {
    canvas.width = Math.round(width * ratio)
    canvas.height = Math.round(height * ratio)
  }
  context.setTransform(ratio, 0, 0, ratio, 0, 0)
  context.clearRect(0, 0, width, height)
  const column = width / 8
  const baseline = height - 2
  const drawNote = (
    midi: number,
    bottom: number,
    length: number,
    alpha = 1,
  ) => {
    const key = keys.find((key) => key.midi === midi)
    if (!key) return
    const center = (key.position + (key.black ? 0 : 0.5)) * column
    const size = column * (key.black ? 0.34 : 0.48)
    const color = noteColor(midi)
    context.globalAlpha = alpha
    context.shadowBlur = state.effects ? 18 : 0
    context.shadowColor = color
    const fill = context.createLinearGradient(0, bottom - length, 0, bottom)
    fill.addColorStop(0, `${color}55`)
    fill.addColorStop(0.82, `${color}bf`)
    fill.addColorStop(1, '#ffffff')
    context.fillStyle = fill
    context.strokeStyle = color
    context.lineWidth = 1.5
    context.beginPath()
    context.roundRect(
      center - size / 2,
      bottom - length,
      size,
      length,
      Math.min(8, size / 3),
    )
    context.fill()
    context.stroke()
    context.shadowBlur = 0
    context.globalAlpha = 1
  }
  if (!state.free && state.hints) {
    context.lineWidth = 1
    context.strokeStyle = '#d2d9ff09'
    keys
      .filter((key) => !key.black)
      .forEach((key) => {
        context.beginPath()
        context.moveTo((key.position + 0.5) * column, 0)
        context.lineTo((key.position + 0.5) * column, baseline)
        context.stroke()
      })
    state.notes.forEach((note, index) => {
      const distance = note.time - state.time
      if (distance > 3.5 || distance + note.duration < -0.2) return
      if (state.played.has(index) && !note.hold) return
      if (state.reduced) {
        if (Math.abs(distance) < 0.3) drawNote(note.midi, baseline, 14)
      } else {
        drawNote(
          note.midi,
          baseline - (distance / 3.5) * height,
          Math.max(22, (note.duration / 3.5) * height),
          Math.min(1, (3.5 - distance) * 1.5),
        )
      }
    })
  }
  const now = performance.now() / 1000
  if (!state.reduced && state.free)
    state.trails.forEach((trail) => {
      const age = now - (trail.end ?? now)
      if (age > 3.5) return
      const bottom = baseline - (age * height) / 3.5
      drawNote(
        trail.midi,
        bottom,
        Math.max(20, (((trail.end ?? now) - trail.start) * height) / 3.5),
        Math.max(0, 1 - age / 3.5),
      )
    })
  if (state.effects)
    state.active.forEach((midi) => {
      const key = keys.find((key) => key.midi === midi)
      if (!key) return
      const x = (key.position + (key.black ? 0 : 0.5)) * column
      const color = noteColor(midi)
      const glow = context.createRadialGradient(
        x,
        baseline,
        0,
        x,
        baseline,
        column * 0.9,
      )
      glow.addColorStop(0, `${color}a0`)
      glow.addColorStop(1, `${color}00`)
      context.fillStyle = glow
      context.fillRect(x - column, baseline - column, column * 2, column)
      context.strokeStyle = `${color}a0`
      context.beginPath()
      context.ellipse(x, baseline - 2, column * 0.38, 7, 0, 0, Math.PI * 2)
      context.stroke()
      if (!state.reduced) {
        context.fillStyle = color
        for (let i = 0; i < 10; i++) {
          const age = (now * 0.7 + i * 0.13 + midi * 0.07) % 1
          context.globalAlpha = (1 - age) * 0.8
          context.fillRect(
            x + Math.sin(i * 17 + age * 3) * column * 0.3 * age,
            baseline - age * 115,
            1.5,
            1.5,
          )
        }
        context.globalAlpha = 1
      }
    })
}
