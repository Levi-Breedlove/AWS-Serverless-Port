const fs = require('fs')
const os = require('os')
const path = require('path')

const { test, expect } = require('@playwright/test')

function findChromiumExecutablePath() {
  const envPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
  if (envPath && fs.existsSync(envPath)) return envPath

  const cacheDir = path.join(os.homedir(), '.cache', 'ms-playwright')
  try {
    const entries = fs
      .readdirSync(cacheDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.startsWith('chromium-'))
      .map((entry) => ({
        name: entry.name,
        revision: Number(entry.name.split('-')[1]) || 0,
      }))
      .sort((a, b) => b.revision - a.revision)

    for (const entry of entries) {
      const candidate = path.join(cacheDir, entry.name, 'chrome-linux', 'chrome')
      if (fs.existsSync(candidate)) return candidate
    }
  } catch {
    // ignore
  }

  return undefined
}

const chromiumExecutablePath = findChromiumExecutablePath()

test.use({
  browserName: 'chromium',
  viewport: { width: 1920, height: 1200 },
  reducedMotion: 'reduce',
  launchOptions: {
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    ...(chromiumExecutablePath ? { executablePath: chromiumExecutablePath } : {}),
  },
})

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    Math.random = () => 0.123456789

    const style = document.createElement('style')
    style.textContent = `
      *, *::before, *::after { animation: none !important; transition: none !important; }
      canvas[data-matrix-rain] { display: none !important; }
    `
    document.documentElement.appendChild(style)
  })
})

function expectBoxClose(actual, expected, tolerancePx = 1) {
  expect(actual, 'element should have a bounding box').toBeTruthy()
  for (const key of ['x', 'y', 'width', 'height']) {
    expect(Math.abs(actual[key] - expected[key]), `box.${key} within ${tolerancePx}px`).toBeLessThanOrEqual(tolerancePx)
  }
}

test('freezes right panel layout at 1920x1200', async ({ page }) => {
  const fileUrl = `file://${path.resolve(__dirname, '..', 'index.html')}`
  await page.goto(fileUrl, { waitUntil: 'load' })
  await page.getByTestId('hdr-card').waitFor()
  await page.evaluate(async () => {
    await document.fonts?.ready
  })

  const cardBox = await page.getByTestId('hdr-card').boundingBox()
  const dividerBox = await page.getByTestId('hdr-divider').boundingBox()
  expect(cardBox, 'hdr-card should have a bounding box').toBeTruthy()
  expect(dividerBox, 'hdr-divider should have a bounding box').toBeTruthy()
  const cardCenterX = cardBox.x + cardBox.width / 2
  const dividerCenterX = dividerBox.x + dividerBox.width / 2
  expect(Math.abs(dividerCenterX - cardCenterX), 'divider centered at 50%').toBeLessThanOrEqual(1)

  const avatarFrameBox = await page.locator('[data-testid="hdr-avatar"] .profile-frame').boundingBox()
  const nameBlockBox = await page.getByTestId('hdr-nameblock').boundingBox()
  expect(avatarFrameBox, 'avatar frame should have a bounding box').toBeTruthy()
  expect(nameBlockBox, 'hdr-nameblock should have a bounding box').toBeTruthy()
  const avatarCenterY = avatarFrameBox.y + avatarFrameBox.height / 2
  const nameCenterY = nameBlockBox.y + nameBlockBox.height / 2
  expect(Math.abs(avatarCenterY - nameCenterY), 'title centered with avatar frame').toBeLessThanOrEqual(2)

  const expected = {
    hdrRight: { x: 960, y: 1, width: 575, height: 158 },
    hdrEmail: { x: 1038.390625, y: 57.41749954223633, width: 123.9375, height: 38.124996185302734 },
    hdrLocation: { x: 1185.515625, y: 57.41749954223633, width: 123.953125, height: 38.124996185302734 },
    hdrStatus: { x: 1332.65625, y: 57.41749954223633, width: 123.9375, height: 38.124996185302734 },
  }

  const rightBox = await page.getByTestId('hdr-right').boundingBox()
  const emailBox = await page.getByTestId('hdr-email').boundingBox()
  const locationBox = await page.getByTestId('hdr-location').boundingBox()
  const statusBox = await page.getByTestId('hdr-status').boundingBox()

  expectBoxClose(rightBox, expected.hdrRight)
  expectBoxClose(emailBox, expected.hdrEmail)
  expectBoxClose(locationBox, expected.hdrLocation)
  expectBoxClose(statusBox, expected.hdrStatus)

  const { innerWidth, scrollWidth } = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))
  expect(scrollWidth, 'no horizontal overflow').toBeLessThanOrEqual(innerWidth)

  await expect(page.getByTestId('hdr-card')).toHaveScreenshot('header-1920.png', {
    animations: 'disabled',
    caret: 'hide',
  })
})

test('no horizontal overflow across common viewports', async ({ page }) => {
  const fileUrl = `file://${path.resolve(__dirname, '..', 'index.html')}`
  await page.goto(fileUrl, { waitUntil: 'domcontentloaded' })
  await page.getByTestId('hdr-card').waitFor()

  const viewports = [
    { width: 320, height: 800 },
    { width: 375, height: 800 },
    { width: 768, height: 900 },
    { width: 1024, height: 900 },
    { width: 1920, height: 1200 },
  ]

  for (const viewport of viewports) {
    await page.setViewportSize(viewport)
    await page.waitForTimeout(50)
    const { innerWidth, scrollWidth } = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }))
    expect(scrollWidth, `no horizontal overflow at ${viewport.width}x${viewport.height}`).toBeLessThanOrEqual(innerWidth)
  }
})
