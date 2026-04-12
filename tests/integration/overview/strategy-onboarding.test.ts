import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";

import { query } from "@kalshi-quant-dashboard/db";
import {
  bootstrapTestDatabase,
  resetFoundationalState,
  shutdownTestDatabase
} from "@kalshi-quant-dashboard/testing";
import { strategySummarySchema } from "@kalshi-quant-dashboard/contracts";

import { buildApp } from "../../../apps/api/src/app.js";

describe.sequential("strategy onboarding visibility", () => {
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    await bootstrapTestDatabase();
    app = await buildApp();
  });

  afterAll(async () => {
    await app.close();
    await shutdownTestDatabase();
  });

  beforeEach(async () => {
    await resetFoundationalState();
    app.capabilityCache.invalidate();
  });

  test("list newly configured strategies without code changes", async () => {
    await query(
      `
        insert into strategies (
          strategy_id,
          display_name,
          repo_name,
          symbol,
          enabled,
          seeded_initial_strategy,
          source_path_mode,
          health_status
        )
        values (
          'ada',
          'ADA Quant',
          'kalshi-ada-quant',
          'ADA',
          true,
          false,
          'direct_only',
          'unknown'
        )
        on conflict (strategy_id) do update
        set display_name = excluded.display_name,
            repo_name = excluded.repo_name,
            symbol = excluded.symbol,
            enabled = excluded.enabled,
            seeded_initial_strategy = excluded.seeded_initial_strategy,
            source_path_mode = excluded.source_path_mode,
            health_status = excluded.health_status
      `
    );

    const response = await app.inject({
      method: "GET",
      url: "/api/strategies",
      headers: {
        "x-dashboard-user": "admin@example.internal"
      }
    });

    expect(response.statusCode).toBe(200);
    const body = response.json() as { items: unknown[] };
    const items = body.items.map((item) => strategySummarySchema.parse(item));

    expect(items.some((item) => item.strategyId === "ada")).toBe(true);
    expect(items.find((item) => item.strategyId === "ada")?.sourcePathMode).toBe(
      "direct_only"
    );
  });
});
