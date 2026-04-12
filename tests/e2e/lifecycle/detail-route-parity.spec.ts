import { expect, test } from "@playwright/test";

import { signInAs } from "../support/auth.js";
import {
  prepareLifecycleScenario,
  shutdownScenarioDatabase
} from "../support/scenarios.js";

test.describe("lifecycle detail route parity", () => {
  test.beforeEach(async () => {
    await prepareLifecycleScenario();
  });

  test.afterAll(async () => {
    await shutdownScenarioDatabase();
  });

  test("opens the same trade lifecycle as a drawer and a dedicated route", async ({ page }) => {
    await signInAs(page, "Developer", "/trades?timezone=local");

    await page.getByLabel("Search").fill("corr-btc-1");
    await page.getByRole("button", { name: "Apply search" }).click();
    await page.getByRole("button", { name: "publisher-order-1" }).click();

    await expect(page.getByText("Trade summary")).toBeVisible();
    await expect(
      page.getByLabel("Trade detail").getByText("publisher-order-1", { exact: true })
    ).toBeVisible();
    await expect(page.getByText("Raw payloads")).toBeVisible();

    await page.getByRole("link", { name: "Open dedicated page" }).click();

    await expect(page).toHaveURL(/\/trades\/corr-btc-1\?timezone=local/);
    await expect(page.getByText("Trade summary")).toBeVisible();
    await expect(page.locator("strong").filter({ hasText: "publisher-order-1" })).toBeVisible();
    await expect(page.getByText("Raw payloads")).toBeVisible();

    await page.getByRole("link", { name: "Back to trades" }).click();
    await expect(page).toHaveURL(/\/trades\?timezone=local/);
  });
});
