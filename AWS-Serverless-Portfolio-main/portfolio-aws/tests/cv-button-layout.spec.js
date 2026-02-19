const fs = require('fs')
const path = require('path')
const { test, expect } = require('@playwright/test')

const VIEWPORTS = [
  { width: 1920, height: 1200 },
  { width: 1536, height: 864 },
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 430, height: 932 },
  { width: 375, height: 812 },
  { width: 320, height: 568 },
]

const TEST_ID = '[data-testid="download-cv"]'
const TOP_PROFILE = '.top-profile'
const TOLERANCE = 1
const CURRENT_DIR = path.join(__dirname, 'snapshots', 'current')

for (const viewport of VIEWPORTS) {
  const label = `${viewport.width}x${viewport.height}`

  test(`cv-button layout regression @ ${label}`, async ({ browser }) => {
    fs.mkdirSync(CURRENT_DIR, { recursive: true })

    const context = await browser.newContext({ viewport })
    const page = await context.newPage()

    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle')

    // Freeze motion so snapshots and geometry are deterministic.
    await page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation: none !important;
          transition: none !important;
        }
        .top-profile-matrix,
        [data-matrix-rain] {
          opacity: 0 !important;
          visibility: hidden !important;
        }
      `,
    })

    await page.evaluate(async () => {
      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready
      }
    })

    const hasNoHorizontalScroll = await page.evaluate(
      () => document.documentElement.scrollWidth === document.documentElement.clientWidth,
    )
    expect(hasNoHorizontalScroll).toBe(true)

    const layout = await page.evaluate(({ selector, tolerance }) => {
      const round = (value) => Number(value.toFixed(3))
      const serialize = (rect) => ({
        left: round(rect.left),
        top: round(rect.top),
        right: round(rect.right),
        bottom: round(rect.bottom),
        width: round(rect.width),
        height: round(rect.height),
      })

      const button = document.querySelector(selector)
      if (!button) {
        return { missing: true, reason: 'Button not found' }
      }

      const parent = button.closest('.top-profile-action') || button.parentElement
      if (!parent) {
        return { missing: true, reason: 'Button parent not found' }
      }

      const buttonRect = button.getBoundingClientRect()
      const parentRect = parent.getBoundingClientRect()

      const insideParent =
        buttonRect.left >= parentRect.left - tolerance &&
        buttonRect.top >= parentRect.top - tolerance &&
        buttonRect.right <= parentRect.right + tolerance &&
        buttonRect.bottom <= parentRect.bottom + tolerance

      const childOverflow = []
      for (const child of button.querySelectorAll('*')) {
        const rect = child.getBoundingClientRect()
        const exceeds =
          rect.left < buttonRect.left - tolerance ||
          rect.top < buttonRect.top - tolerance ||
          rect.right > buttonRect.right + tolerance ||
          rect.bottom > buttonRect.bottom + tolerance

        if (exceeds) {
          childOverflow.push({
            tag: child.tagName.toLowerCase(),
            className: child.className || '',
            rect: serialize(rect),
          })
        }
      }

      return {
        missing: false,
        insideParent,
        buttonRect: serialize(buttonRect),
        parentRect: serialize(parentRect),
        childOverflow,
      }
    }, { selector: TEST_ID, tolerance: TOLERANCE })

    expect(layout.missing, layout.reason || 'Button lookup failed').toBe(false)
    expect(layout.insideParent, JSON.stringify(layout, null, 2)).toBe(true)
    expect(layout.childOverflow, JSON.stringify(layout, null, 2)).toEqual([])

    const topProfile = page.locator(TOP_PROFILE)
    await expect(topProfile).toBeVisible()

    const currentShot = path.join(CURRENT_DIR, `top-profile-${label}.png`)
    await topProfile.screenshot({ path: currentShot })

    if (viewport.width === 1920 && viewport.height === 1200) {
      const glowInset = await page.evaluate((selector) => {
        const button = document.querySelector(selector)
        if (!button) return null
        const pseudo = getComputedStyle(button, '::before')
        return {
          left: pseudo.left,
          right: pseudo.right,
        }
      }, TEST_ID)

      expect(glowInset).not.toBeNull()
      expect(glowInset.left).toBe('0px')
      expect(glowInset.right).toBe('0px')

      await expect(topProfile).toHaveScreenshot('top-profile-1920x1200.png', {
        animations: 'disabled',
        caret: 'hide',
        scale: 'css',
        maxDiffPixelRatio: 0.001,
      })
    }

    await context.close()
  })
}
