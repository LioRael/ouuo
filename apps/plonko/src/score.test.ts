import { describe, expect, it } from 'vitest'
import { PerformanceScore, type Difficulty } from './score'

const notes = [
  { midi: 60, time: 2, duration: 0.4 },
  { midi: 64, time: 2.625, duration: 0.4 },
  { midi: 60, time: 3.25, duration: 0.8 },
]

describe('a performance of the score', () => {
  it('replays interrupted holds after pause without awarding or losing points', () => {
    const score = new PerformanceScore([
      { midi: 64, time: 1, duration: 0.2 },
      { midi: 60, time: 2, duration: 1, hold: true },
    ])
    score.hit(64, 1)
    score.hit(60, 2)
    expect(score.interrupt(2.5)).toBe(1.5)
    expect(score.result).toMatchObject({ points: 100, misses: 0 })
    expect(score.hit(60, 2)).toBe('perfect')
    score.advance(3, new Set([60]))
    expect(score.result).toMatchObject({ points: 200, hits: 2, misses: 0 })
    expect(score.interrupt(4)).toBe(4)
  })

  it('judges early and late notes, rejects wrong keys and never scores a note twice', () => {
    const score = new PerformanceScore(notes)
    expect(score.hit(64, 2)).toBe('wrong')
    expect(score.hit(60, 1.95)).toBe('perfect')
    expect(score.hit(60, 2.01)).toBe('wrong')
    expect(score.hit(64, 2.765)).toBe('good')
    expect(score.hit(60, 3.411)).toBe('wrong')
    score.expire(3.5)
    expect(score.result).toEqual({
      points: 170,
      hits: 2,
      misses: 1,
      combo: 0,
      bestCombo: 1,
      accuracy: 57,
    })
  })

  it('counts each missed note once and resets combo when the window closes', () => {
    const score = new PerformanceScore(notes)
    score.hit(60, 2)
    score.expire(2.784)
    expect(score.result.combo).toBe(1)
    score.expire(2.786)
    score.expire(3)
    expect(score.result).toMatchObject({
      hits: 1,
      misses: 1,
      combo: 0,
      bestCombo: 1,
    })
    expect(score.hit(60, 3.25)).toBe('perfect')
    expect(score.result.points).toBe(200)
  })

  it('chooses the closest unplayed occurrence of a repeated pitch', () => {
    const score = new PerformanceScore([
      { midi: 60, time: 1, duration: 0.1 },
      { midi: 60, time: 1.2, duration: 0.1 },
    ])
    expect(score.hit(60, 1.19)).toBe('perfect')
    expect(score.played.has(1)).toBe(true)
    expect(score.played.has(0)).toBe(false)
  })

  it.each([
    [-0.181, 'wrong'],
    [-0.18, 'good'],
    [-0.111, 'good'],
    [-0.11, 'great'],
    [-0.061, 'great'],
    [-0.06, 'perfect'],
    [0.07, 'perfect'],
    [0.071, 'great'],
    [0.12, 'great'],
    [0.121, 'good'],
    [0.16, 'good'],
    [0.161, 'wrong'],
  ] as const)(
    'judges the normal asymmetric boundary at %s seconds as %s',
    (offset, judgement) => {
      const score = new PerformanceScore([{ midi: 60, time: 2, duration: 0.2 }])
      expect(score.hit(60, 2 + offset)).toBe(judgement)
    },
  )

  it.each([
    ['easy', 0.2, 'good'],
    ['normal', 0.2, 'wrong'],
    ['hard', 0.11, 'wrong'],
  ] satisfies [Difficulty, number, string][])(
    'uses %s timing windows',
    (difficulty, offset, judgement) => {
      const score = new PerformanceScore(notes, difficulty)
      expect(score.hit(60, 2 + offset)).toBe(judgement)
    },
  )

  it('scores chord pitches independently and weights accuracy by points', () => {
    const score = new PerformanceScore([
      { midi: 60, time: 2, duration: 0.2 },
      { midi: 64, time: 2, duration: 0.2 },
      { midi: 67, time: 2, duration: 0.2 },
    ])
    expect(score.hit(60, 1.95)).toBe('perfect')
    expect(score.hit(64, 2.1)).toBe('great')
    expect(score.hit(67, 2.15)).toBe('good')
    expect(score.result).toEqual({
      points: 255,
      hits: 3,
      misses: 0,
      combo: 3,
      bestCombo: 3,
      accuracy: 85,
    })
  })

  it('marks a hold as started but awards nothing until completion', () => {
    const score = new PerformanceScore([
      { midi: 60, time: 2, duration: 1, hold: true },
    ])
    expect(score.hit(60, 2.1)).toBe('great')
    expect(score.played.has(0)).toBe(true)
    expect(score.result).toMatchObject({ points: 0, hits: 0, accuracy: 0 })
    score.advance(2.9, new Set([60]))
    expect(score.result.points).toBe(0)
    score.advance(3, new Set([60]))
    score.release(60, 3.1)
    score.advance(5, new Set())
    expect(score.result).toEqual({
      points: 85,
      hits: 1,
      misses: 0,
      combo: 1,
      bestCombo: 1,
      accuracy: 85,
    })
  })

  it('counts early hold release once as a miss and prevents retrying it', () => {
    const score = new PerformanceScore([
      { midi: 60, time: 2, duration: 1, hold: true },
    ])
    score.hit(60, 2)
    score.release(60, 2.999)
    score.release(60, 3)
    score.advance(4, new Set([60]))
    expect(score.hit(60, 4)).toBe('wrong')
    expect(score.result).toMatchObject({
      points: 0,
      hits: 0,
      misses: 1,
      combo: 0,
      accuracy: 0,
    })
  })

  it('completes a hold on an on-time release even between animation frames', () => {
    const score = new PerformanceScore([
      { midi: 60, time: 2, duration: 1, hold: true },
    ])
    score.hit(60, 2)
    score.advance(2.9, new Set([60]))
    score.release(60, 3)
    expect(score.result).toMatchObject({ points: 100, hits: 1, misses: 0 })
  })

  it('fails a hold when input disappears without a release callback', () => {
    const score = new PerformanceScore([
      { midi: 60, time: 2, duration: 1, hold: true },
    ])
    score.hit(60, 2)
    score.advance(2.5, new Set())
    score.advance(3, new Set([60]))
    expect(score.result).toMatchObject({ points: 0, hits: 0, misses: 1 })
  })

  it('expires unstarted holds and taps but never expires an active hold', () => {
    const score = new PerformanceScore([
      { midi: 60, time: 2, duration: 1, hold: true },
      { midi: 64, time: 2, duration: 1, hold: true },
      { midi: 67, time: 2, duration: 0.2 },
    ])
    score.hit(60, 2)
    score.expire(2.161)
    score.expire(2.5)
    expect(score.result.misses).toBe(2)
    score.advance(3, new Set([60]))
    expect(score.result).toMatchObject({
      hits: 1,
      points: 100,
      misses: 2,
      accuracy: 33,
    })
  })

  it('does not let repeated keydown consume a later note while a hold is active', () => {
    const score = new PerformanceScore([
      { midi: 60, time: 2, duration: 0.5, hold: true },
      { midi: 60, time: 2.6, duration: 0.1 },
    ])
    score.hit(60, 2)
    expect(score.hit(60, 2.45)).toBe('wrong')
    score.release(60, 2.5)
    expect(score.hit(60, 2.6)).toBe('perfect')
    expect(score.result).toMatchObject({ points: 200, hits: 2, misses: 0 })
  })

  it('resets combo on wrong input without inventing extra score notes', () => {
    const score = new PerformanceScore(notes)
    score.hit(60, 2)
    score.hit(72, 2.01)
    expect(score.result).toMatchObject({
      combo: 0,
      bestCombo: 1,
      misses: 0,
      accuracy: 33,
    })
  })
})
