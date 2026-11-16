import { expect, test, type Page } from '@playwright/test'

declare global {
  interface Window {
    keyboardAudioLevel: () => Promise<{ peak: number; rms: number }>
  }
}

function keyHistory(page: Page, label = 'Mechanical keyboard') {
  return page.evaluate(
    (label) =>
      window.ouuoAgent.snapshot().find((entry) => entry.label === label)?.value,
    label,
  )
}

async function chooseView(page: Page, view: string) {
  const angle = page.getByRole('slider', { name: 'Viewing angle' })
  await angle.focus()
  await page.keyboard.press(view === 'Perspective' ? 'End' : 'Home')
  await page.mouse.click(10, 10)
}

async function keyImage(page: Page, code: string, padding = 8) {
  const box = (await page.locator(`[data-code="${code}"]`).boundingBox())!
  const viewport = page.viewportSize()!
  // The underlight sits below the resting key's hitbox, not inside its top face.
  const x = Math.max(0, box.x - padding)
  const y = Math.max(0, box.y - padding)
  const image = await page.screenshot({
    clip: {
      x,
      y,
      width: Math.min(viewport.width, box.x + box.width + padding) - x,
      height: Math.min(viewport.height, box.y + box.height + padding) - y,
    },
  })
  return page.evaluate(
    async ({ base64, key }) => {
      const image = new Image()
      image.src = `data:image/png;base64,${base64}`
      await image.decode()
      const canvas = document.createElement('canvas')
      canvas.width = image.width
      canvas.height = image.height
      const context = canvas.getContext('2d')!
      context.drawImage(image, 0, 0)
      const { data } = context.getImageData(0, 0, image.width, image.height)
      let sum = 0
      let count = 0
      let glow = 0
      let outerGlow = 0
      const colors = Array.from({ length: 4 }, () => [0, 0, 0, 0])
      for (let i = 0; i < data.length; i += 4) {
        const [r, g, b] = [data[i], data[i + 1], data[i + 2]]
        const x = (i / 4) % image.width
        const y = Math.floor(i / 4 / image.width)
        if (
          x > image.width / 3 &&
          x < (image.width * 2) / 3 &&
          Math.min(r, g, b) > 160 &&
          Math.max(r, g, b) - Math.min(r, g, b) < 35
        ) {
          sum += Math.floor(i / 4 / image.width)
          count++
        }
        if (
          Math.max(r, g, b) > 70 &&
          Math.max(r, g, b) - Math.min(r, g, b) > 35
        ) {
          glow++
          const dx = (x - key.x) / key.width - 0.5
          const dy = (y - key.y) / key.height - 0.5
          if (Math.abs(dx) > 0.3 && Math.abs(dy) > 0.3) {
            const color = colors[(dx > 0 ? 2 : 0) + (dy > 0 ? 1 : 0)]
            color[0] += r / (r + g + b)
            color[1] += g / (r + g + b)
            color[2] += b / (r + g + b)
            color[3]++
          }
          if (
            x < key.x - 10 ||
            x > key.x + key.width + 10 ||
            y < key.y - 10 ||
            y > key.y + key.height + 10
          )
            outerGlow++
        }
      }
      return {
        y: sum / count,
        count,
        glow,
        outerGlow,
        colors: colors.map(([r, g, b, count]) => ({
          rgb: [r / count, g / count, b / count],
          count,
        })),
      }
    },
    {
      base64: image.toString('base64'),
      key: { x: box.x - x, y: box.y - y, width: box.width, height: box.height },
    },
  )
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Object.assign(globalThis, { __UI_SDK_STRICT__: true })
  })
})

