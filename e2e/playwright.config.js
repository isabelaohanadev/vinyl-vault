const { defineConfig, devices } = require('@playwright/test');

// The app under test must already be running (docker compose up, or `npm run dev` at the root).
module.exports = defineConfig({
    testDir: './tests',
    timeout: 45_000,
    expect: { timeout: 8_000 },
    fullyParallel: false,
    workers: 1,
    retries: process.env.CI ? 1 : 0,
    reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
    use: {
        baseURL: process.env.BASE_URL || 'http://localhost:8080',
        locale: 'pt-BR',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure'
    },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }]
});
