import { expect, test } from "@playwright/test";

import { signInAs } from "../support/auth.js";

test("admin can update feature flags and operator cannot", async ({ page, context }) => {
  await signInAs(page, "Admin", "/admin/feature-flags");
  await expect(page.getByRole("heading", { name: /feature flags/i })).toBeVisible();
  await page.getByLabel("Enabled").uncheck();
  await page.getByLabel("Reason").fill("Playwright toggle");
  await page.getByRole("button", { name: /^save$/i }).click();
  await expect(page.getByText(/saved successfully/i)).toBeVisible();

  await context.clearCookies();
  await signInAs(page, "Operator", "/admin/feature-flags");
  await expect(page.getByText(/not allowed for the current session/i)).toBeVisible();
});
