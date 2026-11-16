export interface PianoPartial {
  readonly frequency: number
  readonly detune: number
  readonly peakGain: number
  readonly decaySeconds: number
}

/** The same sample-rate-aware recipe drives live voices and offline validation. */
export function planPianoTone(
  context: Pick<BaseAudioContext, 'sampleRate'>,
  midi: number,
  velocity = 0.75,
): readonly PianoPartial[] {
  if (
    !Number.isInteger(midi) ||
    midi < 0 ||
    midi > 127 ||
    !Number.isFinite(velocity) ||
    velocity <= 0
  ) {
    return []
  }

  const frequency = 440 * 2 ** ((midi - 69) / 12)
  const strength = Math.min(1, velocity)
  const decay = Math.min(10, Math.max(1.4, 5.6 * (220 / frequency) ** 0.28))
  const harmonics = [
    { ratio: 1, detune: -1.3, weight: 0.45 },
    { ratio: 1, detune: 1.3, weight: 0.28 },
    { ratio: 2.0006, detune: 0.7, weight: 0.16 },
    { ratio: 3.0018, detune: -0.6, weight: 0.075 },
    { ratio: 4.004, detune: 0.4, weight: 0.035 },
  ]

  return harmonics
    .filter(
      ({ ratio, detune }) =>
        frequency * ratio * 2 ** (detune / 1200) < context.sampleRate * 0.48,
    )
    .map(({ ratio, detune, weight }) => ({
      frequency: frequency * ratio,
      detune,
      peakGain:
        0.22 * weight * strength ** 1.4 * strength ** ((ratio - 1) * 0.18),
      decaySeconds: decay / (1 + (ratio - 1) * 0.65),
    }))
}

export interface PianoVoice {
  readonly startedAt: number
  readonly endsAt: number
  onended: (() => void) | null
  release(when?: number): void
  cancel(): void
}

/** Schedule a sample-free voice on either a real-time or offline Web Audio graph. */
export function createPianoVoice(
  context: BaseAudioContext,
  destination: AudioNode,
  midi: number,
  velocity = 0.75,
  when = context.currentTime,
): PianoVoice | null {
  const partials = planPianoTone(context, midi, velocity)
  if (partials.length === 0 || !Number.isFinite(when)) return null

  const start = Math.max(context.currentTime, when)
  const output = context.createGain()
  const sources: {
    oscillator: OscillatorNode
    envelope: GainNode
    end: number
  }[] = []
  let end = start + Math.max(...partials.map((partial) => partial.decaySeconds))
  let finished = false
  let remaining = partials.length
  output.gain.setValueAtTime(1, start)
  output.connect(destination)

  const cleanup = () => {
    if (finished) return
    finished = true
    for (const { oscillator, envelope } of sources) {
      oscillator.onended = null
      oscillator.disconnect()
      envelope.disconnect()
    }
    output.disconnect()
    voice.onended?.()
  }

  const voice: PianoVoice = {
    startedAt: start,
    get endsAt() {
      return end
    },
    onended: null,
    release(at = context.currentTime) {
      if (finished || !Number.isFinite(at)) return
      const releaseAt = Math.max(start, context.currentTime, at)
      const stopAt = releaseAt + 0.18
      if (stopAt >= end) return
      end = stopAt
      output.gain.cancelScheduledValues(releaseAt)
      output.gain.setValueAtTime(1, releaseAt)
      output.gain.linearRampToValueAtTime(0, stopAt)
      for (const source of sources) {
        source.oscillator.stop(Math.min(source.end, stopAt))
      }
    },
    cancel() {
      if (finished) return
      // Disconnect immediately, including voices whose start time is still in the future.
      for (const { oscillator } of sources) oscillator.stop(context.currentTime)
      end = context.currentTime
      cleanup()
    },
  }

  try {
    for (const partial of partials) {
      const oscillator = context.createOscillator()
      const envelope = context.createGain()
      const partialEnd = start + partial.decaySeconds
      sources.push({ oscillator, envelope, end: partialEnd })
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(partial.frequency, start)
      oscillator.detune.setValueAtTime(partial.detune, start)
      envelope.gain.setValueAtTime(0, start)
      envelope.gain.linearRampToValueAtTime(partial.peakGain, start + 0.006)
      envelope.gain.exponentialRampToValueAtTime(
        Math.max(1e-8, partial.peakGain * 0.0001),
        partialEnd - 0.012,
      )
      envelope.gain.linearRampToValueAtTime(0, partialEnd)
      oscillator.connect(envelope)
      envelope.connect(output)
      oscillator.onended = () => {
        oscillator.disconnect()
        envelope.disconnect()
        remaining -= 1
        if (remaining === 0) cleanup()
      }
      oscillator.start(start)
      oscillator.stop(partialEnd)
    }
  } catch (error) {
    // A partially constructed graph must not remain connected after a browser failure.
    cleanup()
    throw error
  }

  return voice
}

const MAX_VOICES = 128
const MASTER_HEADROOM = 0.16

