import { expect, test } from '@playwright/test'

test('handheld powers on, launches every game, pauses safely and powers off', async ({
  page,
}) => {
  await page.goto('/pocket-arcade/')
  await page.getByRole('button', { name: 'Power on', exact: true }).click()
  await expect(
    page.getByRole('radiogroup', { name: 'Game library' }),
  ).toBeVisible()
  for (const name of ['Rhythm Rush', 'Pixel Racer', 'Mini Puzzle']) {
    await page.getByRole('radio', { name, exact: true }).click()
    const play = page.getByRole('button').filter({ hasText: 'Let’s play' })
    await expect.soft(play).toHaveAccessibleName(/Let’s play/)
    await play.click()
    await page.getByRole('button', { name: 'Begin game', exact: true }).click()
    await expect(page.getByLabel(`${name} game screen`)).toBeVisible()
    await page.keyboard.down('ArrowLeft')
    await expect(
      page.getByRole('button', { name: 'D-pad left', exact: true }),
    ).toHaveAttribute('data-held')
    await page.evaluate(() => window.dispatchEvent(new Event('blur')))
    await expect(
      page.getByRole('heading', { name: 'Paused', exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'D-pad left', exact: true }),
    ).not.toHaveAttribute('data-held')
    await page.keyboard.up('ArrowLeft')
    const resume = page.getByRole('button').filter({ hasText: 'Keep playing' })
    await expect.soft(resume).toHaveAccessibleName(/Keep playing/)
    await resume.click()
    await page
      .getByRole('button', { name: 'Start / pause', exact: true })
      .click()
    await page
      .getByRole('button', { name: 'Restart game', exact: true })
      .click()
    await page.keyboard.press('Escape')
    await page
      .getByRole('button', { name: 'Return to library', exact: true })
      .click()
  }
  await page.getByRole('button', { name: 'Power off', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Power on', exact: true }),
  ).toBeVisible()
})

test('power interrupts startup and can boot again with reduced motion', async ({
  page,
}) => {
  await page.goto('/pocket-arcade/')
  await page.clock.install()
  await page.clock.pauseAt(new Date(Date.now() + 1000))
  await page.getByRole('button', { name: 'Power on', exact: true }).click()
  await expect(
    page.getByRole('status', { name: 'Starting Pocket Arcade' }),
  ).toBeVisible()
  await page.clock.runFor(150)
  await page.getByRole('button', { name: 'Power off', exact: true }).click()
  await page.clock.runFor(1200)
  await expect(page.getByRole('radiogroup')).toHaveCount(0)
  await expect(
    page.getByText('Slide power to play', { exact: true }),
  ).toBeVisible()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.getByRole('button', { name: 'Power on', exact: true }).click()
  await expect(
    page.getByRole('status', { name: 'Starting Pocket Arcade' }),
  ).toBeVisible()
  await page.clock.runFor(1000)
  await expect(
    page.getByRole('radio', { name: 'Rhythm Rush', exact: true }),
  ).toBeFocused()
})

test('cartridge shortcuts work from the library without taking SDK navigation keys', async ({
  page,
}) => {
  await page.goto('/pocket-arcade/')
  await page.getByRole('button', { name: 'Power on', exact: true }).click()
  await expect(
    page.getByRole('radio', { name: 'Rhythm Rush', exact: true }),
  ).toBeFocused()
  await page.keyboard.press('ArrowDown')
  const racer = page.getByRole('radio', { name: 'Pixel Racer', exact: true })
  await expect(racer).toBeChecked()
  await expect(racer).toBeFocused()
  await page.keyboard.press('Space')
  await expect(racer).toBeChecked()
  await expect(page.getByRole('radiogroup')).toBeVisible()
  await page.keyboard.press('e')
  const puzzle = page.getByRole('radio', { name: 'Mini Puzzle', exact: true })
  await expect(puzzle).toBeChecked()
  await expect(puzzle).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(
    page.getByRole('radio', { name: 'Rhythm Rush', exact: true }),
  ).toBeChecked()
  await page
    .getByRole('button', { name: 'Next cartridge (R)', exact: true })
    .click()
  await expect(racer).toBeFocused()
  await page.keyboard.press('ArrowDown')
  await expect(puzzle).toBeChecked()
  await page.keyboard.press('q')
  await expect(racer).toBeChecked()
  await expect(racer).toBeFocused()
  const play = page.getByRole('button', { name: /Let’s play/ })
  await play.focus()
  await page.keyboard.press('e')
  await expect(puzzle).toBeChecked()
  await expect(play).toBeFocused()
  await page.keyboard.press('q')
  await page.keyboard.press('z')
  await expect(
    page.getByRole('heading', { name: 'Pixel Racer', exact: true }),
  ).toBeVisible()
  await page.keyboard.press('x')
  await expect(racer).toBeFocused()
  await page.keyboard.press('Shift')
  await expect(
    page.getByRole('dialog', { name: 'Console settings' }),
  ).toBeVisible()
  const volume = page.getByRole('slider', { name: 'Volume', exact: true })
  await volume.focus()
  await page.keyboard.press('ArrowRight')
  await expect(volume).toHaveValue('46')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('spaced text keeps game actions separate from settings on a small phone', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 })
  await page.goto('/pocket-arcade/')
  await page.getByRole('button', { name: 'Power on', exact: true }).click()
  await page.getByRole('radiogroup').waitFor()
  await page.addStyleTag({
    content: `
    .arcade-page * {
      line-height: 1.5 !important;
      letter-spacing: 0.12em !important;
      word-spacing: 0.16em !important;
    }
    .arcade-page p { margin-bottom: 2em !important; }
  `,
  })
  for (const name of ['Rhythm Rush', 'Pixel Racer', 'Mini Puzzle']) {
    await page.getByRole('radio', { name, exact: true }).click()
    await page.getByRole('button').filter({ hasText: 'Let’s play' }).click()
    const begin = page.getByRole('button', { name: 'Begin game', exact: true })
    await expect(begin).toBeFocused()
    const action = (await begin.boundingBox())!
    const content = (await page.locator('.overlay-content').boundingBox())!
    const settings = (await page
      .getByRole('button', { name: 'Console settings', exact: true })
      .boundingBox())!
    expect(action.y).toBeGreaterThanOrEqual(content.y)
    expect(action.y + action.height).toBeLessThanOrEqual(
      content.y + content.height,
    )
    expect(action.y + action.height).toBeLessThanOrEqual(settings.y)
    await begin.click()
    await expect(
      page.getByLabel(`${name} game screen`, { exact: true }),
    ).toBeVisible()
    await page.keyboard.press('Escape')
    await page.getByRole('button').filter({ hasText: 'Keep playing' }).click()
    await expect(
      page.getByLabel(`${name} game screen`, { exact: true }),
    ).toBeVisible()
    await page.keyboard.press('Escape')
    await page
      .getByRole('button', { name: 'Return to library', exact: true })
      .click()
  }
})

