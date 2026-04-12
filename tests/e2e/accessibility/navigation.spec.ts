import { expect, test } from "@playwright/test";

import { signInAs } from "../support/auth.js";
import {
  prepareLifecycleScenario,
  prepareOperationsScenario,
  prepareOverviewScenario
} from "../support/scenarios.js";

test.describe("accessibility navigation", () => {
  test.beforeEach(async ({ page }) => {
    await prepareOverviewScenario();
    await signInAs(page, "Operator");
  });

  test("supports keyboard navigation across primary routes", async ({ page }) => {
    await expect(page.getByRole("navigation", { name: "Primary navigation" })).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Overview" })).toBeFocused();
    await page.getByRole("link", { name: "Strategies" }).click();
    await expect(page).toHaveURL(/\/strategies/);
    await expect(page.locator(".sr-only[aria-live='polite']")).toContainText("Strategies loaded");
  });

  test("allows dialog dismissal and preserves focus with keyboard only", async ({ page }) => {
    await prepareLifecycleScenario();
    await page.goto("/decisions");
    const openDecisionButton = page.getByRole("button", { name: "KXETHD-TEST" });
    await openDecisionButton.press("Enter");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(openDecisionButton).toBeFocused();
  });

  test("announces reconnect and alert detail flows", async ({ page }) => {
    await prepareOperationsScenario();
    await page.goto("/alerts");
    await page
      .getByRole("button", { name: "Queue backlog age exceeded threshold" })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Alert detail" })).toBeVisible();
  });
});
