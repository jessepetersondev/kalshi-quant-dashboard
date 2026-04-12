import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const alias = {
  "@kalshi-quant-dashboard/auth": fileURLToPath(
    new URL("./packages/auth/src/index.ts", import.meta.url)
  ),
  "@kalshi-quant-dashboard/config": fileURLToPath(
    new URL("./packages/config/src/index.ts", import.meta.url)
  ),
  "@kalshi-quant-dashboard/contracts": fileURLToPath(
    new URL("./packages/contracts/src/index.ts", import.meta.url)
  ),
  "@kalshi-quant-dashboard/db": fileURLToPath(
    new URL("./packages/db/src/index.ts", import.meta.url)
  ),
  "@kalshi-quant-dashboard/observability": fileURLToPath(
    new URL("./packages/observability/src/index.ts", import.meta.url)
  ),
  "@kalshi-quant-dashboard/source-adapters": fileURLToPath(
    new URL("./packages/source-adapters/src/index.ts", import.meta.url)
  ),
  "@kalshi-quant-dashboard/testing": fileURLToPath(
    new URL("./packages/testing/src/index.ts", import.meta.url)
  ),
  "@kalshi-quant-dashboard/ui": fileURLToPath(
    new URL("./packages/ui/src/index.ts", import.meta.url)
  )
};

export default defineConfig({
  resolve: {
    alias
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          environment: "node",
          include: ["tests/unit/**/*.test.ts"],
          name: "unit"
        }
      },
      {
        extends: true,
        test: {
          environment: "node",
          fileParallelism: false,
          include: ["tests/integration/**/*.test.ts"],
          maxWorkers: 1,
          minWorkers: 1,
          name: "integration"
        }
      },
      {
        extends: true,
        test: {
          environment: "node",
          include: ["tests/contract/**/*.test.ts"],
          name: "contract"
        }
      },
      {
        extends: true,
        test: {
          environment: "node",
          fileParallelism: false,
          include: ["tests/smoke/**/*.test.ts"],
          name: "smoke",
          testTimeout: 240_000
        }
      }
    ]
  }
});
