import { expect, test } from '@playwright/test'

test('native audio renders a tuned decaying voice, releases, mixes and cancels scheduled notes', async ({
  page,
}) => {
  await page.goto('/plonko/')
  const rendered = await page.evaluate(async (moduleUrl) => {
    const { createPianoVoice } = (await import(
      moduleUrl
    )) as typeof import('../packages/audio/src/piano')
    function energy(samples: Float32Array, start: number, end: number) {
      let total = 0
      for (let i = Math.floor(start * 48_000); i < end * 48_000; i++)
        total += samples[i] ** 2
      return total / ((end - start) * 48_000)
    }
    const context = new OfflineAudioContext(1, 48_000, 48_000)
    const voice = createPianoVoice(context, context.destination, 69, 1, 0.1)!
    voice.release(0.5)
    const samples = (await context.startRendering()).getChannelData(0)
    function magnitude(frequency: number) {
      let real = 0,
        imaginary = 0
      for (let i = 7200; i < 16800; i++) {
        const phase = (2 * Math.PI * frequency * i) / 48_000
        real += samples[i] * Math.cos(phase)
        imaginary += samples[i] * Math.sin(phase)
      }
      return Math.hypot(real, imaginary)
    }
    const cancelledContext = new OfflineAudioContext(1, 48_000, 48_000)
    const future = createPianoVoice(
      cancelledContext,
      cancelledContext.destination,
      60,
      1,
      0.2,
    )!
    future.cancel()
    future.cancel()
    const cancelled = (await cancelledContext.startRendering()).getChannelData(
      0,
    )
    const mixContext = new OfflineAudioContext(1, 48_000, 48_000)
    const ended: number[] = []
    const first = createPianoVoice(
      mixContext,
      mixContext.destination,
      60,
      1,
      0.05,
    )!
    const second = createPianoVoice(
      mixContext,
      mixContext.destination,
      67,
      0.7,
      0.2,
    )!
    first.onended = () => ended.push(60)
    second.onended = () => ended.push(67)
    first.release(0.3)
    second.release(0.6)
    const mixed = (await mixContext.startRendering()).getChannelData(0)
    return {
      before: energy(samples, 0, 0.09),
      onset: energy(samples, 0.12, 0.22),
      decay: energy(samples, 0.35, 0.45),
      after: energy(samples, 0.7, 1),
      pitchRatio: magnitude(440) / Math.max(magnitude(420), magnitude(460)),
      cancelled: cancelled.every((sample) => sample === 0),
      remainingNote: energy(mixed, 0.5, 0.58),
      releasedMix: energy(mixed, 0.8, 1),
      ended: ended.sort((a, b) => a - b),
    }
  }, `/@fs${process.cwd()}/packages/audio/src/piano.ts`)
  expect(rendered.before).toBe(0)
  expect(rendered.onset).toBeGreaterThan(0.001)
  expect(rendered.onset).toBeGreaterThan(rendered.decay)
  expect(rendered.after).toBe(0)
  expect(rendered.pitchRatio).toBeGreaterThan(10)
  expect(rendered.cancelled).toBe(true)
  expect(rendered.remainingNote).toBeGreaterThan(0)
  expect(rendered.releasedMix).toBe(0)
  expect(rendered.ended).toEqual([60, 67])
})

test('audio permissions failure is visible and the instrument can retry', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const NativeAudio = window.AudioContext
    let attempts = 0
    window.AudioContext = class extends NativeAudio {
      constructor(options?: AudioContextOptions) {
        if (attempts++ === 0) throw new Error('Test audio permission failure')
        super(options)
      }
    }
  })
  await page.goto('/plonko/')
  await page.getByRole('button', { name: 'Piano settings' }).click()
  await page.getByRole('tab', { name: 'Sound', exact: true }).click()
  await page.getByRole('button', { name: 'Enable sound' }).click()
  await expect(page.getByRole('alert')).toContainText('Sound couldn’t start')
  await page.locator('.sound-control').click()
  await expect(
    page.getByRole('button', { name: 'Mute sound', exact: true }),
  ).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
})
