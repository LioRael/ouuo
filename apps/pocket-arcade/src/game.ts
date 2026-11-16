export type Control = 'up' | 'down' | 'left' | 'right' | 'a' | 'b'
export type GameId = 'rhythm' | 'racer' | 'puzzle'
export type GameResult = { title: string; score: number; detail: string }
export type GameHost = {
  tone: (frequency: number, duration?: number, delay?: number) => void
  finish: (result: GameResult) => void
}
export type Game = {
  update: (seconds: number, held: ReadonlySet<Control>, elapsed: number) => void
  press: (control: Control, elapsed: number) => void
  draw: (context: CanvasRenderingContext2D, elapsed: number) => void
  pause?: (elapsed: number) => void
}
export const SCREEN_WIDTH = 480
export const SCREEN_HEIGHT = 320
