import { expect, test } from "@playwright/test";

import { signInAs } from "../support/auth.js";
import {
  prepareAnalyticsScenario,
  shutdownScenarioDatabase
} from "../support/scenarios.js";

test.describe("pnl compare mode", () => {
  test.beforeEach(async () => {
    await prepareAnalyticsScenario();
  });

  test.afterAll(async () => {
    await shutdownScenarioDatabase();
  });

  test("compares seeded strategies side by side", async ({ page }) => {
    await signInAs(page, "Operator", "/pnl?bucket=all-time&timezone=utc");

    await page.getByLabel("BTC Strategy").check();
    await page.getByLabel("ETH Strategy").check();

    await expect(page.getByText("Compare mode")).toBeVisible();
    await expect(page.getByText("BTC Strategy")).toBeVisible();
    await expect(page.getByText("ETH Strategy")).toBeVisible();
  });
});
