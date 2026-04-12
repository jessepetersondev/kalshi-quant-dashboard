import { defineConfig } from "@playwright/test";

import { createE2EEnvironment } from "./tests/e2e/support/environment.js";

export default defineConfig({
  fullyParallel: false,
  globalTeardown: "./tests/e2e/support/global-teardown.ts",
  reporter: "list",
  testDir: "./tests/e2e",
  timeout: 45_000,
  webServer: [
    {
      command:
        "bash -lc 'pnpm --filter @kalshi-quant-dashboard/auth build && pnpm --filter @kalshi-quant-dashboard/config build && pnpm --filter @kalshi-quant-dashboard/contracts build && pnpm --filter @kalshi-quant-dashboard/db build && pnpm --filter @kalshi-quant-dashboard/observability build && pnpm --filter @kalshi-quant-dashboard/source-adapters build && pnpm --filter @kalshi-quant-dashboard/testing build && pnpm exec tsx tests/e2e/support/start-api.ts'",
      env: createE2EEnvironment(),
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      url: "http://127.0.0.1:39001/api/health/readiness"
    },
    {
      command:
        "bash -lc 'pnpm --filter @kalshi-quant-dashboard/contracts build && pnpm --filter @kalshi-quant-dashboard/ui build && pnpm --filter web exec vite --host 127.0.0.1 --port 39000'",
      env: createE2EEnvironment(),
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      url: "http://127.0.0.1:39000/sign-in"
    }
  ],
  workers: 1,
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:39000"
  }
});
