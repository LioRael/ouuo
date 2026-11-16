import { describe, expect, it } from 'vitest'
import type { Game } from '../game'
import { createPuzzle } from './puzzle'
import { harness, picture } from './test-helpers'

function moveTo(game: Game, from: number, to: number) {
  const row = Math.floor(from / 3)
  const column = from % 3
  for (let i = row; i < Math.floor(to / 3); i++) game.press('down', 0)
  for (let i = row; i > Math.floor(to / 3); i--) game.press('up', 0)
  for (let i = column; i < to % 3; i++) game.press('right', 0)
  for (let i = column; i > to % 3; i--) game.press('left', 0)
}

describe('Mini Puzzle', () => {
  it('only toggles on A, bounds cursor movement, and undoes accepted moves', () => {
    const { game } = harness(createPuzzle)
    const start = picture(game).texts
    const litTiles = () =>
      picture(game)
        .rectangles.filter((rect) => rect[2] === 40 && rect[3] === 4)
        .map(([x, y]) => (x - 36) / 72 + ((y - 111) / 64) * 3)
    expect(litTiles()).toEqual([0, 2, 6, 8])
    game.press('left', 0)
    game.press('up', 0)
    game.press('b', 0)
    expect(picture(game).texts).toEqual(start)
    game.press('a', 0)
    expect(picture(game).texts).toContain('MOVES 1')
    expect(picture(game).texts).toContain('LIT 5/9')
    expect(litTiles()).toEqual([1, 2, 3, 6, 8])
    game.press('b', 0)
    expect(picture(game).texts).toEqual(start)
    expect(litTiles()).toEqual([0, 2, 6, 8])
  })

  it('solves three authored boards with orthogonal toggles and explicit progression', () => {
    const { game, results } = harness(createPuzzle)
    const solutions = [[4], [0, 8], [1, 3, 5, 7]]
    for (let level = 0; level < solutions.length; level++) {
      let cursor = 0
      for (const tile of solutions[level]) {
        moveTo(game, cursor, tile)
        game.press('a', 0)
        cursor = tile
      }
      expect(picture(game).texts).toContain('LIT 9/9')
      expect(results).toHaveLength(level === 2 ? 1 : 0)
      if (level < 2) {
        game.update(2, new Set(), 2)
        expect(picture(game).texts).toContain('LIT 9/9')
        game.press('a', 2)
        expect(picture(game).texts).toContain(`LEVEL ${level + 2}/3`)
      }
    }
    expect(results[0].score).toBe(930)
    game.press('a', 10)
    expect(results).toHaveLength(1)
    expect(picture(harness(createPuzzle).game).texts).toContain('LEVEL 1/3')
  })

  it('B reopens a solved intermediate board instead of advancing it', () => {
    const { game } = harness(createPuzzle)
    moveTo(game, 0, 4)
    game.press('a', 0)
    game.press('b', 0)
    expect(picture(game).texts).toContain('MOVES 0')
    expect(picture(game).texts).toContain('LIT 4/9')
    game.press('a', 0)
    expect(picture(game).texts).toContain('LIT 9/9')
  })
})
