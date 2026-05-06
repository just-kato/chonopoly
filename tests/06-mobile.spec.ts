import { test, expect } from "@playwright/test";
import { stubDataEndpoints } from "./helpers";

test.use({ storageState: ".playwright/user.json" });

test.describe("Mobile layout", () => {
  test.use({ viewport: { width: 390, height: 844 } }); // iPhone 14

  test.beforeEach(async ({ page }) => {
    if (!process.env.TEST_EMAIL) test.skip();
    await stubDataEndpoints(page);
    await page.goto("/");
  });

  test("hamburger button is visible on mobile", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Open menu" })).toBeVisible();
  });

  test("sidebar is off-screen by default", async ({ page }) => {
    // When closed, sidebar slides off-screen and is clipped by overflow-hidden parent
    await expect(page.getByText("Real Estate Study Guide")).not.toBeInViewport();
  });

  test("hamburger opens the sidebar", async ({ page }) => {
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.getByText("Real Estate Study Guide")).toBeInViewport();
  });

  test("X button closes the sidebar", async ({ page }) => {
    await page.getByRole("button", { name: "Open menu" }).click();
    await expect(page.getByText("Real Estate Study Guide")).toBeInViewport();
    await page.getByRole("button", { name: "Close menu" }).click();
    // Wait for the 300ms slide-out transition then confirm off-screen
    await expect(page.getByText("Real Estate Study Guide")).not.toBeInViewport();
  });

  test("selecting a chapter closes the sidebar and navigates", async ({ page }) => {
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("button", { name: /Kinds of Property/ }).click();
    await expect(page.getByText("Real Estate Study Guide")).not.toBeInViewport();
    await expect(page).toHaveURL(/chapter=1-2/);
  });
});

test.describe("Desktop layout", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test.beforeEach(async ({ page }) => {
    if (!process.env.TEST_EMAIL) test.skip();
    await stubDataEndpoints(page);
    await page.goto("/");
  });

  test("sidebar is visible without opening on desktop", async ({ page }) => {
    await expect(page.getByText("Real Estate Study Guide")).toBeVisible();
  });

  test("hamburger button is hidden on desktop", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Open menu" })).not.toBeVisible();
  });
});
