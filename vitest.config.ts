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
    coverage: {
      all: true,
      provider: "v8",
      reporter: ["text", "json-summary", "html"],
      reportsDirectory: "./coverage/unit",
      exclude: [
        "**/*.d.ts",
        "**/*.js",
        "**/dist/**",
        "**/index.ts"
      ],
      include: [
        "packages/auth/src/capabilities.ts",
        "packages/auth/src/export-scope.ts",
        "packages/auth/src/roles.ts",
        "packages/auth/src/scope.ts",
        "packages/config/src/env.ts",
        "packages/config/src/runtime-config.ts",
        "packages/config/src/secrets.ts",
        "packages/source-adapters/src/base/adapter-registry.ts",
        "packages/source-adapters/src/base/source-binding-resolver.ts",
        "packages/source-adapters/src/base/strategy-registry.ts",
        "packages/source-adapters/src/compatibility/field-mappings.ts",
        "packages/source-adapters/src/compatibility/source-profiles.ts",
        "apps/api/src/auth/capability-cache.ts",
        "apps/api/src/auth/effective-capability-resolver.ts",
        "apps/api/src/auth/export-scope-resolver.ts",
        "apps/api/src/auth/policy-evaluator.ts",
        "apps/ingest/src/alerts/alert-evaluator.ts",
        "apps/ingest/src/health/ingest-health-state.ts",
        "apps/ingest/src/normalization/no-order-normalizer.ts",
        "apps/ingest/src/normalization/skip-normalizer.ts",
        "apps/ingest/src/reconciliation/convergence-service.ts",
        "apps/ingest/src/runtime/smoke-heartbeat-refresher.ts",
        "apps/web/src/features/format/dateTime.ts",
        "apps/web/src/features/lifecycle/selectors.ts",
        "apps/web/src/features/live/pauseBuffer.ts",
        "apps/web/src/features/live/streamClient.ts",
        "apps/web/src/features/live/streamStatus.ts"
      ],
      thresholds: {
        statements: 85,
        branches: 85,
        functions: 85,
        lines: 85
      }
    },
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