for (const path of ['/', '/keycap.html']) {
  test(`the same key remains playable beyond a full history on ${path}`, async ({
    page,
  }) => {
    await page.goto(path)
    const key = page.getByRole('button', { name: 'A key', exact: true })
    await expect(key).toBeVisible()
    for (const input of ['keyboard', 'pointer']) {
      await key.hover()
      for (let strike = 1; strike <= 30; strike++) {
        if (input === 'keyboard') await page.keyboard.down('a')
        else await page.mouse.down()
        await expect(key, `${input} strike ${strike}`).toHaveAttribute(
          'data-down',
        )
        if (input === 'keyboard') await page.keyboard.up('a')
        else await page.mouse.up()
        await expect(key).not.toHaveAttribute('data-down')
      }
    }
    expect(
      await keyHistory(
        page,
        path === '/' ? 'Mechanical keyboard' : 'Keycap study',
      ),
    ).toEqual(Array(12).fill('KeyA'))
  })
}

test('physical chords release independently and clear when the page loses focus', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.locator('.keyboard-case')).toBeVisible()
  const a = page.getByRole('button', { name: 'A key', exact: true })
  const k = page.getByRole('button', { name: 'K key', exact: true })
  await page.keyboard.down('a')
  await page.keyboard.down('k')
  await expect(a).toHaveAttribute('data-down')
  await expect(k).toHaveAttribute('data-down')
  await page.keyboard.up('a')
  await expect(a).not.toHaveAttribute('data-down')
  await expect(k).toHaveAttribute('data-down')
  await page.evaluate(() => window.dispatchEvent(new Event('blur')))
  await expect(k).not.toHaveAttribute('data-down')
  await page.keyboard.up('k')
})

test('edge controls stay outside the key hit areas in either view', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.locator('.keyboard-case[data-rendered]')).toBeVisible()
  for (const view of ['Flat', 'Perspective']) {
    await chooseView(page, view)
    const angle = page.locator('.keyboard-angle')
    await angle.hover()
    await expect
      .poll(() =>
        page.locator('.mechanical-key').evaluateAll((keys) => {
          const controls = Array.from(
            document.querySelectorAll('.keyboard-angle, .keyboard-sound'),
            (control) => control.getBoundingClientRect(),
          )
          return keys
            .filter((key) => {
              const box = key.getBoundingClientRect()
              return controls.some(
                (control) =>
                  box.left < control.right &&
                  box.right > control.left &&
                  box.top < control.bottom &&
                  box.bottom > control.top,
              )
            })
            .map((key) => key.getAttribute('data-code'))
        }),
      )
      .toEqual([])
    for (const selector of [
      '.keyboard-angle [data-slot="slider-control"]',
      '.keyboard-sound',
    ]) {
      const box = (await page.locator(selector).boundingBox())!
      expect(box.width).toBeGreaterThanOrEqual(44)
      expect(box.height).toBeGreaterThanOrEqual(44)
    }
  }
})

test('the keyboard starts flat and remains playable after switching perspective', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.locator('header, footer, nav')).toHaveCount(0)
  await expect(page.getByLabel('Recent keys')).toHaveCount(0)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(
    page.locator('.keyboard-case[data-rendered] canvas'),
  ).toBeVisible()
  const flatHeight = (await page.locator('[data-code="KeyA"]').boundingBox())!
    .height
  expect(
    await page
      .locator('button:visible, a:visible')
      .evaluateAll((controls) =>
        controls.every((control) => control.closest('.keyboard-case')),
      ),
  ).toBe(true)
  const perspective = page.getByRole('slider', { name: 'Viewing angle' })
  const sound = page.getByRole('switch', { name: 'Key sound' })
  await expect(page.locator('.keyboard-angle')).toBeVisible()
  await expect(sound).toBeVisible()
  await expect(perspective).toHaveValue('0')
  await perspective.focus()
  await page.keyboard.press('End')
  await expect(perspective).toHaveValue('44')
  await expect
    .poll(() =>
      page
        .locator('[data-code="KeyA"]')
        .boundingBox()
        .then((box) => box!.height),
    )
    .toBeLessThan(flatHeight * 0.95)
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'A key', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'A key', exact: true }).focus()
  await page.keyboard.down('j')
  await expect(page.locator('[data-code="KeyJ"]')).toHaveAttribute('data-down')
  await page.keyboard.up('j')
  expect(await keyHistory(page)).toEqual(['KeyJ'])
  await perspective.focus()
  await page.keyboard.press('Home')
  await expect(perspective).toHaveValue('0')
  await expect
    .poll(() =>
      page
        .locator('[data-code="KeyA"]')
        .boundingBox()
        .then((box) => box!.height),
    )
    .toBeGreaterThan(flatHeight * 0.99)
  await page.keyboard.press('Tab')
  await expect(sound).toBeFocused()
  await page.keyboard.press('Space')
  await expect(sound).toHaveAttribute('aria-checked', 'false')
  expect(await keyHistory(page)).toEqual(['KeyJ'])
  await page.keyboard.press('Shift+Tab')
  await expect(perspective).toBeFocused()
})

