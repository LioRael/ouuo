export class PianoTransport {
  private origin = 0
  private offset = 0
  running = false
  speed = 1
  constructor(private readonly now: () => number) {}
  get time() {
    return this.running
      ? this.offset + (this.now() - this.origin) * this.speed
      : this.offset
  }
  start(from = this.offset) {
    this.offset = from
    this.origin = this.now()
    this.running = true
  }
  pause() {
    this.offset = this.time
    this.running = false
  }
  seek(time: number) {
    this.offset = time
    this.origin = this.now()
  }
  setSpeed(speed: number) {
    this.seek(this.time)
    this.speed = speed
  }
  audioTimeFor(time: number) {
    return this.origin + (time - this.offset) / this.speed
  }
}
