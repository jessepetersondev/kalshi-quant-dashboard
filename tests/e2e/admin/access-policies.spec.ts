import { expect, test } from "@playwright/test";

import { signInAs } from "../support/auth.js";

test("admin can open access policies and operator cannot", async ({ page, context }) => {
  await signInAs(page, "Admin", "/admin/access-policies");
  await expect(page.getByRole("heading", { name: /policies/i })).toBeVisible();
  await page.getByRole("button", { name: /new policy/i }).click();
  await page.getByLabel("Name").fill("Playwright admin policy");
  await page.getByLabel("Subject key").fill("user-developer");
  await page.getByRole("button", { name: /^save$/i }).click();
  await expect(page.getByText(/saved successfully/i)).toBeVisible();

  await context.clearCookies();
  await signInAs(page, "Operator", "/admin/access-policies");
  await expect(page.getByText(/not allowed for the current session/i)).toBeVisible();
});