test('the side wheel scrubs relatively, clamps and restores a canceled angle', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.locator('.keyboard-case[data-rendered]')).toBeVisible()
  const angle = page.getByRole('slider', { name: 'Viewing angle' })
  const wheel = page.locator('.keyboard-angle [data-slot="slider-control"]')
  const box = (await wheel.boundingBox())!
  const x = box.x + box.width / 2
  const y = box.y + box.height / 3
  await page.mouse.move(x, y)
  await page.mouse.down()
  await expect(angle).toHaveValue('0')
  await page.mouse.move(x - 80, y, { steps: 4 })
  await expect(angle).toHaveValue('0')
  await page.mouse.move(x, y - 60, { steps: 6 })
  await expect(angle).toHaveValue('20')
  await page.keyboard.press('Escape')
  await expect(angle).toHaveValue('0')
  await page.mouse.up()
  await wheel.hover()
  await page.mouse.down()
  await page.mouse.move(x, y - 240, { steps: 8 })
  await expect(angle).toHaveValue('44')
  await page.mouse.up()
  await angle.focus()
  await page.keyboard.press('ArrowDown')
  await expect(angle).toHaveValue('43')
  await page.keyboard.press('Home')
  await expect(angle).toHaveValue('0')
  await wheel.hover()
  const reset = (await wheel.boundingBox())!
  await page.mouse.down()
  await page.mouse.move(reset.x + 22, reset.y - 28, { steps: 6 })
  await expect(angle).toHaveValue('20')
  await page.evaluate(() => window.dispatchEvent(new Event('blur')))
  await expect(angle).toHaveValue('0')
  await page.mouse.up()
  expect(await keyHistory(page)).toEqual([])
})

test('touch rolls the side wheel without scrolling and cancellation restores the previous angle', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 780 })
  await page.goto('/')
  await expect(page.locator('.keyboard-case[data-rendered]')).toBeVisible()
  const angle = page.getByRole('slider', { name: 'Viewing angle' })
  const wheel = page.locator('.keyboard-angle [data-slot="slider-control"]')
  await wheel.scrollIntoViewIfNeeded()
  const session = await page.context().newCDPSession(page)
  for (const [distance, value, end] of [
    [54, '18', 'touchEnd'],
    [30, '28', 'touchCancel'],
  ] as const) {
    const box = (await wheel.boundingBox())!
    const x = box.x + 22
    const y = box.y + 32
    const before = await page
      .locator('.keyboard-scroll')
      .evaluate((el) => el.scrollLeft)
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x, y, id: 1 }],
    })
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x, y: y - distance, id: 1 }],
    })
    await expect(angle).toHaveValue(value)
    await session.send('Input.dispatchTouchEvent', {
      type: end,
      touchPoints: [],
    })
    await expect(angle).toHaveValue('18')
    expect(
      await page.locator('.keyboard-scroll').evaluate((el) => el.scrollLeft),
    ).toBe(before)
  }
  expect(await keyHistory(page)).toEqual([])
  await session.detach()
})

