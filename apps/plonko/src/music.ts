import type { Difficulty, ScoreNote } from './score'

export type { Difficulty } from './score'

export const keys = [
  { midi: 60, name: 'C4', binding: 'a', black: false, position: 0 },
  { midi: 61, name: 'C♯4', binding: 'w', black: true, position: 1 },
  { midi: 62, name: 'D4', binding: 's', black: false, position: 1 },
  { midi: 63, name: 'D♯4', binding: 'e', black: true, position: 2 },
  { midi: 64, name: 'E4', binding: 'd', black: false, position: 2 },
  { midi: 65, name: 'F4', binding: 'f', black: false, position: 3 },
  { midi: 66, name: 'F♯4', binding: 't', black: true, position: 4 },
  { midi: 67, name: 'G4', binding: 'g', black: false, position: 4 },
  { midi: 68, name: 'G♯4', binding: 'y', black: true, position: 5 },
  { midi: 69, name: 'A4', binding: 'h', black: false, position: 5 },
  { midi: 70, name: 'A♯4', binding: 'u', black: true, position: 6 },
  { midi: 71, name: 'B4', binding: 'j', black: false, position: 6 },
  { midi: 72, name: 'C5', binding: 'k', black: false, position: 7 },
] as const

// Register colors connect each falling note to its key, including black keys.
export function noteColor(midi: number): string {
  return midi < 64 ? '#65dce8' : midi < 68 ? '#b29aff' : '#f2c078'
}

type PhraseEvent = readonly [
  beat: number,
  pitches: readonly number[],
  length: number,
  level: 0 | 1 | 2,
  hold?: boolean,
]
interface ArrangedNote extends ScoreNote {
  level: number
}
const difficultyLevel = { easy: 0, normal: 1, hard: 2 } as const

// Original phrases composed for this instrument. Lengths are in quarter-note beats;
// the level marks melody, accompaniment and ornamental notes, not random thinning.
const firstLight: readonly (readonly PhraseEvent[])[] = [
  [
    [0, [60, 67], 1.5, 0, true],
    [1, [64], 0.35, 1],
    [1.5, [65], 0.3, 2],
    [2, [64], 0.65, 0],
    [3, [67], 0.65, 0],
    [3.5, [71], 0.3, 2],
    [4, [69], 1.5, 0, true],
    [4, [65], 0.6, 1],
    [5.5, [67], 0.3, 2],
    [6, [64], 0.65, 0],
    [7, [62], 0.65, 0],
  ],
  [
    [0, [62, 69], 1.5, 0, true],
    [1, [65], 0.35, 1],
    [1.5, [67], 0.3, 2],
    [2, [65], 0.65, 0],
    [3, [69], 0.65, 0],
    [3.5, [71], 0.3, 2],
    [4, [72], 1.5, 0, true],
    [4, [64], 0.6, 1],
    [5.5, [71], 0.3, 2],
    [6, [67], 0.65, 0],
    [7, [64], 0.65, 0],
  ],
  [
    [0, [60, 64], 1.5, 0, true],
    [1, [67], 0.35, 1],
    [1.5, [69], 0.3, 2],
    [2, [72], 0.65, 0],
    [3, [71], 0.65, 0],
    [3.5, [69], 0.3, 2],
    [4, [67], 1.5, 0, true],
    [4, [62], 0.6, 1],
    [5.5, [65], 0.3, 2],
    [6, [64], 0.65, 0],
    [7, [62], 0.65, 0],
  ],
  [
    [0, [65, 69], 1.5, 0, true],
    [1, [60], 0.35, 1],
    [1.5, [62], 0.3, 2],
    [2, [64], 0.65, 0],
    [3, [67], 0.65, 0],
    [3.5, [71], 0.3, 2],
    [4, [60, 72], 3, 0, true],
    [5, [64], 0.6, 1],
    [5.5, [67], 0.3, 2],
    [6, [64], 0.65, 0],
    [7, [67], 0.65, 0],
  ],
]

