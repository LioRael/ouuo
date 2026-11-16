import { expect, test } from '@playwright/test'
import { notesFor, tracks } from '../apps/plonko/src/music'

test('collection opens the real instrument and the about dialog restores focus', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/ouuo/)
  const about = page.getByRole('button', { name: 'About this room' })
  await about.click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(about).toBeFocused()
  await page.getByRole('link', { name: 'Play plonko', exact: true }).click()
  await expect(page).toHaveURL(/\/plonko\/$/)
  await expect(page).toHaveTitle('plonko · ouuo')
  await expect(
    page.getByRole('heading', { name: 'plonko', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('button', { name: 'Play C4', exact: true }),
  ).toBeVisible()
})

test('plonko opens directly and legacy piano links still work after reload', async ({
  page,
}) => {
  for (const route of [
    '/plonko',
    '/plonko/',
    '/glass-piano',
    '/glass-piano/',
  ]) {
    await page.goto(route)
    await page.reload()
    await expect(page).toHaveTitle('plonko · ouuo')
    await expect(
      page.getByRole('main', { name: 'plonko', exact: true }),
    ).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Play C4', exact: true }),
    ).toBeVisible()
  }
})

test('piano plays keyboard chords, releases on blur and exposes working SDK settings', async ({
  page,
}) => {
  await page.goto('/plonko/')
  await page.getByRole('button', { name: 'Piano settings' }).click()
  await page.getByRole('tab', { name: 'Sound', exact: true }).click()
  await page.getByRole('button', { name: 'Enable sound' }).click()
  await page.keyboard.press('Escape')
  await page.keyboard.down('a')
  await page.keyboard.down('d')
  await expect(
    page.getByRole('button', { name: 'Play C4', exact: true }),
  ).toHaveAttribute('data-active')
  await expect(
    page.getByRole('button', { name: 'Play E4', exact: true }),
  ).toHaveAttribute('data-active')
  await page.evaluate(() => window.dispatchEvent(new Event('blur')))
  await expect(
    page.getByRole('button', { name: 'Play C4', exact: true }),
  ).not.toHaveAttribute('data-active')
  await page.keyboard.up('a')
  await page.keyboard.up('d')
  const settings = page.getByRole('button', { name: 'Piano settings' })
  await settings.click()
  await page.getByRole('tab', { name: 'Sound', exact: true }).click()
  const volume = page.getByRole('slider', { name: 'Volume' })
  await volume.focus()
  await page.keyboard.press('Home')
  await expect(volume).toHaveValue('0')
  const labels = page.getByRole('switch', { name: 'Key labels' })
  await labels.focus()
  await page.keyboard.press('Space')
  await expect(labels).not.toBeChecked()
  await page.keyboard.press('Escape')
  await expect(settings).toBeFocused()
  await expect(page.locator('.piano-key kbd').first()).toBeHidden()
})

test('song can start, pause, resume, restart and complete', async ({
  page,
}) => {
  await page.goto('/plonko/')
  await page.getByRole('button', { name: 'Piano settings' }).click()
  await page.getByRole('radio', { name: 'Challenge', exact: true }).click()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Start challenge' }).click()
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()
  await page.getByRole('button', { name: 'Pause' }).click()
  await expect(page.getByText('Paused', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Resume' }).click()
  await page.getByRole('button', { name: 'Restart' }).click()
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'A little music, made by you.' }),
  ).toBeVisible({ timeout: 35000 })
  await expect(page.getByTestId('final-misses')).toHaveText(
    String(notesFor(tracks[0], 'normal').length),
  )
  await page.getByRole('button', { name: 'Play again' }).click()
  await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible()
})

test('mobile and reduced-motion layouts stay inside the viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const route of ['/', '/plonko/', '/tiny-studio/', '/pocket-arcade/']) {
    await page.goto(route)
    await expect(page.locator('h1')).toBeVisible()
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true)
  }
})

test('UI SDK agent can find named controls and change live piano settings', async ({
  page,
}) => {
  await page.goto('/plonko/')
  await expect(
    page.getByRole('button', { name: 'Piano settings' }),
  ).toBeVisible()
  const snapshot = await page.evaluate(() => window.ouuoAgent.snapshot())
  expect(snapshot.every((entry) => entry.label.trim().length > 0)).toBe(true)
  expect(snapshot.map((entry) => entry.label)).toContain('Piano settings')
  const result = await page.evaluate(async () => {
    return window.ouuoAgent.act({
      steps: [
        { ref: 'Piano settings', action: 'press' },
        { ref: 'Play mode', action: 'setValue', args: ['Challenge'] },
        { ref: 'Piano controls', action: 'setValue', args: ['sound'] },
        { ref: 'Volume', action: 'setValue', args: [23] },
        { ref: 'Key labels', action: 'setChecked', args: [false] },
      ],
    })
  })
  expect(result.ok, JSON.stringify(result)).toBe(true)
  await expect(page.getByRole('slider', { name: 'Volume' })).toHaveValue('23')
  await expect(
    page.getByRole('switch', { name: 'Key labels' }),
  ).not.toBeChecked()
})
