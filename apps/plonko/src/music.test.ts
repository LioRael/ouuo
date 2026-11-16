import { describe, expect, it } from 'vitest'
import { keys, noteColor, notesFor, tracks } from './music'
import { PerformanceScore, type Difficulty } from './score'

describe('the original track library', () => {
  it('offers three distinct compositions, tempos and stable identifiers', () => {
    expect(tracks).toHaveLength(3)
    expect(new Set(tracks.map((track) => track.id)).size).toBe(3)
    expect(new Set(tracks.map((track) => track.bpm)).size).toBe(3)
    expect(
      new Set(tracks.map((track) => JSON.stringify(track.notes))).size,
    ).toBe(3)
  })

  it.each(['easy', 'normal', 'hard'] satisfies Difficulty[])(
    'provides playable %s charts with chords and holds',
    (difficulty) => {
      const playable = new Set<number>(keys.map((key) => key.midi))
      for (const track of tracks) {
        const notes = notesFor(track, difficulty)
        expect(notes.length).toBeGreaterThan(20)
        expect(notes.some((note) => note.hold)).toBe(true)
        expect(
          notes.some((note, index) => notes[index + 1]?.time === note.time),
        ).toBe(true)
        notes.forEach((note, index) => {
          expect(playable.has(note.midi)).toBe(true)
          expect(note.duration).toBeGreaterThan(0)
          expect(note.time).toBeGreaterThanOrEqual(2)
          expect(note.time + note.duration).toBeLessThan(track.duration)
          if (index > 0)
            expect(note.time).toBeGreaterThanOrEqual(notes[index - 1].time)
          const next = notes
            .slice(index + 1)
            .find((candidate) => candidate.midi === note.midi)
          if (next)
            expect(note.time + note.duration).toBeLessThanOrEqual(next.time)
        })
        const score = new PerformanceScore(notes, difficulty)
        const events = notes
          .flatMap((note) => [
            { time: note.time, midi: note.midi, release: false },
            { time: note.time + note.duration, midi: note.midi, release: true },
          ])
          .sort(
            (a, b) => a.time - b.time || Number(b.release) - Number(a.release),
          )
        for (const event of events) {
          if (event.release) score.release(event.midi, event.time)
          else expect(score.hit(event.midi, event.time)).toBe('perfect')
        }
        score.expire(track.duration)
        expect(score.result).toMatchObject({
          hits: notes.length,
          misses: 0,
          accuracy: 100,
        })
      }
    },
  )

  it('adds authored notes at each difficulty without mutating the base chart', () => {
    for (const track of tracks) {
      const easy = notesFor(track, 'easy')
      const normal = notesFor(track, 'normal')
      const hard = notesFor(track, 'hard')
      expect(easy.length).toBeLessThan(normal.length)
      expect(normal.length).toBeLessThan(hard.length)
      expect(easy.every((note) => normal.includes(note))).toBe(true)
      expect(normal.every((note) => hard.includes(note))).toBe(true)
      expect(hard).toEqual(track.notes)
    }
  })

  it('gives low, middle and high registers distinct consistent note colors', () => {
    expect(noteColor(60)).toBe(noteColor(63))
    expect(noteColor(64)).toBe(noteColor(67))
    expect(noteColor(68)).toBe(noteColor(72))
    expect(new Set([noteColor(60), noteColor(64), noteColor(72)]).size).toBe(3)
  })
})