test('dragging across keys follows the pointer without releasing a physical hold', async ({
  page,
}) => {
  await page.goto('/')
  for (const view of ['Flat', 'Perspective']) {
    await chooseView(page, view)
    await page.evaluate(() =>
      window.ouuoAgent.act({
        steps: [{ ref: 'Mechanical keyboard', action: 'clear' }],
      }),
    )
    const a = page.locator('[data-code="KeyA"]')
    const s = page.locator('[data-code="KeyS"]')
    const d = page.locator('[data-code="KeyD"]')
    await a.hover()
    await page.mouse.down()
    await page.keyboard.down('a')
    await s.hover()
    await expect(a).toHaveAttribute('data-down')
    await expect(s).toHaveAttribute('data-down')
    await page.mouse.move(20, 150)
    await expect(s).not.toHaveAttribute('data-down')
    await d.hover()
    await expect(d).toHaveAttribute('data-down')
    await page.mouse.up()
    await expect(d).not.toHaveAttribute('data-down')
    await expect(a).toHaveAttribute('data-down')
    await page.keyboard.up('a')
    await expect(page.locator('.mechanical-key[data-down]')).toHaveCount(0)
    expect(await keyHistory(page)).toEqual(['KeyA', 'KeyS', 'KeyD'])
  }
})

test('WebGL letters and wide keys travel together, light underneath and return independently', async ({
  page,
}) => {
  await page.goto('/')
  await expect(
    page.locator('.keyboard-case[data-rendered] canvas'),
  ).toBeVisible()
  await chooseView(page, 'Perspective')
  await page.mouse.click(10, 10)
  await page.waitForTimeout(700)
  const a = await keyImage(page, 'KeyA')
  const space = await keyImage(page, 'Space')
  expect(a.count).toBeGreaterThan(8)
  expect(space.count).toBeGreaterThan(8)
  await page.keyboard.down('a')
  await page.keyboard.down('Space')
  await page.waitForTimeout(180)
  const pressedA = await keyImage(page, 'KeyA')
  const pressedSpace = await keyImage(page, 'Space')
  expect(pressedA.y - a.y).toBeGreaterThan(1)
  expect(pressedSpace.y - space.y).toBeGreaterThan(1)
  expect(pressedA.glow).toBeGreaterThan(a.glow + 2)
  expect(pressedSpace.glow).toBeGreaterThan(space.glow + 2)
  await page.keyboard.up('a')
  await page.waitForTimeout(1800)
  expect((await keyImage(page, 'KeyA')).y).toBeCloseTo(a.y, 0)
  expect((await keyImage(page, 'Space')).y - space.y).toBeGreaterThan(1)
  await page.keyboard.up('Space')
  await page.waitForTimeout(1800)
  await page.getByRole('switch', { name: 'Backlight', exact: true }).click()
  await page.mouse.click(10, 10)
  await page.keyboard.down('a')
  await page.waitForTimeout(180)
  const unlit = await keyImage(page, 'KeyA')
  expect(unlit.y - a.y).toBeGreaterThan(1)
  expect(unlit.glow).toBe(a.glow)
  await page.keyboard.up('a')
})

test('a strike spreads light beyond its key then fades completely', async ({
  page,
}) => {
  await page.clock.install()
  await page.goto('/')
  await expect(page.locator('.keyboard-case[data-rendered]')).toBeVisible()
  await page.clock.pauseAt(Date.now() + 1000)
  const idle = await keyImage(page, 'KeyA', 48)
  await page.keyboard.down('a')
  await page.clock.runFor(32)
  const onset = await keyImage(page, 'KeyA', 48)
  await page.clock.runFor(192)
  const spread = await keyImage(page, 'KeyA', 48)
  expect(spread.outerGlow).toBeGreaterThan(idle.outerGlow + 15)
  expect(spread.outerGlow).toBeGreaterThan(onset.outerGlow + 5)
  await page.keyboard.up('a')
  await page.clock.runFor(1500)
  expect((await keyImage(page, 'KeyA', 48)).glow).toBe(idle.glow)
})