test('SDK settings are agent-operable, keyboard accessible and restore focus', async ({
  page,
}) => {
  await page.goto('/pocket-arcade/')
  await page.getByRole('button', { name: 'Power on', exact: true }).click()
  const settings = page.getByRole('button', {
    name: 'Console settings',
    exact: true,
  })
  await settings.click()
  await expect(
    page.getByRole('dialog', { name: 'Console settings' }),
  ).toBeVisible()
  const screenBounds = await page.locator('.screen-glass').boundingBox()
  const dialogBounds = await page.getByRole('dialog').boundingBox()
  expect(dialogBounds!.x).toBeCloseTo(screenBounds!.x, 0)
  expect(dialogBounds!.y).toBeCloseTo(screenBounds!.y, 0)
  expect(dialogBounds!.width).toBeCloseTo(screenBounds!.width, 0)
  expect(dialogBounds!.height).toBeCloseTo(screenBounds!.height, 0)
  await page.setViewportSize({ width: 320, height: 740 })
  await expect(page.getByText('↓ More settings', { exact: true })).toBeVisible()
  const scrollRegion = page.getByRole('region', {
    name: 'Sound and keyboard settings',
  })
  await scrollRegion.focus()
  await page.keyboard.press('End')
  await expect(
    page.getByText('↑ Sound settings', { exact: true }),
  ).toBeVisible()
  await page.keyboard.press('Home')
  await expect(page.getByText('↓ More settings', { exact: true })).toBeVisible()
  const back = page.getByRole('button', {
    name: 'Back to console',
    exact: true,
  })
  const backBefore = (await back.boundingBox())!
  const bindings = page
    .getByRole('dialog')
    .getByText('Cartridge', { exact: true })
  await bindings.scrollIntoViewIfNeeded()
  const bindingBounds = (await bindings.boundingBox())!
  const backAfter = (await back.boundingBox())!
  expect(backAfter.y).toBe(backBefore.y)
  expect(bindingBounds.y + bindingBounds.height).toBeLessThanOrEqual(
    backAfter.y,
  )
  await back.click()
  await expect(settings).toBeFocused()
  await settings.click()
  const result = await page.evaluate(() =>
    window.ouuoAgent.act({
      steps: [
        { ref: 'Volume', action: 'setValue', args: [23] },
        { ref: 'Brightness', action: 'setValue', args: [65] },
      ],
    }),
  )
  expect(result.ok, JSON.stringify(result)).toBe(true)
  await expect(
    page.getByRole('slider', { name: 'Volume', exact: true }),
  ).toHaveValue('23')
  await page.getByRole('slider', { name: 'Brightness', exact: true }).focus()
  await page.keyboard.press('Home')
  await expect(
    page.getByRole('slider', { name: 'Brightness', exact: true }),
  ).toHaveValue('40')
  await expect(page.locator('.screen-glass')).toHaveCSS(
    'filter',
    'brightness(0.4)',
  )
  await page.keyboard.press('Escape')
  await expect(settings).toBeFocused()
})

