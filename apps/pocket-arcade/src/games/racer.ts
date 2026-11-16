import type { Game, GameHost } from '../game'
import { clear, coral, cream, cyan, gold, ink, lavender, text } from './art'

const step = 1 / 120
const traffic = [1, 0, 2, 1, 2, 0, 1, 0, 2]

export function createRacer(host: GameHost): Game {
  let x = 240
  let distance = 0
  let speed = 90
  let hull = 3
  let battery = 1
  let ticks = 0
  let accumulator = 0
  let done = false
  let hitAt = -100
  const obstacles = Array.from({ length: 48 }, (_, index) => ({
    x: 158 + traffic[index % traffic.length] * 82,
    distance: 420 + index * 260,
    passed: false,
  }))

  function finish() {
    done = true
    host.finish({
      title: hull === 0 ? 'Out of road' : 'Coast complete',
      score: Math.floor(distance) + (hull > 0 ? hull * 250 : 0),
      detail: `${Math.floor(distance)}m along the coast · hull ${hull}/3`,
    })
  }

  return {
    update(seconds, held) {
      if (done) return
      accumulator += Math.max(0, seconds)
      // Fixed substeps preserve steering and swept collisions across irregular frames.
      while (accumulator + 1e-9 >= step && !done) {
        accumulator -= step
        ticks++
        const time = ticks * step
        const braking = held.has('down')
        const boosting = held.has('a') && !braking && battery > 0
        battery = Math.max(
          0,
          Math.min(1, battery + (boosting ? -0.26 : 0.14) * step),
        )
        speed = (90 + time * 3) * (braking ? 0.45 : 1) + (boosting ? 100 : 0)
        const previous = distance
        distance += speed * step
        x = Math.max(
          132,
          Math.min(
            348,
            x +
              (Number(held.has('right')) - Number(held.has('left'))) *
                180 *
                step,
          ),
        )
        for (const obstacle of obstacles) {
          if (obstacle.passed) continue
          if (
            previous <= obstacle.distance + 32 &&
            distance >= obstacle.distance - 32 &&
            Math.abs(x - obstacle.x) < 26
          ) {
            obstacle.passed = true
            hull--
            hitAt = time
            host.tone(65.41, 0.16)
            if (hull === 0) {
              finish()
              break
            }
          } else if (distance > obstacle.distance + 32) {
            obstacle.passed = true
          }
        }
        if (!done && ticks >= 5400) finish()
      }
    },
    press() {},
    draw(ctx) {
      ctx.save()
      clear(ctx)
      const height = ctx.canvas.height
      const roadBottom = height - 44
      ctx.fillStyle = '#284451'
      ctx.fillRect(0, 40, 112, roadBottom - 40)
      ctx.fillStyle = '#303453'
      ctx.fillRect(368, 40, 112, roadBottom - 40)
      ctx.fillStyle = '#232b42'
      ctx.fillRect(112, 40, 256, roadBottom - 40)
      for (let y = 40; y < roadBottom; y += 24) {
        ctx.fillStyle =
          Math.floor((y + distance) / 24) % 2 === 0 ? cream : coral
        ctx.fillRect(108, y, 5, 24)
        ctx.fillRect(367, y, 5, 24)
      }
      ctx.save()
      ctx.beginPath()
      ctx.rect(0, 40, 480, roadBottom - 40)
      ctx.clip()
      for (let y = -40; y < height + 10; y += 64) {
        const offset = Math.round(y + (distance % 64))
        ctx.fillStyle = lavender
        ctx.fillRect(198, offset, 3, 26)
        ctx.fillRect(280, offset, 3, 26)
      }
      for (let i = 0; i < Math.ceil(height / 86) + 1; i++) {
        const y = Math.round((i * 86 + distance * 0.6) % (height + 40)) - 40
        ctx.fillStyle = cyan
        ctx.fillRect(12, y + 10, 30, 3)
        ctx.fillRect(28, y + 19, 42, 3)
        ctx.fillStyle = lavender
        ctx.fillRect(404, y, 36, 24)
        ctx.fillRect(396, y + 10, 52, 15)
        ctx.fillStyle = '#303453'
        ctx.fillRect(412, y, 16, 5)
        ctx.fillStyle = coral
        ctx.fillRect(450, y + 50, 8, 23)
        ctx.fillRect(442, y + 54, 8, 6)
      }
      for (const obstacle of obstacles) {
        const y = Math.round(height - 70 - (obstacle.distance - distance))
        if (y < 12 || y > height - 10 || obstacle.passed) continue
        ctx.fillStyle = ink
        ctx.fillRect(obstacle.x - 19, y - 12, 38, 33)
        ctx.fillStyle = gold
        ctx.fillRect(obstacle.x - 15, y - 16, 30, 32)
        ctx.fillStyle = ink
        ctx.fillRect(obstacle.x - 11, y - 8, 22, 5)
        ctx.fillRect(obstacle.x - 11, y + 3, 22, 5)
        ctx.fillStyle = coral
        ctx.fillRect(obstacle.x - 19, y + 12, 38, 5)
      }
      ctx.save()
      ctx.translate(0, height - 320)
      const carX = Math.round(x) - 12
      ctx.fillStyle = ink
      ctx.fillRect(carX - 4, 236, 32, 12)
      ctx.fillRect(carX - 4, 259, 32, 12)
      ctx.fillStyle = ticks * step - hitAt < 0.4 ? cream : coral
      ctx.fillRect(carX, 231, 24, 38)
      ctx.fillStyle = ink
      ctx.fillRect(carX + 4, 240, 16, 9)
      ctx.fillStyle = lavender
      ctx.fillRect(carX + 5, 241, 14, 4)
      ctx.fillStyle = cream
      ctx.fillRect(carX + 2, 232, 5, 3)
      ctx.fillRect(carX + 17, 232, 5, 3)
      ctx.fillStyle = cyan
      if (speed > 90 + ticks * step * 3) {
        ctx.fillRect(carX + 4, 272, 5, 8)
        ctx.fillRect(carX + 15, 272, 5, 8)
      }
      ctx.restore()
      ctx.restore()
      text(ctx, 'PIXEL RACER', 12, 10, coral, 18)
      text(ctx, `HULL ${hull}/3`, 170, 12, cream, 18)
      text(ctx, `${Math.ceil(45 - ticks * step)}s`, 282, 10, gold, 20)
      text(ctx, `DIST ${Math.floor(distance)}`, 344, 12, lavender, 18)
      ctx.fillStyle = ink
      ctx.fillRect(0, roadBottom, 480, 44)
      text(ctx, '← → steer', 12, roadBottom + 3, cream, 16)
      text(ctx, '↓ brake', 190, roadBottom + 3, cream, 16)
      text(ctx, 'A boost', 364, roadBottom + 3, cream, 16)
      text(ctx, `SPEED ${Math.round(speed)}`, 12, height - 19, lavender, 15)
      text(ctx, 'BOOST', 268, height - 19, cyan, 15)
      ctx.fillStyle = '#303453'
      ctx.fillRect(329, height - 17, 138, 9)
      ctx.fillStyle = cyan
      ctx.fillRect(329, height - 17, Math.round(138 * battery), 9)
      ctx.restore()
    },
  }
}
