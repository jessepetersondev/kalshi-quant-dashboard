import { expect, test } from "@playwright/test";

import { signInAs } from "../support/auth.js";
import {
  prepareOverviewScenario,
  shutdownScenarioDatabase
} from "../support/scenarios.js";

test.describe("overview landing and strategy drill-down", () => {
  test.beforeEach(async () => {
    await prepareOverviewScenario();
  });

  test.afterAll(async () => {
    await shutdownScenarioDatabase();
  });

  test("lands on the overview and drills into a seeded strategy", async ({ page }) => {
    await signInAs(page, "Operator", "/overview");

    await expect(page).toHaveURL(/\/overview/);
    await expect(page.getByText("Global Health")).toBeVisible();
    await expect(page.getByText("Aggregate PnL")).toBeVisible();
    await expect(page.getByText("Live Decision Feed")).toBeVisible();
    await expect(page.getByText("Live Trade Feed")).toBeVisible();
    await expect(page.getByText("Queue Health")).toBeVisible();
    await expect(page.getByText("Recent Alerts", { exact: true })).toBeVisible();
    await expect(page.getByText("Executor queue age exceeded threshold")).toBeVisible();

    await page.getByRole("link", { name: "Strategies" }).click();
    await expect(page).toHaveURL(/\/strategies/);
    await expect(page.getByText("BTC Strategy")).toBeVisible();
    await expect(page.getByText("ETH Strategy")).toBeVisible();
    await expect(page.getByText("hybrid").first()).toBeVisible();
    await expect(page.getByText("direct_only").first()).toBeVisible();

    await page.getByRole("link", { name: "Open strategy detail" }).first().click();
    await expect(page).toHaveURL(/\/strategies\/btc/);
    await expect(page.getByText("BTC Strategy")).toBeVisible();
    await expect(page.getByText("Recent Decisions")).toBeVisible();
    await expect(page.getByText("Recent Trades")).toBeVisible();
    await expect(page.getByText("Recent Skips")).toBeVisible();
    await expect(page.getByText("Active Alerts")).toBeVisible();
  });
});