for (const [name, ending] of [
  ['Rhythm Rush', 'Track complete'],
  ['Pixel Racer', 'Out of road'],
]) {
  test(`${name} reaches results and can replay without reloading`, async ({
    page,
  }) => {
    test.setTimeout(35000)
    await page.goto('/pocket-arcade/')
    await page.getByRole('button', { name: 'Power on', exact: true }).click()
    await page.getByRole('radio', { name, exact: true }).click()
    await page
      .getByRole('button', { name: `Let’s play ${name}`, exact: true })
      .click()
    await page.getByRole('button', { name: 'Begin game', exact: true }).click()
    await expect(
      page.getByRole('heading', { name: ending, exact: true }),
    ).toBeVisible({ timeout: 28000 })
    await page.getByRole('button', { name: 'Play again', exact: true }).click()
    await expect(page.getByLabel(`${name} game screen`)).toBeVisible()
    await page.keyboard.press('Escape')
    await page
      .getByRole('button', { name: 'Return to library', exact: true })
      .click()
  })
}

test('puzzle keeps progress across resizes and completes the seven-move solution', async ({
  page,
}) => {
  await page.goto('/pocket-arcade/')
  await page.getByRole('button', { name: 'Power on', exact: true }).click()
  await page.getByRole('radio', { name: 'Mini Puzzle', exact: true }).click()
  await page
    .getByRole('button', { name: 'Let’s play Mini Puzzle', exact: true })
    .click()
  await page.getByRole('button', { name: 'Begin game', exact: true }).click()
  await page.setViewportSize({ width: 390, height: 844 })
  for (const [index, key] of [
    'ArrowRight',
    'ArrowDown',
    'z',
    'z',
    'z',
    'ArrowDown',
    'ArrowDown',
    'ArrowRight',
    'ArrowRight',
    'z',
    'z',
    'ArrowRight',
    'z',
    'ArrowDown',
    'ArrowLeft',
    'z',
    'ArrowRight',
    'ArrowRight',
    'z',
    'ArrowDown',
    'ArrowLeft',
    'z',
  ].entries()) {
    await page.keyboard.press(key)
    if (index === 3) await page.setViewportSize({ width: 320, height: 740 })
    if (index === 10) await page.setViewportSize({ width: 1440, height: 900 })
  }
  await expect(
    page.getByRole('heading', { name: 'Every window glowing' }),
  ).toBeVisible()
  await expect(page.locator('.final-score')).toHaveText('930 points')
  await page.getByRole('button', { name: 'Play again', exact: true }).click()
  await expect(page.getByLabel('Mini Puzzle game screen')).toBeVisible()
})

test('simultaneous touch and keyboard sources release independently and cancel safely', async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/pocket-arcade/')
  await page.getByRole('button', { name: 'Power on', exact: true }).click()
  await page.getByRole('radio', { name: 'Pixel Racer', exact: true }).click()
  await page
    .getByRole('button', { name: 'Let’s play Pixel Racer', exact: true })
    .click()
  await page.getByRole('button', { name: 'Begin game', exact: true }).click()
  await expect
    .poll(() =>
      page.getByLabel('Pixel Racer game screen').evaluate((element) => {
        const canvas = element as HTMLCanvasElement
        return Math.abs(
          canvas.width / canvas.height -
            canvas.clientWidth / canvas.clientHeight,
        )
      }),
    )
    .toBeLessThan(0.01)
  const left = page.getByRole('button', { name: 'D-pad left', exact: true })
  const action = page.getByRole('button', { name: 'A button', exact: true })
  const points = await Promise.all(
    [left, action].map(async (locator, id) => {
      const box = (await locator.boundingBox())!
      return { x: box.x + box.width / 2, y: box.y + box.height / 2, id }
    }),
  )
  const session = await context.newCDPSession(page)
  await session.send('Emulation.setTouchEmulationEnabled', {
    enabled: true,
    maxTouchPoints: 5,
  })
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: points,
  })
  await expect(left).toHaveAttribute('data-held')
  await expect(action).toHaveAttribute('data-held')
  await page.keyboard.down('ArrowLeft')
  await page.keyboard.up('ArrowLeft')
  await expect(left).toHaveAttribute('data-held')
  await session.send('Input.dispatchTouchEvent', {
    type: 'touchCancel',
    touchPoints: [],
  })
  await expect(left).not.toHaveAttribute('data-held')
  await expect(action).not.toHaveAttribute('data-held')
  await expect(
    page.getByRole('button', { name: 'Previous cartridge (L)', exact: true }),
  ).toBeDisabled()
})

