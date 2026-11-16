export class ArcadeAudio {
  private context: AudioContext | undefined
  private master: GainNode | undefined
  private voices = new Set<OscillatorNode>()
  private volume = 0.45

  async unlock() {
    this.context ??= new AudioContext({ latencyHint: 'interactive' })
    if (!this.master) {
      this.master = this.context.createGain()
      this.master.gain.value = this.volume * 0.15
      this.master.connect(this.context.destination)
    }
    await this.context.resume()
  }

  clock() {
    const context = this.context
    return context?.state === 'running'
      ? () => context.currentTime
      : () => performance.now() / 1000
  }

  setVolume(value: number) {
    this.volume = value / 100
    if (this.context && this.master)
      this.master.gain.setTargetAtTime(
        this.volume * 0.15,
        this.context.currentTime,
        0.015,
      )
  }

  tone = (frequency: number, duration = 0.09, delay = 0) => {
    const context = this.context
    if (!context || context.state !== 'running' || !this.master) return
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const start = context.currentTime + Math.max(0, delay)
    oscillator.type = 'triangle'
    oscillator.frequency.value = frequency
    gain.gain.setValueAtTime(0, start)
    gain.gain.linearRampToValueAtTime(0.7, start + 0.004)
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration)
    oscillator.connect(gain).connect(this.master)
    this.voices.add(oscillator)
    oscillator.onended = () => {
      this.voices.delete(oscillator)
      oscillator.disconnect()
      gain.disconnect()
    }
    oscillator.start(start)
    oscillator.stop(start + duration + 0.01)
  }

  stop() {
    for (const voice of this.voices) voice.stop()
    this.voices.clear()
  }

  dispose() {
    this.stop()
    if (this.context)
      this.context
        .close()
        .catch((error: unknown) =>
          console.warn('Could not close arcade audio', error),
        )
    this.context = undefined
    this.master = undefined
  }
}