test('underlight has same-family regions as well as multicolor boundaries', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.clock.install()
  await page.goto('/')
  await expect(page.locator('.keyboard-case[data-rendered]')).toBeVisible()
  await page.clock.pauseAt(Date.now() + 1000)
  const spans: number[] = []
  for (const letter of 'asdfghjkl') {
    await page.keyboard.down(letter)
    await page.clock.runFor(224)
    const { colors } = await keyImage(page, `Key${letter.toUpperCase()}`, 18)
    for (const color of colors) expect(color.count).toBeGreaterThan(5)
    spans.push(
      Math.max(
        ...colors.flatMap((a) =>
          colors.map((b) =>
            Math.hypot(...a.rgb.map((channel, i) => channel - b.rgb[i])),
          ),
        ),
      ),
    )
    await page.keyboard.up(letter)
    await page.clock.runFor(1500)
  }
  expect(Math.min(...spans), JSON.stringify(spans)).toBeLessThan(0.12)
  expect(Math.max(...spans), JSON.stringify(spans)).toBeGreaterThan(0.3)
})

for (const view of ['Flat', 'Perspective']) {
  test(`edge-key light stays off the background in ${view} view`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.clock.install()
    await page.goto('/')
    await expect(page.locator('.keyboard-case[data-rendered]')).toBeVisible()
    await chooseView(page, view)
    await page.mouse.click(10, 10)
    await page.clock.pauseAt(await page.evaluate(() => Date.now() + 1000))
    await page.clock.runFor(800)
    const box = (await page.locator('[data-code="Space"]').boundingBox())!
    const clip = {
      x: box.x,
      y: box.y + box.height + 40,
      width: box.width,
      height: 30,
    }
    const idle = await page.screenshot({ clip })
    await page.keyboard.down('Space')
    await page.clock.runFor(224)
    const pressed = await page.screenshot({ clip })
    expect(pressed.equals(idle)).toBe(true)
    expect((await keyImage(page, 'Space', 18)).glow).toBeGreaterThan(30)
    await page.keyboard.up('Space')
  })
}

test('sound is on by default without autoplay, stays silent for agents and mutes immediately', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const contexts: { context: AudioContext; analyser: AnalyserNode }[] = []
    const NativeAudioContext = window.AudioContext
    window.AudioContext = class extends NativeAudioContext {
      constructor() {
        super()
        const output = this.createGain()
        const analyser = this.createAnalyser()
        analyser.fftSize = 8192
        output.connect(this.destination)
        output.connect(analyser)
        Object.defineProperty(this, 'destination', { value: output })
        contexts.push({ context: this, analyser })
      }
    }
    Object.assign(window, {
      keyboardAudioLevel: async () => {
        let peak = 0
        let squares = 0
        let count = 0
        const starts = new Map<AudioContext, number>()
        const deadline = performance.now() + 1500
        while (performance.now() < deadline) {
          let complete = false
          for (const { context, analyser } of contexts) {
            if (!starts.has(context)) starts.set(context, context.currentTime)
            if (context.state !== 'running' || context.currentTime === 0)
              continue
            const data = new Float32Array(analyser.fftSize)
            analyser.getFloatTimeDomainData(data)
            for (const value of data) {
              peak = Math.max(peak, Math.abs(value))
              squares += value * value
              count++
            }
            complete ||= context.currentTime - starts.get(context)! >= 0.16
          }
          if (complete) break
          await new Promise((resolve) => setTimeout(resolve, 5))
        }
        return { peak, rms: count ? Math.sqrt(squares / count) : 0 }
      },
    })
  })
  const level = () => page.evaluate(() => window.keyboardAudioLevel())
  await page.goto('/')
  const sound = page.getByRole('switch', { name: 'Key sound' })
  await expect(sound).toBeVisible()
  await expect(sound).toHaveAttribute('aria-checked', 'true')
  expect((await level()).peak).toBe(0)
  const playing = level()
  await page.keyboard.press('a')
  const audible = await playing
  expect(audible.rms).toBeGreaterThan(0.008)
  expect(audible.rms).toBeLessThan(0.035)
  expect(audible.peak).toBeLessThan(0.98)
  await page.waitForTimeout(250)
  const pointerLevel = level()
  await page.getByRole('button', { name: 'A key', exact: true }).click()
  const pointerAudio = await pointerLevel
  expect(pointerAudio.rms).toBeGreaterThan(0.008)
  expect(pointerAudio.rms).toBeLessThan(0.035)
  expect(pointerAudio.peak).toBeLessThan(0.98)
  await page.waitForTimeout(250)
  const agentLevel = level()
  await page.evaluate(() =>
    window.ouuoAgent.act({
      steps: [{ ref: 'Mechanical keyboard', action: 'strike', args: ['KeyJ'] }],
    }),
  )
  expect((await agentLevel).peak).toBe(0)
  await sound.click()
  await expect(sound).toHaveAttribute('aria-checked', 'false')
  await page.mouse.click(10, 10)
  const muted = level()
  await page.keyboard.press('a')
  expect((await muted).peak).toBe(0)
  expect(await keyHistory(page)).toEqual(['KeyA', 'KeyA', 'KeyJ', 'KeyA'])
  await expect(sound).toHaveAttribute('aria-checked', 'false')
  await sound.click()
  await page.mouse.click(10, 10)
  const chord = level()
  for (const key of 'asdfghjklq') await page.keyboard.down(key)
  const combined = await chord
  expect(combined.rms).toBeGreaterThan(0.04)
  expect(combined.peak).toBeLessThan(0.98)
  for (const key of 'asdfghjklq') await page.keyboard.up(key)
})