test('audio failure is visible and does not block games', async ({ page }) => {
  await page.addInitScript(() => {
    const NativeAudio = window.AudioContext
    let attempts = 0
    window.AudioContext = class extends NativeAudio {
      constructor(options?: AudioContextOptions) {
        if (attempts++ === 0) throw new Error('Audio unavailable')
        super(options)
      }
    }
  })
  await page.goto('/pocket-arcade/')
  await page.getByRole('button', { name: 'Power on', exact: true }).click()
  await expect(page.getByText('audio unavailable · see settings')).toBeVisible()
  await page
    .getByRole('button', { name: 'Let’s play Rhythm Rush', exact: true })
    .click()
  await page.getByRole('button', { name: 'Begin game', exact: true }).click()
  await expect(page.getByLabel('Rhythm Rush game screen')).toBeVisible()
  await page
    .getByRole('button', { name: 'Select / settings', exact: true })
    .click()
  await page.getByRole('button', { name: 'Retry audio', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Retry audio', exact: true }),
  ).toHaveCount(0)
  await page
    .getByRole('button', { name: 'Back to console', exact: true })
    .click()
  await expect(page.getByText('sound on', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Keep playing', exact: true }).click()
  await expect(page.getByLabel('Rhythm Rush game screen')).toBeVisible()
})

test('handheld fits small phones and landscape with reduced motion', async ({
  page,
}) => {
  await page.goto('/pocket-arcade/')
  await expect(page.locator('.console')).toHaveCSS('transform', 'none')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const [width, height] of [
    [320, 740],
    [390, 844],
    [768, 1024],
    [1440, 900],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height })
    await page.goto('/pocket-arcade/')
    await expect(page.locator('.console')).toHaveCSS('transform', 'none')
    await expect(page.locator('header, footer')).toHaveCount(0)
    await page.getByRole('button', { name: 'Power on', exact: true }).click()
    await expect(
      page.getByRole('radio', { name: 'Rhythm Rush', exact: true }),
    ).toBeVisible()
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true)
    const lastChoice = await page.getByRole('radio').last().boundingBox()
    const play = await page
      .getByRole('button', { name: 'Let’s play Rhythm Rush', exact: true })
      .boundingBox()
    const screen = await page.locator('.screen-glass').boundingBox()
    expect(play!.y).toBeGreaterThanOrEqual(
      lastChoice!.y + lastChoice!.height + 4,
    )
    expect(play!.y + play!.height).toBeLessThanOrEqual(
      screen!.y + screen!.height - 4,
    )
    const pad = await page
      .getByRole('button', { name: 'D-pad left', exact: true })
      .boundingBox()
    expect(pad?.width).toBeGreaterThanOrEqual(44)
    expect(pad?.height).toBeGreaterThanOrEqual(44)
    const next = page.getByRole('button', {
      name: 'Next cartridge (R)',
      exact: true,
    })
    const previous = page.getByRole('button', {
      name: 'Previous cartridge (L)',
      exact: true,
    })
    for (const shoulder of [next, previous]) {
      const bounds = (await shoulder.boundingBox())!
      expect(bounds.width).toBeGreaterThanOrEqual(44)
      expect(bounds.height).toBeGreaterThanOrEqual(44)
    }
    await next.click()
    await expect(
      page.getByRole('radio', { name: 'Pixel Racer', exact: true }),
    ).toBeChecked()
    await previous.click()
    await expect(
      page.getByRole('radio', { name: 'Rhythm Rush', exact: true }),
    ).toBeChecked()
    const shoulderBounds = (await next.boundingBox())!
    const shellBounds = (await page.locator('.console').boundingBox())!
    await page.keyboard.press('Tab')
    await next.focus()
    const focusedShoulder = (await next.boundingBox())!
    const focusedShell = (await page.locator('.console').boundingBox())!
    expect(focusedShoulder.x - focusedShell.x).toBe(
      shoulderBounds.x - shellBounds.x,
    )
    expect(focusedShoulder.y - focusedShell.y).toBe(
      shoulderBounds.y - shellBounds.y,
    )
    await page.keyboard.press('Enter')
    await expect(
      page.getByRole('radio', { name: 'Pixel Racer', exact: true }),
    ).toBeChecked()
    if (width > 700) {
      const well = await page.locator('.dpad-well').boundingBox()
      const bezel = await page.locator('.screen-bezel').boundingBox()
      expect(well!.x + well!.width + 4).toBeLessThanOrEqual(bezel!.x)
    }
  }
})
