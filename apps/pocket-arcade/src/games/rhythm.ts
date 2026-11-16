import type { Control, Game, GameHost } from '../game'
import { clear, coral, cream, cyan, gold, ink, lavender, text } from './art'

const lanes: Control[] = ['left', 'down', 'a']
const pattern = [0, 1, 2, 1, 0, 2, 1, 2]
const melody = [
  523.25, 587.33, 783.99, 659.25, 523.25, 880, 659.25, 783.99, 440, 523.25,
  659.25, 587.33, 440, 783.99, 587.33, 659.25, 349.23, 440, 698.46, 523.25,
  349.23, 783.99, 523.25, 698.46, 392, 493.88, 783.99, 587.33, 392, 880, 587.33,
  523.25,
]
const chart = melody.map((frequency, index) => ({
  time: 2 + index * 0.5,
  lane: pattern[index % pattern.length],
  frequency,
}))
const tune = chart.flatMap((note, index) =>
  index % 2 === 0
    ? [
        note,
        {
          time: note.time,
          frequency: [130.81, 110, 87.31, 98][Math.floor(index / 8)],
        },
      ]
    : [note],
)
const colors = [cyan, gold, coral]
const labels = ['LEFT', 'DOWN', 'A']
const epsilon = 1e-9

export function createRhythm(host: GameHost): Game {
  const states: ('pending' | 'hit' | 'miss')[] = chart.map(() => 'pending')
  let score = 0
  let combo = 0
  let best = 0
  let hits = 0
  let misses = 0
  let audioIndex = 0
  let clock = 0
  let done = false
  let feedback = 'HIT ON THE LINE'
  let feedbackUntil = 2

  function advance(elapsed: number) {
    clock = Math.max(clock, elapsed)
    chart.forEach((note, index) => {
      if (states[index] === 'pending' && clock > note.time + 0.15 + epsilon) {
        states[index] = 'miss'
        misses++
        combo = 0
        feedback = 'MISS'
        feedbackUntil = clock + 0.45
      }
    })
  }

  return {
    pause(elapsed) {
      if (done) return
      const firstFuture = tune.findIndex((event) => event.time >= elapsed)
      audioIndex = firstFuture < 0 ? tune.length : firstFuture
    },
    update(_seconds, _held, elapsed) {
      if (done) return
      advance(elapsed)
      while (
        audioIndex < tune.length &&
        tune[audioIndex].time <= clock + 0.12 + epsilon
      ) {
        const event = tune[audioIndex++]
        // A stalled frame must not dump a backlog of old music into the present.
        if (event.time >= clock - 0.04) {
          host.tone(event.frequency, 0.16, Math.max(0, event.time - clock))
        }
      }
      if (clock >= 18.5) {
        done = true
        host.finish({
          title: hits === chart.length ? 'Perfect circuit' : 'Track complete',
          score,
          detail: `${hits}/32 notes hit · best combo ${best} · ${misses} missed`,
        })
      }
    },
    press(control, elapsed) {
      if (done || elapsed < clock - epsilon || !lanes.includes(control)) return
      advance(elapsed)
      const lane = lanes.indexOf(control)
      const index = chart.findIndex(
        (note, i) =>
          states[i] === 'pending' &&
          note.lane === lane &&
          Math.abs(note.time - clock) <= 0.15 + epsilon,
      )
      if (index < 0) return
      states[index] = 'hit'
      const perfect = Math.abs(chart[index].time - clock) <= 0.06 + epsilon
      score += perfect ? 100 : 60
      hits++
      combo++
      best = Math.max(best, combo)
      feedback = perfect ? 'PERFECT +100' : 'GOOD +60'
      feedbackUntil = clock + 0.45
    },
    draw(ctx, elapsed) {
      ctx.save()
      clear(ctx)
      const height = ctx.canvas.height
      const hitY = height - 70
      const fallSpeed = (112 * (hitY - 62)) / 188
      ctx.fillStyle = '#373653'
      ctx.fillRect(0, 60, 480, height - 208)
      ctx.fillStyle = '#64506b'
      ctx.fillRect(0, height - 148, 480, 46)
      ctx.fillStyle = '#a87581'
      ctx.fillRect(0, height - 102, 480, 56)
      ctx.save()
      ctx.translate(0, height - 320)
      ctx.fillStyle = lavender
      ctx.fillRect(426, 74, 20, 36)
      ctx.fillRect(418, 82, 36, 20)
      ctx.fillRect(422, 78, 28, 28)
      ctx.fillStyle = '#373653'
      ctx.fillRect(436, 70, 20, 30)
      ctx.fillRect(444, 94, 12, 8)
      for (const [x, y, width] of [
        [386, 135, 72],
        [22, 67, 80],
        [232, 109, 74],
      ]) {
        ctx.fillStyle = '#77718f'
        ctx.fillRect(x + 12, y, width - 32, 6)
        ctx.fillRect(x + 4, y + 6, width - 8, 7)
        ctx.fillRect(x, y + 13, width, 5)
        ctx.fillStyle = '#55506f'
        ctx.fillRect(x + 8, y + 18, width - 14, 4)
      }
      ctx.fillStyle = '#3b3b58'
      for (const [x, y, width, height] of [
        [0, 204, 30, 62],
        [30, 189, 26, 77],
        [58, 211, 36, 55],
        [390, 207, 30, 59],
        [424, 194, 28, 72],
        [456, 214, 24, 52],
      ]) {
        ctx.fillRect(x, y, width, height)
        ctx.fillRect(x + 5, y - 7, width - 10, 7)
        ctx.fillStyle = '#d09ca5'
        ctx.fillRect(x + 7, y + 12, 4, 6)
        ctx.fillRect(x + 17, y + 24, 4, 6)
        ctx.fillStyle = '#3b3b58'
      }
      ctx.fillStyle = ink
      for (const [x, y] of [
        [104, 184],
        [128, 206],
        [403, 224],
        [466, 186],
      ]) {
        ctx.fillRect(x + 8, y + 17, 4, 53)
        ctx.fillRect(x + 6, y, 8, 9)
        ctx.fillRect(x + 2, y + 9, 16, 10)
        ctx.fillRect(x - 2, y + 19, 24, 11)
        ctx.fillRect(x - 6, y + 30, 32, 11)
      }
      ctx.fillStyle = '#292c46'
      ctx.fillRect(0, 264, 480, 9)
      ctx.fillRect(0, 245, 480, 4)
      for (let x = 4; x < 480; x += 24) ctx.fillRect(x, 245, 3, 20)
      for (const x of [16, 80, 400, 464]) ctx.fillRect(x, 270, 9, 10)
      ctx.restore()
      ctx.fillStyle = ink
      ctx.fillRect(0, height - 42, 480, 42)
      ctx.fillStyle = '#141b32eb'
      ctx.fillRect(8, 73, 132, 145)
      text(ctx, 'RHYTHM RUSH', 18, 14, coral, 18)
      text(ctx, 'SUNDOWN CIRCUIT / 120 BPM', 18, 38, lavender, 13)
      text(ctx, `SCORE ${score}`, 14, 83, cream, 20)
      text(ctx, `COMBO ${combo}`, 14, 119, gold, 20)
      text(ctx, `BEST ${best}`, 14, 159, lavender, 16)
      text(ctx, `MISSES ${misses}`, 14, 188, cream, 16)
      for (let lane = 0; lane < 3; lane++) {
        const x = 148 + lane * 80
        ctx.fillStyle = '#1b2545ed'
        ctx.fillRect(x, 62, 76, hitY - 36)
        ctx.fillStyle = colors[lane]
        ctx.fillRect(x, hitY, 76, 3)
        ctx.strokeStyle = colors[lane]
        ctx.lineWidth = 2
        ctx.strokeRect(x + 16, hitY - 12, 44, 26)
        text(
          ctx,
          labels[lane],
          x + (lane === 2 ? 32 : 16),
          height - 41,
          colors[lane],
          18,
        )
      }
      chart.forEach((note, index) => {
        const y = Math.round(hitY - (note.time - elapsed) * fallSpeed)
        if (states[index] !== 'pending' || y < 65 || y > hitY + 20) return
        const x = 166 + note.lane * 80
        ctx.fillStyle = colors[note.lane]
        ctx.fillRect(x, y - 8, 40, 16)
        ctx.fillStyle = ink
        // One, two and three dark notches identify lanes without color alone.
        for (let notch = 0; notch <= note.lane; notch++) {
          ctx.fillRect(x + 8 + notch * 9, y - 3, 4, 6)
        }
      })
      if (elapsed < feedbackUntil)
        text(ctx, feedback, 152, height - 20, cream, 16)
      ctx.fillStyle = coral
      ctx.fillRect(0, 0, Math.round(480 * Math.min(1, elapsed / 18.5)), 3)
      ctx.restore()
    },
  }
}