test('the keyboard has one tab stop and spatial navigation does not strike keys', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.locator('.mechanical-key[tabindex="0"]')).toHaveCount(1)
  const q = page.getByRole('button', { name: 'Q key', exact: true })
  const w = page.getByRole('button', { name: 'W key', exact: true })
  await q.focus()
  await page.keyboard.press('ArrowRight')
  await expect(w).toBeFocused()
  await page.keyboard.press('ArrowLeft')
  await expect(q).toBeFocused()
  await page.keyboard.down('j')
  await expect(
    page.getByRole('button', { name: 'J key', exact: true }),
  ).toHaveAttribute('data-down')
  await page.keyboard.up('j')
  await page.keyboard.press('ArrowDown')
  await expect(
    page.getByRole('button', { name: 'A key', exact: true }),
  ).toBeFocused()
  await expect(page.locator('.mechanical-key[data-down]')).toHaveCount(0)
  await page.keyboard.down('Space')
  await expect(
    page.getByRole('button', { name: 'A key', exact: true }),
  ).toHaveAttribute('data-down')
  await page.keyboard.up('Space')
  await expect(page.locator('.mechanical-key[data-down]')).toHaveCount(0)
  await page.keyboard.press('Tab')
  const angle = page.getByRole('slider', { name: 'Viewing angle' })
  await expect(angle).toBeFocused()
  await page.keyboard.press('End')
  await expect(angle).toHaveValue('44')
  await page.keyboard.press('Tab')
  const sound = page.getByRole('switch', { name: 'Key sound' })
  await expect(sound).toBeFocused()
  await page.keyboard.press('Space')
  await expect(sound).toHaveAttribute('aria-checked', 'false')
  expect(await keyHistory(page)).toEqual(['KeyJ', 'KeyA'])
  await page.keyboard.press('Shift+Tab')
  await expect(angle).toBeFocused()
})

