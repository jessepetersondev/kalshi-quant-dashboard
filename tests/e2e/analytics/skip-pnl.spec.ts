import { expect, test } from "@playwright/test";

import { signInAs } from "../support/auth.js";
import {
  prepareAnalyticsScenario,
  shutdownScenarioDatabase
} from "../support/scenarios.js";

test.describe("skip and pnl analytics", () => {
  test.beforeEach(async () => {
    await prepareAnalyticsScenario();
  });

  test.afterAll(async () => {
    await shutdownScenarioDatabase();
  });

  test("shows skip-only diagnostics and pnl edge-state badges", async ({ page }) => {
    await signInAs(page, "Operator", "/skips?range=all-time&timezone=utc");

    await expect(page.getByRole("table", { name: "Skip taxonomy rows" })).toBeVisible();
    await expect(page.getByText("KXBTCD-SKIP-ONLY")).toBeVisible();
    await expect(page.getByText("cooldown after recent fill")).toBeVisible();
    await expect(page.getByText("no side passed gate")).toBeVisible();
    await expect(page.getByRole("link", { name: "Export CSV" })).toHaveAttribute(
      "href",
      /\/api\/exports\/skips\.csv\?/
    );

    await page.getByRole("link", { name: "PnL" }).click();
    await expect(page).toHaveURL(/\/pnl/);
    await expect(page.getByText("Portfolio PnL")).toBeVisible();
    await expect(page.getByText("snapshot mismatch")).toBeVisible();
    await expect(page.getByText(/stale/i)).toBeVisible();
    await page.getByLabel("BTC Strategy").check();
    await expect(page.getByRole("link", { name: "Export CSV" })).toHaveAttribute(
      "href",
      /\/api\/exports\/pnl\.csv\?.*compare=btc/
    );
  });
});
