import { expect, it } from 'vitest'
import { PianoTransport } from './transport'

it('keeps musical time through speed changes, pause, seek and resume', () => {
  let audioTime = 10
  const transport = new PianoTransport(() => audioTime)
  transport.start(3)
  audioTime = 12
  expect(transport.time).toBe(5)
  transport.setSpeed(0.5)
  audioTime = 16
  expect(transport.time).toBe(7)
  transport.pause()
  audioTime = 30
  expect(transport.time).toBe(7)
  transport.seek(4)
  transport.start()
  audioTime = 32
  expect(transport.time).toBe(5)
  expect(transport.audioTimeFor(6)).toBe(34)
})
