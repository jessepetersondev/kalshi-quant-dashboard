import { expect, test } from "@playwright/test";

import { signInAs } from "../support/auth.js";
import {
  appendReplayObservation,
  prepareLifecycleScenario,
  shutdownScenarioDatabase
} from "../support/scenarios.js";

test.describe("lifecycle search, trace, and replay convergence", () => {
  test.beforeEach(async () => {
    await prepareLifecycleScenario();
  });

  test.afterAll(async () => {
    await shutdownScenarioDatabase();
  });

  test("searches by identifier and shows operator raw-payload omission", async ({ page }) => {
    await signInAs(page, "Operator", "/decisions");

    await page.getByLabel("Search").fill("KXETHD-TEST");
    await page.getByRole("button", { name: "Apply search" }).click();
    await expect(page.getByText("KXETHD-TEST")).toBeVisible();

    await page.getByRole("button", { name: "KXETHD-TEST" }).click();
    await expect(page.getByText("Decision summary")).toBeVisible();
    await expect(page.getByText("Raw payloads withheld")).toBeVisible();
  });

  test("preserves lifecycle history after replay and reconnect without duplicating facts", async ({
    page
  }) => {
    await signInAs(page, "Developer", "/trades");

    await page.getByLabel("Search").fill("corr-btc-1");
    await page.getByRole("button", { name: "Apply search" }).click();
    await expect(page.getByText("publisher-order-1")).toBeVisible();

    await page.getByRole("button", { name: "publisher-order-1" }).click();
    await expect(page.getByText("Trade summary")).toBeVisible();
    await expect(page.getByText("Raw payloads")).toBeVisible();

    await appendReplayObservation();
    await page.reload();

    await expect(page.getByRole("dialog", { name: "Trade detail" })).toBeVisible();
    await page.getByRole("button", { name: "Close" }).click();

    await page.getByLabel("Search").fill("corr-btc-1");
    await page.getByRole("button", { name: "Apply search" }).click();
    await expect(page.getByText("publisher-order-1")).toBeVisible();
    await expect(page.getByRole("row")).toHaveCount(2);
  });
});
