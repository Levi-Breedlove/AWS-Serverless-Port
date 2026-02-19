const { defineConfig } = require('@playwright/test')
const path = require('path')

const fileUrl = `file://${path.join(__dirname, 'index.html')}`

module.exports = defineConfig({
  testDir: './tests',
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: fileUrl,
    browserName: 'chromium',
    headless: true,
    launchOptions: {
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      chromiumSandbox: false,
    },
  },
  webServer: undefined,
})
