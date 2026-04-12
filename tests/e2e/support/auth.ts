import type { Page } from "@playwright/test";

export async function signInAs(
  page: Page,
  role: "Operator" | "Developer" | "Admin",
  redirectTo = "/overview"
): Promise<void> {
  await page.goto(`/sign-in?redirectTo=${encodeURIComponent(redirectTo)}`);
  await page.getByRole("button", { name: new RegExp(role, "i") }).click();
}
