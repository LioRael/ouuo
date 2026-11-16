import type { Game, GameHost } from '../game'
import { clear, coral, cream, gold, ink, lavender, text } from './art'

const scrambles = [[4], [0, 8], [1, 3, 5, 7]]

function toggle(board: boolean[], tile: number) {
  const row = Math.floor(tile / 3)
  const column = tile % 3
  for (let index = 0; index < 9; index++) {
    if (
      Math.abs(Math.floor(index / 3) - row) + Math.abs((index % 3) - column) <=
      1
    ) {
      board[index] = !board[index]
    }
  }
}

function boardFor(level: number) {
  const board = Array.from({ length: 9 }, () => true)
  // Toggle is its own inverse: these authored scrambles are also valid solutions.
  for (const tile of scrambles[level]) toggle(board, tile)
  return board
}

export function createPuzzle(host: GameHost): Game {
  let level = 0
  let board = boardFor(level)
  let cursor = 0
  let completedMoves = 0
  let done = false
  const history: boolean[][] = []

  return {
    update() {},
    press(control) {
      if (done) return
      if (control === 'b') {
        const previous = history.pop()
        if (previous) {
          board = previous
          host.tone(196, 0.06)
        }
        return
      }
      if (control === 'a') {
        if (board.every(Boolean)) {
          completedMoves += history.length
          level++
          board = boardFor(level)
          cursor = 0
          history.length = 0
          host.tone(523.25, 0.09)
          return
        }
        history.push([...board])
        toggle(board, cursor)
        host.tone(261.63 + board.filter(Boolean).length * 29.1, 0.08)
        if (board.every(Boolean)) {
          host.tone(659.25, 0.1, 0.1)
          host.tone(783.99, 0.15, 0.22)
          if (level === scrambles.length - 1) {
            done = true
            const moves = completedMoves + history.length
            host.finish({
              title: 'Every window glowing',
              score: Math.max(0, 1000 - moves * 10),
              detail: `3 neighborhoods lit · ${moves} moves · 7-move best route`,
            })
          }
        }
        return
      }
      const row = Math.floor(cursor / 3)
      const column = cursor % 3
      if (control === 'left' && column > 0) cursor--
      if (control === 'right' && column < 2) cursor++
      if (control === 'up' && row > 0) cursor -= 3
      if (control === 'down' && row < 2) cursor += 3
    },
    draw(ctx) {
      ctx.save()
      clear(ctx)
      text(ctx, 'MINI PUZZLE', 18, 12, coral, 18)
      text(ctx, 'NIGHT LIGHTS', 280, 17, lavender, 12)
      text(ctx, `LEVEL ${level + 1}/3`, 24, 52, lavender)
      text(ctx, `MOVES ${history.length}`, 280, 53)
      ctx.fillStyle = '#303453'
      ctx.fillRect(16, 78, 224, 202)
      for (let index = 0; index < 9; index++) {
        const x = 24 + (index % 3) * 72
        const y = 86 + Math.floor(index / 3) * 64
        ctx.fillStyle = lavender
        ctx.fillRect(x, y, 64, 56)
        ctx.fillStyle = ink
        ctx.fillRect(x + 4, y + 4, 56, 48)
        ctx.fillStyle = board[index] ? gold : '#303453'
        ctx.fillRect(x + 12, y + 10, 40, 34)
        if (board[index]) {
          ctx.fillStyle = ink
          ctx.fillRect(x + 30, y + 10, 4, 34)
          ctx.fillRect(x + 12, y + 25, 40, 4)
        } else {
          ctx.strokeStyle = lavender
          ctx.lineWidth = 2
          ctx.strokeRect(x + 20, y + 17, 24, 20)
          ctx.beginPath()
          ctx.moveTo(x + 22, y + 35)
          ctx.lineTo(x + 42, y + 19)
          ctx.stroke()
        }
        if (index === cursor) {
          ctx.strokeStyle = cream
          ctx.lineWidth = 3
          ctx.strokeRect(x - 3, y - 3, 70, 62)
          ctx.fillStyle = coral
          ctx.fillRect(x + 28, y + 48, 8, 5)
        }
      }
      text(ctx, `LIT ${board.filter(Boolean).length}/9`, 280, 83, gold, 16)
      text(ctx, 'D-PAD: move cursor', 280, 118, cream, 11)
      text(ctx, 'A: flip a window', 280, 140, cream, 11)
      text(ctx, 'and its neighbors', 280, 157, cream, 11)
      text(ctx, '(up/down/left/right)', 280, 174, lavender, 10)
      text(ctx, 'B: undo one move', 280, 204, cream, 11)
      text(ctx, 'Light every window.', 280, 239, gold, 11)
      text(ctx, 'No timer. Take a look.', 280, 256, lavender, 10)
      text(
        ctx,
        board.every(Boolean)
          ? 'ALL LIT!  A: next level  B: undo'
          : 'Filled cross = lit    Slashed box = dark',
        24,
        296,
        board.every(Boolean) ? gold : cream,
        11,
      )
      ctx.restore()
    },
  }
}
