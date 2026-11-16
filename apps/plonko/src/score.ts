export interface ScoreNote {
  midi: number
  time: number
  duration: number
  hold?: boolean
}
export type Difficulty = 'easy' | 'normal' | 'hard'
export type Judgement = 'perfect' | 'great' | 'good' | 'wrong'

const windows = {
  easy: { perfect: [0.09, 0.1], great: [0.16, 0.17], good: [0.24, 0.22] },
  normal: { perfect: [0.06, 0.07], great: [0.11, 0.12], good: [0.18, 0.16] },
  hard: { perfect: [0.04, 0.045], great: [0.075, 0.08], good: [0.12, 0.1] },
} as const
const notePoints = { perfect: 100, great: 85, good: 70 } as const
// Audio-clock subtraction must not move an exact boundary outside its window.
const epsilon = 1e-9

export class PerformanceScore {
  readonly played = new Set<number>()
  private readonly missed = new Set<number>()
  private readonly activeHolds = new Map<number, number>()
  private hits = 0
  private points = 0
  private combo = 0
  private bestCombo = 0
  constructor(
    readonly notes: readonly ScoreNote[],
    readonly difficulty: Difficulty = 'normal',
  ) {}

  hit(midi: number, time: number): Judgement {
    this.expire(time)
    let closest = -1
    let distance = Infinity
    const timing = windows[this.difficulty]
    if (
      [...this.activeHolds.keys()].some(
        (index) => this.notes[index].midi === midi,
      )
    ) {
      this.combo = 0
      return 'wrong'
    }
    this.notes.forEach((note, index) => {
      const offset = time - note.time
      const delta = Math.abs(offset)
      if (
        note.midi === midi &&
        !this.played.has(index) &&
        !this.missed.has(index) &&
        offset >= -timing.good[0] - epsilon &&
        offset <= timing.good[1] + epsilon &&
        delta < distance
      ) {
        closest = index
        distance = delta
      }
    })
    if (closest < 0) {
      this.combo = 0
      return 'wrong'
    }
    this.played.add(closest)
    const note = this.notes[closest]
    const side = time < note.time ? 0 : 1
    const judgement =
      distance <= timing.perfect[side] + epsilon
        ? 'perfect'
        : distance <= timing.great[side] + epsilon
          ? 'great'
          : 'good'
    if (note.hold) this.activeHolds.set(closest, notePoints[judgement])
    else this.complete(notePoints[judgement])
    return judgement
  }

  release(midi: number, time: number): void {
    for (const [index, points] of this.activeHolds) {
      const note = this.notes[index]
      if (note.midi !== midi) continue
      this.activeHolds.delete(index)
      if (time + epsilon >= note.time + note.duration) this.complete(points)
      else this.miss(index)
    }
  }

  advance(time: number, held: ReadonlySet<number>): void {
    this.expire(time)
    for (const [index, points] of this.activeHolds) {
      const note = this.notes[index]
      if (!held.has(note.midi)) {
        this.activeHolds.delete(index)
        this.miss(index)
      } else if (time + epsilon >= note.time + note.duration) {
        this.activeHolds.delete(index)
        this.complete(points)
      }
    }
  }

  interrupt(time: number): number {
    let restart = time
    for (const index of this.activeHolds.keys()) {
      restart = Math.min(restart, Math.max(0, this.notes[index].time - 0.5))
      this.played.delete(index)
    }
    this.activeHolds.clear()
    return restart
  }

  private complete(points: number): void {
    this.points += points
    this.hits++
    this.combo++
    this.bestCombo = Math.max(this.bestCombo, this.combo)
  }

  private miss(index: number): void {
    this.missed.add(index)
    this.combo = 0
  }

  expire(time: number): void {
    this.notes.forEach((note, index) => {
      if (
        time - note.time > windows[this.difficulty].good[1] + epsilon &&
        !this.played.has(index) &&
        !this.missed.has(index)
      ) {
        this.miss(index)
      }
    })
  }

  get result() {
    return {
      points: this.points,
      hits: this.hits,
      misses: this.missed.size,
      combo: this.combo,
      bestCombo: this.bestCombo,
      accuracy: this.notes.length
        ? Math.round((this.points / (this.notes.length * 100)) * 100)
        : 0,
    }
  }
}
