import { defineConfig, devices } from '@playwright/test'

// Browser tests run against the API serving the small test database from tests/conftest.py
// (tests/e2e_server.py), so the expected amounts never change and no ETL run is needed.
// Both servers use their own ports, so a dev setup on 8000/5173 can keep running.
const API_PORT = 8765
const WEB_PORT = 5174
// In the conda environment `python` already has the package; otherwise go through uv.
const python = process.env.CONDA_PREFIX ? 'python' : 'uv run python'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: [
    {
      command: `${python} ../tests/e2e_server.py`,
      url: `http://127.0.0.1:${API_PORT}/api/health`,
      env: { PK_PORT: String(API_PORT) },
      reuseExistingServer: !process.env.CI,
      stdout: 'pipe',
    },
    {
      command: `npm run dev -- --port ${WEB_PORT} --strictPort`,
      url: `http://localhost:${WEB_PORT}`,
      env: { PK_API_URL: `http://127.0.0.1:${API_PORT}` },
      reuseExistingServer: !process.env.CI,
    },
  ],
})