const violetCurrent: readonly (readonly PhraseEvent[])[] = [
  [
    [0, [61, 68], 0.65, 0],
    [0.5, [63], 0.3, 2],
    [1, [64], 0.65, 0],
    [1.5, [66], 0.3, 1],
    [2, [68], 0.65, 0],
    [2.5, [71], 0.3, 2],
    [3, [66], 1.5, 0, true],
    [3, [61], 0.6, 1],
    [4.5, [64], 0.3, 1],
    [5, [63], 0.65, 0],
    [5.5, [64], 0.3, 2],
  ],
  [
    [0, [64, 71], 0.65, 0],
    [0.5, [66], 0.3, 2],
    [1, [68], 0.65, 0],
    [1.5, [70], 0.3, 1],
    [2, [71], 0.65, 0],
    [2.5, [68], 0.3, 2],
    [3, [63], 1.5, 0, true],
    [3, [66], 0.6, 1],
    [4.5, [64], 0.3, 1],
    [5, [61], 0.65, 0],
    [5.5, [63], 0.3, 2],
  ],
  [
    [0, [63, 70], 0.65, 0],
    [0.5, [64], 0.3, 2],
    [1, [66], 0.65, 0],
    [1.5, [68], 0.3, 1],
    [2, [70], 0.65, 0],
    [2.5, [71], 0.3, 2],
    [3, [68], 1.5, 0, true],
    [3, [64], 0.6, 1],
    [4.5, [66], 0.3, 1],
    [5, [63], 0.65, 0],
    [5.5, [61], 0.3, 2],
  ],
  [
    [0, [61, 68], 0.65, 0],
    [0.5, [64], 0.3, 2],
    [1, [66], 0.65, 0],
    [1.5, [71], 0.3, 1],
    [2, [68], 0.65, 0],
    [2.5, [66], 0.3, 2],
    [3, [61, 64], 2.5, 0, true],
    [3, [68], 0.6, 1],
    [4.5, [71], 0.3, 1],
    [5, [68], 0.65, 0],
    [5.5, [66], 0.3, 2],
  ],
]

const afterglow: readonly (readonly PhraseEvent[])[] = [
  [
    [0, [60, 65], 2.5, 0, true],
    [1, [69], 0.65, 1],
    [1.5, [72], 0.3, 2],
    [3, [67], 0.65, 0],
    [3.5, [69], 0.3, 2],
    [4, [64], 1.5, 0, true],
    [4, [60], 0.6, 1],
    [5.5, [65], 0.3, 2],
    [6, [62], 0.65, 0],
    [7, [64], 0.65, 0],
  ],
  [
    [0, [62, 69], 2.5, 0, true],
    [1, [65], 0.65, 1],
    [1.5, [67], 0.3, 2],
    [3, [72], 0.65, 0],
    [3.5, [71], 0.3, 2],
    [4, [67], 1.5, 0, true],
    [4, [64], 0.6, 1],
    [5.5, [69], 0.3, 2],
    [6, [65], 0.65, 0],
    [7, [64], 0.65, 0],
  ],
  [
    [0, [64, 71], 2.5, 0, true],
    [1, [67], 0.65, 1],
    [1.5, [69], 0.3, 2],
    [3, [72], 0.65, 0],
    [3.5, [69], 0.3, 2],
    [4, [65], 1.5, 0, true],
    [4, [60], 0.6, 1],
    [5.5, [67], 0.3, 2],
    [6, [64], 0.65, 0],
    [7, [62], 0.65, 0],
  ],
  [
    [0, [60, 67], 2.5, 0, true],
    [1, [64], 0.65, 1],
    [1.5, [65], 0.3, 2],
    [3, [69], 0.65, 0],
    [3.5, [71], 0.3, 2],
    [4, [60, 72], 3.5, 0, true],
    [4, [64], 0.6, 1],
    [5.5, [67], 0.3, 2],
    [6, [65], 0.65, 0],
    [7, [64], 0.65, 0],
  ],
]

function composeTrack(
  id: string,
  title: string,
  description: string,
  bpm: number,
  phraseLength: number,
  phrases: readonly (readonly PhraseEvent[])[],
) {
  const beat = 60 / bpm
  const notes: readonly ArrangedNote[] = phrases
    .flatMap((phrase, phraseIndex) =>
      phrase.flatMap(([offset, pitches, length, level, hold]) =>
        pitches.map((midi) => ({
          midi,
          time: 2 + (phraseIndex * phraseLength + offset) * beat,
          duration: length * beat,
          level,
          hold: hold ?? false,
        })),
      ),
    )
    .sort((a, b) => a.time - b.time || a.midi - b.midi)
  return {
    id,
    title,
    description,
    bpm,
    notes,
    duration: 2 + phrases.length * phraseLength * beat + 2,
  }
}

export const tracks = [
  composeTrack(
    'first-light',
    'First Light',
    'Open fifths, a rising melody and a bright landing.',
    96,
    8,
    firstLight,
  ),
  composeTrack(
    'violet-current',
    'Violet Current',
    'A quick six-beat pulse winding through the black keys.',
    112,
    6,
    violetCurrent,
  ),
  composeTrack(
    'afterglow',
    'Afterglow',
    'Slow suspended chords with room to let each note ring.',
    84,
    8,
    afterglow,
  ),
] as const

export function notesFor(
  track: (typeof tracks)[number],
  difficulty: Difficulty,
): readonly ScoreNote[] {
  return track.notes.filter((note) => note.level <= difficultyLevel[difficulty])
}

export const bpm = tracks[0].bpm
export const beat = 60 / bpm
export const song: readonly ScoreNote[] = notesFor(tracks[0], 'normal')
export const songDuration = tracks[0].duration
