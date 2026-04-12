import { expect, test } from "@playwright/test";

import { signInAs } from "../support/auth.js";
import {
  appendOverviewDecisionUpdate,
  appendTradeLifecycleUpdate,
  prepareOverviewScenario,
  shutdownScenarioDatabase
} from "../support/scenarios.js";

test.describe("overview live feed controls", () => {
  test.beforeEach(async () => {
    await prepareOverviewScenario();
  });

  test.afterAll(async () => {
    await shutdownScenarioDatabase();
  });

  test("pauses the live feed, buffers updates, and resumes in canonical order", async ({
    page
  }) => {
    await signInAs(page, "Operator", "/overview");

    await expect(page.getByText("Buffered updates: 0")).toBeVisible();
    await page.getByRole("button", { name: "Pause live feed" }).click();

    await appendOverviewDecisionUpdate();
    await appendTradeLifecycleUpdate();

    await expect(page.getByText("KXETHD-LIVE-2")).toHaveCount(0);
    await expect(page.getByText("KXBTCD-LIVE2")).toHaveCount(0);
    await expect
      .poll(async () => {
        const text = await page.getByText(/Buffered updates:/).textContent();
        return Number(text?.match(/(\d+)/)?.[1] ?? "0");
      })
      .toBeGreaterThan(0);

    await page.getByRole("button", { name: "Resume live feed" }).click();

    await expect(page.getByText("KXETHD-LIVE-2")).toBeVisible();
    await expect(page.getByText("KXBTCD-LIVE2")).toBeVisible();
    await expect(page.getByText("Buffered updates: 0")).toBeVisible();
  });
});
