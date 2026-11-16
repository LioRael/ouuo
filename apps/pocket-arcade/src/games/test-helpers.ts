import type { Game, GameHost } from '../game'

export function harness(create: (host: GameHost) => Game) {
  const results: Parameters<GameHost['finish']>[0][] = []
  const tones: { frequency: number; duration: number; delay: number }[] = []
  const game = create({
    finish: (result) => results.push(result),
    tone: (frequency, duration = 0.1, delay = 0) =>
      tones.push({ frequency, duration, delay }),
  })
  return { game, results, tones }
}

export function picture(game: Game, elapsed = 0) {
  const texts: string[] = []
  const rectangles: number[][] = []
  const context = new Proxy({} as CanvasRenderingContext2D, {
    get: (_target, key) => {
      if (key === 'canvas') return { width: 480, height: 320 }
      if (key === 'fillText') return (text: string) => texts.push(text)
      if (key === 'fillRect')
        return (...values: number[]) => rectangles.push(values)
      return () => undefined
    },
    set: () => true,
  })
  game.draw(context, elapsed)
  return { texts, rectangles }
}