export class PianoAudio {
  private audioContext: AudioContext | null = null
  private master: GainNode | null = null
  private limiter: DynamicsCompressorNode | null = null
  private volume = 0.8
  private sustain = false
  private disposed = false
  private unlocking: Promise<void> | null = null
  private readonly voices = new Set<PianoVoice>()
  private readonly held = new Map<number, PianoVoice>()
  private readonly sustained = new Set<PianoVoice>()

  get context(): AudioContext | null {
    return this.audioContext
  }

  get contextState(): AudioContextState | 'locked' {
    return this.disposed ? 'closed' : (this.audioContext?.state ?? 'locked')
  }

  get currentTime(): number {
    return this.audioContext?.currentTime ?? 0
  }

  async unlock(): Promise<void> {
    if (this.disposed) throw new Error('PianoAudio has been disposed')
    if (this.unlocking) return this.unlocking

    if (!this.audioContext) {
      if (typeof AudioContext === 'undefined') {
        throw new Error('Web Audio is not supported in this browser')
      }
      // "interactive" can still select a larger buffer than the device minimum.
      const context = new AudioContext({ latencyHint: 0 })
      this.audioContext = context
      try {
        this.master = context.createGain()
        this.master.gain.value = this.volume * MASTER_HEADROOM
        this.limiter = context.createDynamicsCompressor()
        this.limiter.threshold.value = -6
        this.limiter.knee.value = 12
        this.limiter.ratio.value = 12
        this.limiter.attack.value = 0.003
        this.limiter.release.value = 0.12
        this.master.connect(this.limiter)
        this.limiter.connect(context.destination)
      } catch (error) {
        this.dispose()
        throw error
      }
    }

    const context = this.audioContext
    this.unlocking = (async () => {
      if (context.state !== 'running') await context.resume()
      if (this.disposed) throw new Error('PianoAudio has been disposed')
      if (context.state !== 'running') {
        throw new Error(`Web Audio could not start (state: ${context.state})`)
      }
    })()

    try {
      await this.unlocking
    } finally {
      this.unlocking = null
    }
  }

  noteOn(midi: number, velocity = 0.75): void {
    if (!this.canPlay()) return
    const previous = this.held.get(midi)
    if (previous) {
      this.held.delete(midi)
      previous.release()
    }
    const voice = this.addVoice(midi, velocity, this.currentTime)
    if (voice) this.held.set(midi, voice)
  }

  noteOff(midi: number): void {
    const voice = this.held.get(midi)
    if (!voice) return
    this.held.delete(midi)
    if (this.sustain) this.sustained.add(voice)
    else voice.release()
  }

  /** Absolute context time; demo durations are independent of the live sustain pedal. */
  scheduleNote(midi: number, when: number, duration: number): void {
    if (
      !this.canPlay() ||
      !Number.isFinite(when) ||
      !Number.isFinite(duration) ||
      duration <= 0 ||
      !Number.isFinite(when + duration) ||
      when + duration <= this.currentTime
    ) {
      return
    }
    const voice = this.addVoice(midi, 0.75, Math.max(this.currentTime, when))
    voice?.release(when + duration)
  }

  setVolume(value: number): void {
    if (!Number.isFinite(value)) return
    this.volume = Math.min(1, Math.max(0, value))
    if (this.master && !this.disposed) {
      const gain = this.master.gain
      gain.cancelScheduledValues(this.currentTime)
      gain.setTargetAtTime(
        this.volume * MASTER_HEADROOM,
        this.currentTime,
        0.015,
      )
    }
  }

  setSustain(enabled: boolean): void {
    this.sustain = enabled
    if (enabled) return
    for (const voice of this.sustained) voice.release()
    this.sustained.clear()
  }

  releaseAll(): void {
    this.held.clear()
    this.sustained.clear()
    for (const voice of this.voices) voice.cancel()
    this.voices.clear()
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.releaseAll()
    this.master?.disconnect()
    this.limiter?.disconnect()
    this.master = null
    this.limiter = null
    const context = this.audioContext
    if (context && context.state !== 'closed') {
      context.close().catch((error: unknown) => {
        console.warn('Could not close the piano audio context', error)
      })
    }
  }

  private canPlay(): boolean {
    return !this.disposed && this.audioContext?.state === 'running'
  }

  private addVoice(
    midi: number,
    velocity: number,
    when: number,
  ): PianoVoice | null {
    if (!this.audioContext || !this.master) return null
    if (planPianoTone(this.audioContext, midi, velocity).length === 0)
      return null
    if (this.voices.size >= MAX_VOICES) {
      // The shared budget includes future score notes and release tails, not just held keys.
      this.voices.values().next().value?.cancel()
    }
    const voice = createPianoVoice(
      this.audioContext,
      this.master,
      midi,
      velocity,
      when,
    )
    if (!voice) return null
    this.voices.add(voice)
    voice.onended = () => {
      this.voices.delete(voice)
      this.sustained.delete(voice)
      if (this.held.get(midi) === voice) this.held.delete(midi)
    }
    return voice
  }
}
