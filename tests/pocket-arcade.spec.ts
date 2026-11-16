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
    await page
      .getByRole('button', { name: `Play ${name}`, exact: true })
      .click()
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
    await page.getByRole('button', { name: 'Resume game', exact: true }).click()
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
      .getByRole('button', { name: `Play ${name}`, exact: true })
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

test('puzzle completes all three boards with the documented seven-move solution', async ({
  page,
}) => {
  await page.goto('/pocket-arcade/')
  await page.getByRole('button', { name: 'Power on', exact: true }).click()
  await page.getByRole('radio', { name: 'Mini Puzzle', exact: true }).click()
  await page
    .getByRole('button', { name: 'Play Mini Puzzle', exact: true })
    .click()
  await page.getByRole('button', { name: 'Begin game', exact: true }).click()
  for (const key of [
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
  ])
    await page.keyboard.press(key)
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
    .getByRole('button', { name: 'Play Pixel Racer', exact: true })
    .click()
  await page.getByRole('button', { name: 'Begin game', exact: true }).click()
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
    .getByRole('button', { name: 'Play Rhythm Rush', exact: true })
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
  await page.getByRole('button', { name: 'Resume game', exact: true }).click()
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
      .getByRole('button', { name: 'Play Rhythm Rush', exact: true })
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
  }
})
