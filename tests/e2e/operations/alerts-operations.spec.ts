import { expect, test } from "@playwright/test";

import { signInAs } from "../support/auth.js";
import {
  prepareOperationsScenario,
  shutdownScenarioDatabase
} from "../support/scenarios.js";

test.describe("operations and alerts", () => {
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
    await expect(page.getByText("Queue backlog age exceeded threshold")).toBeVisible();

    await page.getByRole("button", { name: "Queue backlog age exceeded threshold" }).click();

    await expect(page.getByText("Alert summary")).toBeVisible();
    await expect(page.getByText("kalshi.integration.executor")).toBeVisible();
    await page.goto("/alerts?timezone=utc");
    await expect(page.getByText("Queue backlog age exceeded threshold")).toBeVisible();
    await expect(page.getByRole("link", { name: "Export CSV" })).toHaveAttribute(
      "href",
      /\/api\/exports\/alerts\.csv\?timezone=utc/
    );
  });
});
