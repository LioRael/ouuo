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
      const height = ctx.canvas.height
      const tall = height >= 440
      text(ctx, 'MINI PUZZLE', 18, 12, coral, 20)
      text(ctx, 'NIGHT LIGHTS', 280, 17, lavender, 14)
      text(ctx, `LEVEL ${level + 1}/3`, 24, 52, lavender, 20)
      text(ctx, `MOVES ${history.length}`, 280, 52, cream, 20)
      ctx.save()
      if (tall) {
        ctx.translate(48, -43 + Math.max(0, Math.floor((height - 454) / 2)))
        ctx.scale(1.5, 1.5)
      }
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
      ctx.restore()
      text(
        ctx,
        `LIT ${board.filter(Boolean).length}/9`,
        tall ? 24 : 280,
        tall ? height - 64 : 83,
        gold,
        20,
      )
      if (tall) {
        text(ctx, 'A flip + neighbors', 196, height - 62, cream, 18)
      } else {
        text(ctx, 'D-pad move', 280, 125, cream, 18)
        text(ctx, 'A flip', 280, 164, cream, 18)
        text(ctx, '+ neighbors', 280, 189, lavender, 16)
        text(ctx, 'B undo', 280, 227, cream, 18)
        text(ctx, 'Light them all.', 280, 258, gold, 16)
      }
      text(
        ctx,
        board.every(Boolean)
          ? 'ALL LIT!  A next · B undo'
          : tall
            ? 'D-pad move · B undo'
            : 'Cross = lit · Slash = dark',
        24,
        height - (tall ? 32 : 24),
        board.every(Boolean) ? gold : cream,
        tall ? 18 : 16,
      )
      ctx.restore()
    },
  }
}
