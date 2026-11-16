import { expect, test, type Page } from '@playwright/test'

async function legendPosition(page: Page) {
  const image = await page.locator('canvas').screenshot()
  return page.evaluate(async (base64) => {
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
    for (let i = 0; i < data.length; i += 4) {
      const [r, g, b] = [data[i], data[i + 1], data[i + 2]]
      // Isolate the centered legend from the pale cores of the corner lights.
      const x = (i / 4) % image.width
      if (
        x > image.width / 3 &&
        x < (image.width * 2) / 3 &&
        Math.min(r, g, b) > 160 &&
        Math.max(r, g, b) - Math.min(r, g, b) < 35
      ) {
        sum += Math.floor(i / 4 / image.width)
        count++
      }
    }
    return { y: sum / count, count }
  }, image.toString('base64'))
}

test('the WebGL keycap responds to independent holds and returns to rest', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/keycap.html')
  const key = page.getByRole('button', { name: 'A key', exact: true })
  const canvas = page.locator('canvas')
  await expect(canvas).toBeVisible()
  await expect(key).toBeVisible()
  await page.getByRole('switch', { name: 'Perspective view' }).click()
  await page.getByRole('switch').blur()
  await page.waitForTimeout(650)
  const idle = await canvas.screenshot()
  const restingLegend = await legendPosition(page)
  expect(restingLegend.count).toBeGreaterThan(100)
  await page.keyboard.down('a')
  await expect(key).toHaveAttribute('data-down')
  await page.waitForTimeout(180)
  expect((await canvas.screenshot()).equals(idle)).toBe(false)
  expect((await legendPosition(page)).y - restingLegend.y).toBeGreaterThan(5)
  await key.hover()
  await page.mouse.down()
  await page.keyboard.up('a')
  await expect(key).toHaveAttribute('data-down')
  await page.mouse.up()
  await expect(key).not.toHaveAttribute('data-down')
  await page.waitForTimeout(1800)
  expect((await canvas.screenshot()).equals(idle)).toBe(true)
  await page.keyboard.down('a')
  await page.evaluate(() => window.dispatchEvent(new Event('blur')))
  await expect(key).not.toHaveAttribute('data-down')
  await page.keyboard.up('a')
  const invalid = await page.evaluate(() =>
    window.ouuoAgent.act({
      steps: [{ ref: 'Keycap study', action: 'strike', args: ['KeyJ'] }],
    }),
  )
  expect(invalid.ok).toBe(false)
  const strike = await page.evaluate(() =>
    window.ouuoAgent.act({
      steps: [{ ref: 'Keycap study', action: 'strike', args: ['KeyA'] }],
    }),
  )
  expect(strike.ok).toBe(true)
  expect(errors).toEqual([])
})

for (const path of ['/keycap.html', '/']) {
  test(`a sub-frame tap still produces visible feedback on ${path}`, async ({
    page,
  }) => {
    await page.clock.install()
    await page.goto(path)
    await expect(page.locator('[data-rendered]')).toBeVisible()
    const canvas = page.locator('canvas')
    const idle = await canvas.screenshot()
    await page.clock.pauseAt(new Date(Date.now() + 1000))
    const key = page.getByRole('button', { name: 'A key', exact: true })
    await key.evaluate((element) => {
      element.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          pointerId: 7,
          button: 0,
        }),
      )
      element.dispatchEvent(
        new PointerEvent('pointerup', {
          bubbles: true,
          pointerId: 7,
          button: 0,
        }),
      )
    })
    await expect(key).not.toHaveAttribute('data-down')
    await page.clock.runFor(80)
    expect((await canvas.screenshot()).equals(idle)).toBe(false)
    await page.clock.runFor(1800)
    expect((await canvas.screenshot()).equals(idle)).toBe(true)
    await key.evaluate((element) => {
      element.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          pointerId: 8,
          button: 0,
        }),
      )
      element.dispatchEvent(
        new PointerEvent('pointerup', {
          bubbles: true,
          pointerId: 8,
          button: 0,
        }),
      )
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        value: true,
      })
      document.dispatchEvent(new Event('visibilitychange'))
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        value: false,
      })
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await page.clock.runFor(80)
    expect((await canvas.screenshot()).equals(idle)).toBe(true)
  })
}

test('camera control, keyboard activation and mobile bounds work without surrounding UI', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/keycap.html')
  const key = page.getByRole('button', { name: 'A key', exact: true })
  await expect(key).toBeVisible()
  await expect(page.locator('header, nav, footer')).toHaveCount(0)
  const camera = page.getByRole('switch', { name: 'Perspective view' })
  await expect(camera).toHaveAttribute('aria-checked', 'false')
  await camera.click()
  await expect(camera).toHaveAttribute('aria-checked', 'true')
  await page.waitForTimeout(100)
  const restingLegend = await legendPosition(page)
  await key.focus()
  await page.keyboard.down('Space')
  await expect(key).toHaveAttribute('data-down')
  await page.waitForTimeout(180)
  expect((await legendPosition(page)).y).toBeCloseTo(restingLegend.y, 0)
  await page.keyboard.up('Space')
  await expect(key).not.toHaveAttribute('data-down')
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  const box = await key.boundingBox()
  expect(box!.width).toBeGreaterThan(44)
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(390)
})

for (const path of ['/keycap.html', '/']) {
  test(`WebGL context loss exposes a playable fallback on ${path}`, async ({
    page,
  }) => {
    await page.goto(path)
    await expect(page.locator('[data-rendered]')).toBeVisible()
    await page.locator('canvas').evaluate((canvas: HTMLCanvasElement) => {
      canvas
        .getContext('webgl2')!
        .getExtension('WEBGL_lose_context')!
        .loseContext()
    })
    await expect(
      page.getByRole('alert').or(page.getByRole('status')),
    ).toHaveCount(1)
    await expect(
      page
        .getByRole('button', { name: 'A key', exact: true })
        .locator('span')
        .first(),
    ).toBeVisible()
    await page.keyboard.down('a')
    await expect(page.getByRole('button', { name: 'A key' })).toHaveAttribute(
      'data-down',
    )
    await page.keyboard.up('a')
  })
}
