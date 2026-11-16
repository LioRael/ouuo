import { afterEach, describe, expect, it, vi } from 'vitest'
import { PianoAudio, planPianoTone } from './piano'

afterEach(() => vi.unstubAllGlobals())

describe('piano synthesis contract', () => {
  const context = { sampleRate: 48_000 }

  it('tunes A4 to 440 Hz with a gently detuned fundamental pair', () => {
    const partials = planPianoTone(context, 69, 1)
    const fundamentals = partials.filter((partial) => partial.frequency === 440)
    expect(fundamentals).toHaveLength(2)
    expect(fundamentals[0].detune).toBeLessThan(0)
    expect(fundamentals[1].detune).toBeGreaterThan(0)
    expect(partials.every((partial) => Math.abs(partial.detune) < 4)).toBe(true)
    expect(planPianoTone(context, 81, 1)[0].frequency).toBe(880)
  })

  it('gives bright harmonics shorter decay than the fundamental', () => {
    const partials = planPianoTone(context, 60, 1)
    expect(partials.length).toBeGreaterThanOrEqual(4)
    expect(partials.at(-1)!.decaySeconds).toBeLessThan(partials[0].decaySeconds)
    expect(partials.at(-1)!.peakGain).toBeLessThan(partials[0].peakGain)
    expect(planPianoTone(context, 36, 1)[0].decaySeconds).toBeGreaterThan(
      planPianoTone(context, 84, 1)[0].decaySeconds,
    )
  })

  it('reserves headroom and makes softer strikes quieter and less bright', () => {
    const loud = planPianoTone(context, 60, 1)
    const soft = planPianoTone(context, 60, 0.3)
    const sum = loud.reduce((total, partial) => total + partial.peakGain, 0)
    expect(sum).toBeCloseTo(0.22, 12)
    expect(sum * 24 * 0.16).toBeLessThan(1)
    expect(soft[0].peakGain).toBeLessThan(loud[0].peakGain)
    expect(soft.at(-1)!.peakGain / soft[0].peakGain).toBeLessThan(
      loud.at(-1)!.peakGain / loud[0].peakGain,
    )
  })

  it('omits partials above Nyquist even at low device sample rates', () => {
    const partials = planPianoTone({ sampleRate: 22_050 }, 120, 1)
    expect(partials.length).toBeGreaterThan(0)
    expect(
      partials.every(
        (partial) => partial.frequency * 2 ** (partial.detune / 1200) < 11_025,
      ),
    ).toBe(true)
  })

  it('ignores invalid MIDI and silent or invalid velocity', () => {
    for (const midi of [-1, 128, 60.5, NaN, Infinity]) {
      expect(planPianoTone(context, midi, 1)).toEqual([])
    }
    for (const velocity of [0, -1, NaN, Infinity]) {
      expect(planPianoTone(context, 60, velocity)).toEqual([])
    }
    expect(planPianoTone(context, 60, 2)).toEqual(planPianoTone(context, 60, 1))
  })
})

describe('PianoAudio lifecycle without a browser audio device', () => {
  it('does not create a context or queue notes before an explicit unlock', () => {
    const constructor = vi.fn(() => {
      throw new Error('Audio must not start implicitly')
    })
    vi.stubGlobal('AudioContext', constructor)
    const piano = new PianoAudio()
    piano.setVolume(0.4)
    piano.setSustain(true)
    piano.noteOn(60)
    piano.noteOff(60)
    piano.scheduleNote(64, 1, 0.5)
    piano.releaseAll()
    expect(piano.context).toBeNull()
    expect(piano.currentTime).toBe(0)
    expect(piano.contextState).toBe('locked')
    expect(constructor).not.toHaveBeenCalled()
    piano.dispose()
  })

  it('rejects unavailable audio rather than pretending to unlock', async () => {
    vi.stubGlobal('AudioContext', undefined)
    const piano = new PianoAudio()
    await expect(piano.unlock()).rejects.toThrow(/Web Audio/)
    expect(piano.context).toBeNull()
  })

  it('preserves browser construction failures for the caller', async () => {
    const failure = new Error('Audio device unavailable')
    vi.stubGlobal(
      'AudioContext',
      class {
        constructor() {
          throw failure
        }
      },
    )
    await expect(new PianoAudio().unlock()).rejects.toBe(failure)
  })

  it('disposal is permanent, idempotent, and safe before unlock', async () => {
    const piano = new PianoAudio()
    piano.dispose()
    piano.dispose()
    piano.noteOn(60)
    piano.noteOff(60)
    piano.scheduleNote(60, 0, 1)
    piano.releaseAll()
    expect(piano.contextState).toBe('closed')
    await expect(piano.unlock()).rejects.toThrow(/disposed/)
  })
})
