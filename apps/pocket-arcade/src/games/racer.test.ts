import { describe, expect, it } from 'vitest'
import type { Control, Game } from '../game'
import { createRacer } from './racer'
import { harness, picture } from './test-helpers'

function drive(
  game: Game,
  seconds: number,
  step: number,
  controls: Control[] = [],
) {
  for (let time = step; time <= seconds + 1e-8; time += step) {
    game.update(step, new Set(controls), time)
  }
}

describe('Pixel Racer', () => {
  it('steers by time, not frame count, and clamps to the road', () => {
    const a = harness(createRacer).game
    const b = harness(createRacer).game
    drive(a, 0.5, 0.5, ['right'])
    drive(b, 0.5, 0.01, ['right'])
    const car = (game: Game) =>
      picture(game).rectangles.find((r) => r[2] === 24 && r[3] === 38)
    expect(car(a)?.[0]).toBeCloseTo(318)
    expect(car(a)).toEqual(car(b))
    drive(a, 2, 0.1, ['right'])
    expect(car(a)?.[0]).toBe(336)
  })

  it('brakes and boosts through held controls', () => {
    const distance = (controls: Control[]) => {
      const { game } = harness(createRacer)
      drive(game, 2, 0.01, controls)
      return Number(
        picture(game)
          .texts.find((text) => text.startsWith('DIST '))
          ?.slice(5),
      )
    }
    expect(distance(['down'])).toBeLessThan(distance([]))
    expect(distance(['a'])).toBeGreaterThan(distance([]))
    expect(distance(['a', 'down'])).toBe(distance(['down']))
  })

  it('detects swept collisions even in a long frame and finishes once', () => {
    const coarse = harness(createRacer)
    const fine = harness(createRacer)
    drive(coarse.game, 45, 45)
    drive(fine.game, 45, 0.01)
    expect(coarse.results).toHaveLength(1)
    expect(coarse.results).toEqual(fine.results)
    expect(coarse.results[0].title).toBe('Out of road')
    expect(coarse.results[0].score).toBeGreaterThan(0)
    coarse.game.update(10, new Set(), 55)
    expect(coarse.results).toHaveLength(1)
  })

  it('damages the hull only once while crossing an obstacle', () => {
    const { game, tones } = harness(createRacer)
    game.update(4.1, new Set(), 4.1)
    expect(picture(game).texts).toContain('HULL 2/3')
    game.update(0.1, new Set(), 4.2)
    expect(picture(game).texts).toContain('HULL 2/3')
    expect(tones).toHaveLength(1)
  })

  it('finishes a surviving 45-second run and recreates a fresh car', () => {
    const { game, results } = harness(createRacer)
    drive(game, 45, 0.1, ['left'])
    expect(results).toHaveLength(1)
    expect(results[0].title).toBe('Coast complete')
    expect(picture(harness(createRacer).game).texts).toContain('HULL 3/3')
  })
})
