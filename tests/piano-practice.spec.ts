import { expect, test } from '@playwright/test'

for (const viewport of [
  { width: 1440, height: 900 },
  { width: 390, height: 844 },
  { width: 320, height: 568 },
  { width: 844, height: 390 },
  { width: 667, height: 375 },
  { width: 1024, height: 600 },
]) {
  test(`modes and rear pages keep the same shell and keyboard geometry at ${viewport.width}×${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport)
    await page.goto('/plonko/')
    const shell = (await page.locator('.piano-hardware').boundingBox())!
    const keyboard = (await page.locator('.keyboard').boundingBox())!
    const screen = (await page.locator('.note-canvas').boundingBox())!
    for (const mode of ['Free play', 'Listen', 'Challenge', 'Free play']) {
      await page
        .getByRole('radiogroup', { name: 'Instrument mode' })
        .getByRole('radio', { name: mode, exact: true })
        .click()
      const front = (await page.locator('.piano-hardware').boundingBox())!
      const keys = (await page.locator('.keyboard').boundingBox())!
      const canvas = (await page.locator('.note-canvas').boundingBox())!
      for (const edge of ['x', 'y', 'width', 'height'] as const) {
        expect(Math.abs(front[edge] - shell[edge])).toBeLessThan(1)
        expect(Math.abs(keys[edge] - keyboard[edge])).toBeLessThan(1)
        expect(Math.abs(canvas[edge] - screen[edge])).toBeLessThan(1)
      }
      const playScreen = (await page.locator('.note-space').boundingBox())!
      for (const readout of await page
        .locator('.performance-hud, .song-transport')
        .all()) {
        const bounds = (await readout.boundingBox())!
        expect(bounds.x).toBeGreaterThanOrEqual(playScreen.x)
        expect(bounds.y).toBeGreaterThanOrEqual(playScreen.y)
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(
          playScreen.x + playScreen.width,
        )
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(
          playScreen.y + playScreen.height,
        )
        if (mode !== 'Free play') {
          const start = (await page.locator('.piano-primary').boundingBox())!
          expect(bounds.y + bounds.height).toBeLessThanOrEqual(start.y)
        }
      }
      const flip = page.getByRole('button', { name: 'Piano settings' })
      await flip.click()
      const rear = page.getByRole('dialog', { name: 'The other side' })
      await rear.evaluate((element) =>
        Promise.all(
          element.getAnimations().map((animation) => animation.finished),
        ),
      )
      await expect(rear.getByRole('link')).toHaveCount(0)
      await expect(
        rear.getByRole('button', { name: 'Back to the piano', exact: true }),
      ).toHaveCount(0)
      await expect(
        rear.getByRole('button', { name: 'Close controls', exact: true }),
      ).toHaveCount(1)
      for (const tab of ['Music', 'Practice', 'Sound', 'Keys']) {
        await page.getByRole('tab', { name: tab, exact: true }).click()
        const bounds = (await rear.boundingBox())!
        for (const edge of ['x', 'y', 'width', 'height'] as const) {
          expect(Math.abs(bounds[edge] - front[edge])).toBeLessThan(1)
        }
        expect(
          await rear.evaluate(
            (element) => element.scrollHeight <= element.clientHeight,
          ),
        ).toBe(true)
        const panel = page.getByRole('tabpanel', { name: tab, exact: true })
        expect(
          await panel.evaluate(
            (element) => element.scrollWidth <= element.clientWidth,
          ),
        ).toBe(true)
        if (viewport.width >= 1024) {
          expect(
            await panel.evaluate(
              (element) => element.scrollHeight <= element.clientHeight,
            ),
          ).toBe(true)
        }
        if (tab === 'Keys') {
          expect(
            await panel.getByRole('textbox').evaluateAll((inputs) =>
              inputs.every((input) => {
                const { width, height } = input.getBoundingClientRect()
                return width >= 43.99 && height >= 43.99
              }),
            ),
          ).toBe(true)
        }
        await expect(page.getByRole('tablist')).toBeInViewport()
        await expect(
          page.getByRole('button', { name: 'Close controls', exact: true }),
        ).toBeInViewport()
      }
      await page
        .getByRole('button', { name: 'Close controls', exact: true })
        .click()
      await expect(rear).toBeHidden()
      await expect(flip).toBeFocused()
    }
  })
}

test('action shortcuts pause for rear controls without replacing held piano keys', async ({
  page,
}) => {
  await page.goto('/plonko/')
  await expect(
    page.getByRole('button', { name: 'Piano settings' }),
  ).toBeVisible()
  await page.keyboard.press('ControlOrMeta+,')
  await expect(
    page.getByRole('dialog', { name: 'The other side' }),
  ).toBeVisible()
  await page.getByRole('radio', { name: 'Listen', exact: true }).click()
  await page.keyboard.press('ControlOrMeta+Enter')
  await expect(page.locator('.piano-room')).toHaveAttribute(
    'data-phase',
    'idle',
  )
  await page.getByRole('tab', { name: 'Keys', exact: true }).click()
  await page.getByRole('textbox', { name: 'C4', exact: true }).fill('z')
  await page.keyboard.press('Escape')
  await page.keyboard.press('ControlOrMeta+Enter')
  await expect(page.locator('.piano-room')).toHaveAttribute(
    'data-phase',
    'running',
  )
  await page.keyboard.press('ControlOrMeta+Enter')
  await expect(page.locator('.piano-room')).toHaveAttribute(
    'data-phase',
    'paused',
  )
  await page.keyboard.press('ControlOrMeta+,')
  await page.getByRole('tab', { name: 'Music', exact: true }).click()
  await page.getByRole('radio', { name: 'Free play', exact: true }).click()
  await page.keyboard.press('Escape')
  await page.keyboard.down('z')
  await page.keyboard.down('d')
  await expect(page.locator('[data-midi="60"]')).toHaveAttribute('data-active')
  await expect(page.locator('[data-midi="64"]')).toHaveAttribute('data-active')
  await page.keyboard.up('z')
  await expect(page.locator('[data-midi="60"]')).not.toHaveAttribute(
    'data-active',
  )
  await expect(page.locator('[data-midi="64"]')).toHaveAttribute('data-active')
  await page.keyboard.up('d')
  await expect(page.locator('[data-midi][data-active]')).toHaveCount(0)
})

test('free-play readout follows held chords and clears released input', async ({
  page,
}) => {
  await page.goto('/plonko/')
  await expect(
    page.getByRole('button', { name: 'Play C4', exact: true }),
  ).toBeVisible()
  const readout = page.locator('.performance-hud')
  await expect(readout).toContainText('Keyboard & touch')
  await page.keyboard.down('k')
  await page.keyboard.down('a')
  await page.keyboard.down('d')
  await expect(readout).toContainText('C4 · E4 · C5')
  await page.keyboard.up('a')
  await expect(readout).toContainText('E4 · C5')
  await expect(readout).not.toContainText('C4')
  await page.evaluate(() => window.dispatchEvent(new Event('blur')))
  await expect(readout).toContainText('Keyboard & touch')
  await page.keyboard.up('d')
  await page.keyboard.up('k')
})

test('Listen readout reports actual tempo and playback state instead of scores', async ({
  page,
}) => {
  await page.goto('/plonko/')
  const modes = page.getByRole('radiogroup', { name: 'Instrument mode' })
  await modes.getByRole('radio', { name: 'Listen', exact: true }).click()
  const readout = page.locator('.performance-hud')
  await expect(readout).toContainText('Ready to listen')
  await page.getByRole('button', { name: 'Piano settings' }).click()
  await page.getByRole('tab', { name: 'Practice', exact: true }).click()
  await page.getByRole('slider', { name: 'Playback speed' }).fill('0.75')
  await page.keyboard.press('Escape')
  await expect(readout).toContainText('72BPM')
  await expect(readout).toContainText('0.75×speed')
  await page.getByRole('button', { name: 'Next song', exact: true }).click()
  await expect(readout).toContainText('84BPM')
  await page.getByRole('button', { name: 'Listen to Violet Current' }).click()
  await expect(readout).toContainText('Playing')
  await expect(readout).not.toContainText('accuracy')
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await expect(readout).toContainText('Paused')
  await page.getByRole('button', { name: 'Restart', exact: true }).click()
  await expect(readout).toContainText('Playing')
  await modes.getByRole('radio', { name: 'Challenge', exact: true }).click()
  await expect(readout).toContainText('score')
  await expect(readout).toContainText('combo')
  await expect(readout).toContainText('accuracy')
  await expect(readout).not.toContainText('BPM')
})

test('physical controls work without opening settings and survive flipping the piano', async ({
  page,
}) => {
  await page.goto('/plonko/')
  const volume = page.getByRole('slider', { name: 'Volume', exact: true })
  await expect(volume).toBeVisible()
  await volume.focus()
  await page.keyboard.press('Home')
  await page.keyboard.press('ArrowRight')
  await expect(volume).toHaveValue('1')
  await page.getByRole('button', { name: 'Next song', exact: true }).click()
  await expect(page.locator('.instrument-display')).toContainText(
    'Violet Current',
  )
  await page.getByRole('button', { name: 'Previous song', exact: true }).click()
  await expect(page.locator('.instrument-display')).toContainText('First Light')
  const sustain = page.getByRole('button', { name: 'Hold sustain' })
  await sustain.click()
  await expect(sustain).toHaveAttribute('aria-pressed', 'true')
  await page
    .getByRole('button', { name: 'Mute instrument', exact: true })
    .click()
  await expect(
    page.getByRole('button', { name: 'Unmute instrument', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true')
  await page
    .getByRole('button', { name: 'Unmute instrument', exact: true })
    .click()
  const modes = page.getByRole('radiogroup', { name: 'Instrument mode' })
  await modes.getByRole('radio', { name: 'Listen', exact: true }).click()
  await page.getByRole('button', { name: 'Listen to First Light' }).click()
  await expect(page.locator('.piano-room')).toHaveAttribute(
    'data-phase',
    'running',
  )
  const flip = page.getByRole('button', { name: 'Piano settings' })
  await flip.click()
  await expect(page.getByRole('dialog')).toHaveAccessibleName('The other side')
  await expect(page.locator('.piano-room')).toHaveAttribute(
    'data-phase',
    'paused',
  )
  await expect(page.locator('[data-midi][data-active]')).toHaveCount(0)
  await expect(modes).toBeHidden()
  await page.getByRole('tab', { name: 'Sound', exact: true }).click()
  await expect(volume).toHaveValue('1')
  await volume.fill('42')
  const pedal = page.getByRole('switch', { name: 'Sustain pedal' })
  await expect(pedal).toBeChecked()
  await pedal.click()
  await page
    .getByRole('button', { name: 'Close controls', exact: true })
    .click()
  await expect(flip).toBeFocused()
  await expect(volume).toHaveValue('42')
  await expect(sustain).toHaveAttribute('aria-pressed', 'false')
  await expect(
    modes.getByRole('radio', { name: 'Listen', exact: true }),
  ).toBeChecked()
})

test('the volume wheel scrubs relatively without jumping to the press position', async ({
  page,
}) => {
  await page.goto('/plonko/')
  const volume = page.getByRole('slider', { name: 'Volume', exact: true })
  await volume.fill('50')
  const wheel = (await page
    .locator('.volume-wheel [data-slot="slider-track"]')
    .boundingBox())!
  const start = { x: wheel.x + wheel.width * 0.2, y: wheel.y + 4 }
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await expect(volume).toHaveValue('50')
  await page.mouse.move(start.x + 40, start.y, { steps: 8 })
  await page.mouse.up()
  await expect(volume).toHaveValue('70')
  const right = { x: wheel.x + wheel.width * 0.9, y: start.y }
  await page.mouse.move(right.x, right.y)
  await page.mouse.down()
  await expect(volume).toHaveValue('70')
  await page.mouse.move(right.x, right.y + 40, { steps: 8 })
  await page.mouse.up()
  await expect(volume).toHaveValue('70')
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await expect(volume).toHaveValue('70')
  await page.mouse.move(start.x - 40, start.y, { steps: 8 })
  await page.keyboard.press('Escape')
  await page.mouse.up()
  await expect(volume).toHaveValue('70')
  await volume.fill('95')
  await page.mouse.move(start.x, start.y)
  await page.mouse.down()
  await page.mouse.move(start.x + 40, start.y, { steps: 8 })
  await page.mouse.up()
  await expect(volume).toHaveValue('100')
})

test('touch chords survive glissando and release each finger independently', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  })
  const page = await context.newPage()
  try {
    await page.goto('/plonko/')
    const c = page.getByRole('button', { name: 'Play C4', exact: true })
    const d = page.getByRole('button', { name: 'Play D4', exact: true })
    const e = page.getByRole('button', { name: 'Play E4', exact: true })
    const point = async (key: typeof c, id: number) => {
      const bounds = (await key.boundingBox())!
      return {
        x: bounds.x + bounds.width / 2,
        y: bounds.y + bounds.height - 30,
        id,
      }
    }
    const first = await point(c, 1)
    const second = await point(e, 2)
    const moved = await point(d, 1)
    const touch = await context.newCDPSession(page)
    await touch.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [first, second],
    })
    await expect(c).toHaveAttribute('data-active')
    await expect(e).toHaveAttribute('data-active')
    await expect(page.locator('.instrument-display strong')).toHaveText('C E')
    await expect(page.locator('.performance-hud')).toContainText('C4 · E4')
    await touch.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [moved, second],
    })
    await expect(c).not.toHaveAttribute('data-active')
    await expect(d).toHaveAttribute('data-active')
    await expect(e).toHaveAttribute('data-active')
    await expect(page.locator('.performance-hud')).toContainText('D4 · E4')
    await touch.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [second],
    })
    await expect(d).toHaveAttribute('data-active')
    await expect(e).not.toHaveAttribute('data-active')
    await touch.send('Input.dispatchTouchEvent', {
      type: 'touchCancel',
      touchPoints: [],
    })
    await expect(page.locator('[data-midi][data-active]')).toHaveCount(0)
    await expect(page.locator('.performance-hud')).toContainText(
      'Keyboard & touch',
    )
    expect(await page.evaluate(() => window.scrollY)).toBe(0)
    const volume = page.getByRole('slider', { name: 'Volume', exact: true })
    await volume.fill('50')
    const wheel = (await page
      .locator('.volume-wheel [data-slot="slider-track"]')
      .boundingBox())!
    const wheelPoint = (distance: number) => ({
      x: wheel.x + 12 + distance,
      y: wheel.y + 4,
      id: 3,
    })
    await touch.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [wheelPoint(0)],
    })
    await expect(volume).toHaveValue('50')
    await touch.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [wheelPoint(40)],
    })
    await touch.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    })
    const adjustedVolume = Number(await volume.inputValue())
    expect(adjustedVolume).toBe(70)
    await touch.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [wheelPoint(0)],
    })
    await touch.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [wheelPoint(-30)],
    })
    await touch.send('Input.dispatchTouchEvent', {
      type: 'touchCancel',
      touchPoints: [],
    })
    await expect(volume).toHaveValue('70')
    await page.getByRole('button', { name: 'Piano settings' }).tap()
    await page.getByRole('tab', { name: 'Sound', exact: true }).tap()
    await expect(volume).toHaveValue(String(adjustedVolume))
    await page.getByRole('switch', { name: 'Sustain pedal' }).tap()
    await expect(
      page.getByRole('switch', { name: 'Sustain pedal' }),
    ).toBeChecked()
  } finally {
    await context.close()
  }
})

test('settings pages support arrow navigation and preserve accepted edits', async ({
  page,
}) => {
  await page.goto('/plonko/')
  const trigger = page.getByRole('button', { name: 'Piano settings' })
  await trigger.click()
  await page.getByRole('tab', { name: 'Music', exact: true }).focus()
  await page.keyboard.press('ArrowRight')
  await expect(
    page.getByRole('tab', { name: 'Practice', exact: true }),
  ).toBeFocused()
  await expect(page.getByRole('tabpanel', { name: 'Practice' })).toBeVisible()
  await page.keyboard.press('ArrowRight')
  const volume = page.getByRole('slider', { name: 'Volume' })
  await volume.fill('37')
  await page.getByRole('tab', { name: 'Keys', exact: true }).click()
  await page.getByRole('textbox', { name: 'C4', exact: true }).fill('q')
  await page.getByRole('tab', { name: 'Sound', exact: true }).click()
  await expect(volume).toHaveValue('37')
  await page.keyboard.press('Escape')
  await expect(trigger).toBeFocused()
  await page.keyboard.down('q')
  await expect(page.locator('[data-midi="60"]')).toHaveAttribute('data-active')
  await page.keyboard.up('q')
  await expect(page.locator('[data-midi="60"]')).not.toHaveAttribute(
    'data-active',
  )
})

test('the page contains only the piano and rear controls support keyboard editing', async ({
  page,
}) => {
  await page.goto('/plonko/')
  await expect(
    page.locator('.piano-room header, .piano-room footer'),
  ).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: 'Piano settings' }),
  ).toBeVisible()
  await expect(page.getByRole('radiogroup', { name: 'Play mode' })).toBeHidden()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollHeight <= innerHeight,
    ),
  ).toBe(true)
  await page.getByRole('button', { name: 'Piano settings' }).click()
  await expect(
    page.getByRole('listbox', { name: 'Choose a song' }),
  ).toBeVisible()
  const songs = page.getByRole('option')
  await expect(songs).toHaveCount(3)
  await songs.first().focus()
  await page.keyboard.press('End')
  await expect(songs.last()).toBeFocused()
  await expect(songs.first()).toHaveAttribute('aria-selected', 'true')
  await page.keyboard.press('Enter')
  await expect(songs.last()).toHaveAttribute('aria-selected', 'true')
  await page.getByRole('radio', { name: 'Challenge', exact: true }).click()
  await page.getByRole('tab', { name: 'Practice', exact: true }).click()
  await page.getByRole('button', { name: 'Set practice section' }).click()
  const section = page.getByRole('button', { name: /Practice section from/ })
  const original = await section.getAttribute('aria-label')
  await section.focus()
  await page.keyboard.press('ArrowRight')
  await expect(section).not.toHaveAttribute('aria-label', original!)
  await page.keyboard.press('Delete')
  await expect(section).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(
    page.getByRole('button', { name: 'Piano settings' }),
  ).toBeFocused()
})

test('agent practice edits share the UI validation and accepted values', async ({
  page,
}) => {
  await page.goto('/plonko/')
  await page.getByRole('button', { name: 'Piano settings' }).click()
  const result = await page.evaluate(async () =>
    window.ouuoAgent.act({
      steps: [
        { ref: 'Play mode', action: 'setValue', args: ['challenge'] },
        { ref: 'Piano controls', action: 'setValue', args: ['practice'] },
        { ref: 'Practice timeline', action: 'setRange', args: [3, 8] },
        { ref: 'Playback speed', action: 'setValue', args: [0.75] },
      ],
    }),
  )
  expect(result.ok, JSON.stringify(result)).toBe(true)
  await expect(
    page.getByRole('button', { name: 'Practice section from 3 to 8 seconds' }),
  ).toBeVisible()
  await expect(
    page.getByRole('slider', { name: 'Playback speed' }),
  ).toHaveValue('0.75')
  await page.evaluate(async () =>
    window.ouuoAgent.act({
      steps: [
        { ref: 'Practice timeline', action: 'setRange', args: [-1, 999] },
      ],
    }),
  )
  await expect(
    page.getByRole('button', { name: 'Practice section from 3 to 8 seconds' }),
  ).toBeVisible()
})

test('practice drag drafts can be canceled, resized and looped', async ({
  page,
}) => {
  await page.goto('/plonko/')
  await page.getByRole('button', { name: 'Piano settings' }).click()
  await page.getByRole('radio', { name: 'Listen', exact: true }).click()
  await page.getByRole('tab', { name: 'Practice', exact: true }).click()
  const track = page.locator('.practice-track')
  await track.scrollIntoViewIfNeeded()
  const bounds = (await track.boundingBox())!
  const y = bounds.y + bounds.height / 2
  await page.mouse.move(bounds.x + bounds.width / 4, y)
  await page.mouse.down()
  await page.mouse.move(bounds.x + bounds.width / 2, y, { steps: 8 })
  await page.mouse.up()
  const section = page.getByRole('button', { name: /Practice section from/ })
  await expect(section).toHaveAttribute(
    'aria-label',
    'Practice section from 6 to 12 seconds',
  )
  const edge = section.locator('[data-span-edge="end"]')
  const edgeBounds = (await edge.boundingBox())!
  await page.mouse.move(edgeBounds.x + edgeBounds.width / 2, y)
  await page.mouse.down()
  await page.mouse.move(bounds.x + bounds.width * 0.625, y, { steps: 8 })
  await page.mouse.up()
  await expect(section).toHaveAttribute(
    'aria-label',
    'Practice section from 6 to 15 seconds',
  )
  const spanBounds = (await section.boundingBox())!
  await page.mouse.move(spanBounds.x + spanBounds.width / 2, y)
  await page.mouse.down()
  await page.mouse.move(spanBounds.x + spanBounds.width / 2 + 25, y, {
    steps: 5,
  })
  await page.keyboard.press('Escape')
  await page.mouse.up()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(section).toHaveAttribute(
    'aria-label',
    'Practice section from 6 to 15 seconds',
  )
  await page.evaluate(async () =>
    window.ouuoAgent.act({
      steps: [{ ref: 'Practice timeline', action: 'setRange', args: [2, 3] }],
    }),
  )
  await page.getByRole('switch', { name: 'Loop section' }).click()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Listen to First Light' }).click()
  await page.waitForTimeout(2200)
  await expect(page.locator('.piano-room')).toHaveAttribute(
    'data-phase',
    'running',
  )
  await expect(page.locator('.song-transport > span').first()).toHaveText(
    '0:02',
  )
  await page.getByRole('button', { name: 'Pause', exact: true }).click()
  await expect(page.locator('[data-midi][data-active]')).toHaveCount(0)
})

test('pointer glissando, shared note ownership and cancellation release voices', async ({
  page,
}) => {
  await page.goto('/plonko/')
  const c = page.getByRole('button', { name: 'Play C4', exact: true })
  const d = page.getByRole('button', { name: 'Play D4', exact: true })
  await c.click()
  const cb = (await c.boundingBox())!,
    db = (await d.boundingBox())!
  await page.mouse.move(cb.x + cb.width / 2, cb.y + cb.height - 20)
  await page.mouse.down()
  await page.keyboard.down('a')
  await page.mouse.move(db.x + db.width / 2, db.y + db.height - 20, {
    steps: 5,
  })
  await expect(c).toHaveAttribute('data-active')
  await expect(d).toHaveAttribute('data-active')
  await page.keyboard.up('a')
  await expect(c).not.toHaveAttribute('data-active')
  await d.dispatchEvent('pointercancel', { pointerId: 1 })
  await page.mouse.up()
  await expect(page.locator('[data-midi][data-active]')).toHaveCount(0)
})

test('a timed chord hold earns points on the real audio clock', async ({
  page,
}) => {
  await page.goto('/plonko/')
  await page.getByRole('button', { name: 'Piano settings' }).click()
  await page.getByRole('radio', { name: 'Challenge', exact: true }).click()
  await page.getByRole('tab', { name: 'Practice', exact: true }).click()
  await page.getByRole('radio', { name: 'Easy', exact: true }).click()
  await page.getByRole('slider', { name: 'Playback speed' }).fill('0.5')
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Start challenge' }).click()
  // Dispatch in the page's frame, so tracing and worker IPC cannot delay the chord past its judgement window.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        let pressed = false
        const frame = () => {
          const time =
            Number(
              document
                .querySelector('.song-progress > div')
                ?.getAttribute('style')
                ?.match(/scaleX\(([^)]+)/)?.[1],
            ) * 24
          if (!pressed && time >= 1.99) {
            for (const key of ['a', 'g'])
              window.dispatchEvent(new KeyboardEvent('keydown', { key }))
            pressed = true
          }
          if (pressed && time >= 3) {
            for (const key of ['a', 'g'])
              window.dispatchEvent(new KeyboardEvent('keyup', { key }))
            resolve()
          } else requestAnimationFrame(frame)
        }
        requestAnimationFrame(frame)
      }),
  )
  await expect(page.locator('.live-score span').first()).toContainText('200')
  await expect(page.locator('.live-score span').nth(1)).toContainText('2')
})

test('a second input can keep a note through delayed audio unlock', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const NativeAudio = window.AudioContext
    window.AudioContext = class extends NativeAudio {
      unlocked = false
      override get state() {
        return this.unlocked ? super.state : 'suspended'
      }
      override async resume() {
        await new Promise<void>((resolve) =>
          window.addEventListener('test:unlock', () => resolve(), {
            once: true,
          }),
        )
        this.unlocked = true
        await super.resume()
      }
    }
  })
  await page.goto('/plonko/')
  const c = page.getByRole('button', { name: 'Play C4', exact: true })
  await c.waitFor()
  await page.keyboard.down('a')
  const bounds = (await c.boundingBox())!
  await page.mouse.move(
    bounds.x + bounds.width / 2,
    bounds.y + bounds.height - 20,
  )
  await page.mouse.down()
  await page.keyboard.up('a')
  await page.evaluate(() => window.dispatchEvent(new Event('test:unlock')))
  await expect(c).toHaveAttribute('data-active')
  await page.mouse.up()
  await expect(c).not.toHaveAttribute('data-active')
})

for (const title of ['First Light', 'Violet Current', 'Afterglow']) {
  test(`the original ${title} plays through to completion`, async ({
    page,
  }) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    await page.goto('/plonko/')
    await page.getByRole('button', { name: 'Piano settings' }).click()
    await page.getByRole('option', { name: new RegExp(title) }).click()
    await page.getByRole('radio', { name: 'Listen', exact: true }).click()
    await page.getByRole('tab', { name: 'Practice', exact: true }).click()
    await page.getByRole('slider', { name: 'Playback speed' }).fill('1.5')
    await page.keyboard.press('Escape')
    await page.getByRole('button', { name: `Listen to ${title}` }).click()
    await expect(page.locator('[data-midi][data-active]').first()).toBeVisible({
      timeout: 5000,
    })
    await expect(page.locator('.piano-room')).toHaveAttribute(
      'data-phase',
      'complete',
      { timeout: 22000 },
    )
    await expect(page.locator('.performance-hud')).toContainText('Finished')
    await expect(page.locator('[data-midi][data-active]')).toHaveCount(0)
    expect(errors).toEqual([])
  })
}
