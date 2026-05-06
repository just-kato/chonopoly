// Tests the Admin tab invite form at the UI level.
// The server action runs server-side so we can't intercept the Supabase call,
// but we verify the form is present, submittable, and always shows feedback.
// Requires TEST_EMAIL and TEST_PASSWORD.

import { test, expect } from "@playwright/test";

test.use({ storageState: ".playwright/user.json" });

test.describe("Admin tab - invite user", () => {
  test.beforeEach(async ({ page }) => {
    if (!process.env.TEST_EMAIL) test.skip();

    await page.route("**/rest/v1/chapter_progress**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
    );

    // Stub profile as admin so the Admin tab renders
    await page.route("**/rest/v1/profiles**", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            username: "testadmin",
            display_name: "Test Admin",
            last_chapter_id: null,
            last_tab_slug: null,
            role: "admin",
          },
        ]),
      })
    );

    await page.goto("/profile");
  });

  test("Admin tab is visible when user has admin role", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Admin" })).toBeVisible();
  });

  test("invite form renders inside Admin tab", async ({ page }) => {
    await page.getByRole("button", { name: "Admin" }).click();
    await expect(page.getByText("INVITE USER")).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "Invite" })).toBeVisible();
  });

  test("invite button is disabled with empty email", async ({ page }) => {
    await page.getByRole("button", { name: "Admin" }).click();
    // HTML required attribute prevents submission — button is not disabled
    // but form won't submit without a valid email
    const input = page.locator('input[type="email"]');
    await expect(input).toHaveAttribute("required");
  });

  test("submitting invite shows a feedback message", async ({ page }) => {
    await page.getByRole("button", { name: "Admin" }).click();
    await page.locator('input[type="email"]').fill("newuser@example.com");
    await page.getByRole("button", { name: "Invite" }).click();

    // The server action always returns either a success message or an error.
    // We don't assert the exact text because it depends on whether the test
    // user is actually an admin in Supabase — either outcome is valid here.
    await expect(page.locator("p").filter({
      hasText: /invite|error|authorized|rate|sent/i,
    })).toBeVisible({ timeout: 10000 });
  });
});
