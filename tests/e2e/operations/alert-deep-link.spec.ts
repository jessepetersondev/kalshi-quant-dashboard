import { expect, test } from "@playwright/test";

import { signInAs } from "../support/auth.js";
import {
  prepareOperationsScenario,
  shutdownScenarioDatabase
} from "../support/scenarios.js";

test.describe("alert deep links", () => {
  test.beforeEach(async () => {
    await prepareOperationsScenario();
  });

  test.afterAll(async () => {
    await shutdownScenarioDatabase();
  });

  test("opens alert detail on the dedicated route", async ({ page }) => {
    await signInAs(page, "Developer", "/alerts");

    await expect(page.getByText("Queue backlog age exceeded threshold")).toBeVisible();
    await page.getByRole("link", { name: "detail" }).first().click();

    await expect(page).toHaveURL(/\/alerts\//);
    await expect(page.getByText("Alert summary")).toBeVisible();
    await expect(page.getByText("Queue backlog age exceeded threshold")).toBeVisible();
  });
});
