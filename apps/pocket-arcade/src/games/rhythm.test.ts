import { describe, expect, it } from 'vitest'
import type { Control } from '../game'
import { createRhythm } from './rhythm'
import { harness, picture } from './test-helpers'

const phrase: Control[] = [
  'left',
  'down',
  'a',
  'down',
  'left',
  'a',
  'down',
  'a',
]

describe('Rhythm Rush', () => {
  it.each([
    [1.849, 0],
    [1.85, 60],
    [1.939, 60],
    [1.94, 100],
    [2.06, 100],
    [2.061, 60],
    [2.15, 60],
    [2.151, 0],
  ])('judges the first note at %s seconds as %s points', (time, score) => {
    const { game, results } = harness(createRhythm)
    game.press('left', time)
    game.update(20, new Set(), 20)
    expect(results).toHaveLength(1)
    expect(results[0].score).toBe(score)
  })

  it('rejects wrong lanes and consumes a hit only once', () => {
    const { game } = harness(createRhythm)
    game.press('down', 2)
    expect(picture(game).texts).toContain('SCORE 0')
    game.press('left', 2)
    game.press('left', 2)
    expect(picture(game).texts).toContain('SCORE 100')
    expect(picture(game).texts).toContain('COMBO 1')
  })

  it('expires every missed note during an irregular frame and resets combo', () => {
    const { game } = harness(createRhythm)
    game.press('left', 2)
    game.update(4, new Set(), 4)
    expect(picture(game).texts).toContain('COMBO 0')
    expect(picture(game).texts).toContain('MISSES 3')
    game.press('down', 2.5)
    expect(picture(game).texts).toContain('SCORE 100')
  })

  it('misses an unattended full run and cannot score expired notes afterward', () => {
    const { game, results } = harness(createRhythm)
    game.update(19, new Set(), 19)
    game.press('left', 2)
    expect(results).toHaveLength(1)
    expect(results[0].score).toBe(0)
    expect(results[0].detail).toContain('32 missed')
  })

  it('keeps a pending hit available while active elapsed is frozen', () => {
    const { game } = harness(createRhythm)
    game.update(1.9, new Set(), 1.9)
    for (let i = 0; i < 100; i++) game.update(0, new Set(), 1.9)
    expect(picture(game).texts).toContain('MISSES 0')
    game.press('left', 2)
    expect(picture(game).texts).toContain('SCORE 100')
  })

  it('requeues cancelled look-ahead tones on resume without replaying earlier music', () => {
    const { game, tones } = harness(createRhythm)
    game.update(1.9, new Set(), 1.9)
    expect(tones).toHaveLength(2)
    tones.length = 0
    game.pause?.(1.95)
    game.update(0, new Set(), 1.95)
    expect(tones).toHaveLength(2)
    expect(tones[0].frequency).toBe(523.25)
    expect(tones[0].delay).toBeCloseTo(0.05)
    game.update(0.05, new Set(), 2)
    expect(tones).toHaveLength(2)
    tones.length = 0
    game.pause?.(2.2)
    game.update(0, new Set(), 2.2)
    expect(tones).toHaveLength(0)
    game.update(0.2, new Set(), 2.4)
    expect(tones).toHaveLength(1)
    expect(tones[0].frequency).toBe(587.33)
    expect(tones[0].delay).toBeCloseTo(0.1)
  })

  it('completes an original 32-note run, then ignores further input', () => {
    const { game, results } = harness(createRhythm)
    for (let i = 0; i < 32; i++) {
      const time = 2 + i * 0.5
      game.update(0.5, new Set(), time)
      game.press(phrase[i % 8], time)
    }
    game.update(1, new Set(), 19)
    expect(results).toHaveLength(1)
    expect(results[0].score).toBe(3200)
    expect(results[0].detail).toContain('32/32')
    game.press('a', 20)
    game.update(10, new Set(), 30)
    expect(results).toHaveLength(1)
    expect(picture(harness(createRhythm).game).texts).toContain('SCORE 0')
  })

  it('schedules each tune event once ahead, skips stale audio and freezes at the same elapsed', () => {
    const { game, tones } = harness(createRhythm)
    game.update(1.9, new Set(), 1.9)
    expect(tones.length).toBeGreaterThan(0)
    expect(tones[0].delay).toBeCloseTo(0.1)
    const count = tones.length
    game.update(0, new Set(), 1.9)
    expect(tones).toHaveLength(count)
    game.update(0.6, new Set(), 2.5)
    expect(
      tones.every((tone) => tone.delay >= 0 && tone.delay <= 0.12 + 1e-9),
    ).toBe(true)
    expect(
      tones.filter((tone) => tone.frequency === tones[0].frequency),
    ).toHaveLength(1)
  })
})