test('pointer cancellation cannot release a key still held by the physical keyboard', async ({
  page,
}) => {
  await page.goto('/')
  const a = page.getByRole('button', { name: 'A key', exact: true })
  await expect(a).toBeVisible()
  await page.keyboard.down('a')
  await expect(a).toHaveAttribute('data-down')
  await a.dispatchEvent('pointerdown', {
    pointerId: 4,
    pointerType: 'touch',
    button: 0,
  })
  await a.dispatchEvent('pointercancel', { pointerId: 4, pointerType: 'touch' })
  await expect(a).toHaveAttribute('data-down')
  await page.keyboard.up('a')
  await expect(a).not.toHaveAttribute('data-down')
  await a.dispatchEvent('pointerdown', {
    pointerId: 5,
    pointerType: 'touch',
    button: 0,
  })
  await expect(a).toHaveAttribute('data-down')
  await a.dispatchEvent('lostpointercapture', {
    pointerId: 5,
    pointerType: 'touch',
  })
  await expect(a).not.toHaveAttribute('data-down')
})

test('agents discover keys, strike through the shared path and cannot invent key codes', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.locator('.mechanical-key')).not.toHaveCount(0)
  const entries = await page.evaluate(() =>
    window.ouuoAgent.snapshot().filter((entry) => !entry.offPage),
  )
  expect(entries.every((entry) => entry.label)).toBe(true)
  expect(entries.map((entry) => entry.label)).toEqual(
    expect.arrayContaining([
      'Mechanical keyboard',
      'Backlight',
      'Viewing angle',
      'Key sound',
    ]),
  )
  const choices = await page.evaluate(() =>
    window.ouuoAgent.query({ within: 'Mechanical keyboard', text: 'KeyJ' }),
  )
  expect(Array.isArray(choices)).toBe(true)
  const result = await page.evaluate(() =>
    window.ouuoAgent.act({
      steps: [{ ref: 'Mechanical keyboard', action: 'strike', args: ['KeyJ'] }],
    }),
  )
  expect(result.ok, JSON.stringify(result)).toBe(true)
  expect(await keyHistory(page)).toEqual(['KeyJ'])
  await expect(page.locator('.mechanical-key[data-down]')).toHaveCount(0)
  const invalid = await page.evaluate(() =>
    window.ouuoAgent.act({
      steps: [
        { ref: 'Mechanical keyboard', action: 'strike', args: ['not-a-key'] },
      ],
    }),
  )
  expect(invalid.ok).toBe(false)
  await page.getByRole('switch', { name: 'Backlight', exact: true }).click()
  await expect(page.locator('.keyboard-room')).toHaveAttribute(
    'data-backlight',
    'false',
  )
  const view = await page.evaluate(() =>
    window.ouuoAgent.act({
      steps: [
        { ref: 'Viewing angle', action: 'setValue', args: [44] },
        { ref: 'Key sound', action: 'setChecked', args: [false] },
      ],
    }),
  )
  expect(view.ok, JSON.stringify(view)).toBe(true)
  await expect(page.getByRole('slider', { name: 'Viewing angle' })).toHaveValue(
    '44',
  )
  await expect(page.locator('.keyboard-room')).toHaveAttribute(
    'data-view',
    'perspective',
  )
  await expect(page.getByRole('switch', { name: 'Key sound' })).toHaveAttribute(
    'aria-checked',
    'false',
  )
})

test('small screens retain usable keys without page overflow and reduced motion removes travel', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    await expect(page.locator('.keyboard-case')).toBeVisible()
    for (const view of ['Flat', 'Perspective']) {
      await chooseView(page, view)
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true)
      const key = page.getByRole('button', { name: 'J key', exact: true })
      await key.scrollIntoViewIfNeeded()
      const box = await key.boundingBox()
      expect(box!.width).toBeGreaterThanOrEqual(44)
      expect(box!.height).toBeGreaterThanOrEqual(44)
      const resting = await keyImage(page, 'KeyJ')
      expect(resting.count).toBeGreaterThan(3)
      await key.focus()
      await page.keyboard.down('Space')
      await expect(key).toHaveAttribute('data-down')
      await page.waitForTimeout(180)
      expect((await keyImage(page, 'KeyJ')).y).toBeCloseTo(resting.y, 0)
      await page.keyboard.up('Space')
      await expect(key).not.toHaveAttribute('data-down')
    }
  }
})
