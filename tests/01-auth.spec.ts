import { test, expect } from "@playwright/test";

test.describe("Login page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("renders the login form", async ({ page }) => {
    await expect(page.getByText("Sign in to continue")).toBeVisible();
    await expect(page.locator('input[name="email"]')).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  test("password field starts hidden", async ({ page }) => {
    await expect(page.locator('input[name="password"]')).toHaveAttribute("type", "password");
  });

  test("toggles password visibility", async ({ page }) => {
    await expect(page.locator('input[name="password"]')).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "Show password" }).click();
    await expect(page.locator('input[name="password"]')).toHaveAttribute("type", "text");
    await page.getByRole("button", { name: "Hide password" }).click();
    await expect(page.locator('input[name="password"]')).toHaveAttribute("type", "password");
  });

  test("shows an error on invalid credentials", async ({ page }) => {
    await page.fill('input[name="email"]', "nobody@example.com");
    await page.fill('input[name="password"]', "wrongpassword");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.locator("p.text-red-400")).toBeVisible({ timeout: 8000 });
  });

  test("switches to forgot-password mode", async ({ page }) => {
    await page.getByRole("button", { name: "Forgot password?" }).click();
    await expect(page.getByText("Reset your password")).toBeVisible();
    await expect(page.getByText("We'll send you a reset link")).toBeVisible();
    await expect(page.getByRole("button", { name: "Send reset link" })).toBeVisible();
    await expect(page.locator('input[name="password"]')).not.toBeVisible();
  });

  test("forgot-password form has an email field", async ({ page }) => {
    await page.getByRole("button", { name: "Forgot password?" }).click();
    await expect(page.locator('input[name="email"][type="email"]')).toBeVisible();
  });

  test("returns to login from forgot-password mode", async ({ page }) => {
    await page.getByRole("button", { name: "Forgot password?" }).click();
    await page.getByRole("button", { name: "← Back to sign in" }).click();
    await expect(page.getByText("Sign in to continue")).toBeVisible();
    await expect(page.locator('input[name="password"]')).toBeVisible();
  });
});

test.describe("Reset password page", () => {
  test("shows an error when no code param is present", async ({ page }) => {
    await page.goto("/reset-password");
    await expect(page.getByText(/invalid|expired|reset link/i)).toBeVisible({ timeout: 8000 });
  });
});
