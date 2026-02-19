const { defineConfig } = require('@playwright/test')

module.exports = defineConfig({
  testDir: './tests',
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    headless: true,
  },
  webServer: {
    command: 'python3 -m http.server 4173',
    cwd: __dirname,
    port: 4173,
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
