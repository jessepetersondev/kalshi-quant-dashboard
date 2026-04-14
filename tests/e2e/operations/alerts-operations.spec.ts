import { expect, test } from "@playwright/test";

import { signInAs } from "../support/auth.js";
import {
  prepareOperationsScenario,
  shutdownScenarioDatabase
} from "../support/scenarios.js";

test.describe("operations and alerts", () => {
  const queueBacklogAlert = "Queue backlog age exceeded threshold";

  test.beforeEach(async () => {
    await prepareOperationsScenario();
  });

  test.afterAll(async () => {
    await shutdownScenarioDatabase();
  });

  test("shows queue health, degraded pipeline state, and alert drawer detail", async ({ page }) => {
    await signInAs(page, "Operator", "/operations");

    await expect(page.getByRole("table", { name: "Queue health rows" })).toBeVisible();
    await expect(page.getByText("Pipeline Latency")).toBeVisible();
    await expect(page.getByRole("table", { name: "Alert rows" })).toBeVisible();
    await expect(page.getByRole("button", { name: queueBacklogAlert })).toBeVisible({
      timeout: 15_000
    });

    await page.getByRole("button", { name: queueBacklogAlert }).click();

    await expect(page.getByText("Alert summary")).toBeVisible();
    await expect(page.getByText("kalshi.integration.executor")).toBeVisible();
    await page.goto("/alerts?timezone=utc");
    await expect(page.getByRole("button", { name: queueBacklogAlert })).toBeVisible({
      timeout: 15_000
    });
    await expect(page.getByRole("link", { name: "Export CSV" })).toHaveAttribute(
      "href",
      /\/api\/exports\/alerts\.csv\?timezone=utc/
    );
  });
});
