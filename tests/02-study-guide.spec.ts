import { test, expect } from "@playwright/test";
import { stubDataEndpoints } from "./helpers";

test.use({ storageState: ".playwright/user.json" });

test.describe("Sidebar navigation", () => {
  test.beforeEach(async ({ page }) => {
    if (!process.env.TEST_EMAIL) test.skip();
    await stubDataEndpoints(page);
    await page.goto("/");
  });

  test("renders the sidebar with chapters", async ({ page }) => {
    await expect(page.getByText("Real Estate Study Guide")).toBeVisible();
    await expect(page.getByText("CHAPTER 1")).toBeVisible();
    // Use button role to target the sidebar entry specifically (heading also contains this text)
    await expect(page.getByRole("button", { name: /Kinds of Professional Activity/ })).toBeVisible();
  });

  test("active chapter is highlighted", async ({ page }) => {
    const btn = page.getByRole("button", { name: /Kinds of Professional Activity/ });
    await expect(btn).toHaveClass(/text-amber-400/);
  });

  test("navigates to a different chapter", async ({ page }) => {
    await page.getByRole("button", { name: /Kinds of Property/ }).click();
    await expect(page).toHaveURL(/chapter=1-2/);
    await expect(page.getByRole("heading", { name: /Kinds of Property/ })).toBeVisible();
  });

  test("active indicator updates after chapter change", async ({ page }) => {
    await page.getByRole("button", { name: /Kinds of Property/ }).click();
    await expect(page.getByRole("button", { name: /Kinds of Property/ })).toHaveClass(/text-amber-400/);
    await expect(page.getByRole("button", { name: /Kinds of Professional Activity/ })).not.toHaveClass(/text-amber-400/);
  });

  test("shows the progress circle", async ({ page }) => {
    await expect(page.getByText("chapters complete")).toBeVisible();
  });
});

test.describe("Tab navigation", () => {
  test.beforeEach(async ({ page }) => {
    if (!process.env.TEST_EMAIL) test.skip();
    await stubDataEndpoints(page);
    await page.goto("/?chapter=1-1");
  });

  test("renders all seven tabs", async ({ page }) => {
    for (const tab of ["Overview", "Course Content", "Core Concepts", "Key Terms", "Quick Reference", "Resources", "Practice Questions"]) {
      await expect(page.getByRole("button", { name: tab })).toBeVisible();
    }
  });

  test("Overview is active by default", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Overview" })).toHaveClass(/text-amber-400/);
    await expect(page.getByText("Chapter Overview")).toBeVisible();
  });

  test("switches to Core Concepts", async ({ page }) => {
    await page.getByRole("button", { name: "Core Concepts" }).click();
    await expect(page).toHaveURL(/tab=concepts/);
    await expect(page.getByRole("heading", { name: "Core Concepts" })).toBeVisible();
  });

  test("switches to Key Terms", async ({ page }) => {
    await page.getByRole("button", { name: "Key Terms" }).click();
    await expect(page).toHaveURL(/tab=terms/);
    await expect(page.getByRole("heading", { name: "Key Terms" })).toBeVisible();
  });

  test("switches to Practice Questions", async ({ page }) => {
    await page.getByRole("button", { name: "Practice Questions" }).click();
    await expect(page).toHaveURL(/tab=questions/);
    await expect(page.getByRole("heading", { name: "Practice Questions" })).toBeVisible();
  });

  test("switches to Quick Reference", async ({ page }) => {
    await page.getByRole("button", { name: "Quick Reference" }).click();
    await expect(page).toHaveURL(/tab=reference/);
    await expect(page.getByRole("heading", { name: "Quick Reference" })).toBeVisible();
  });
});

test.describe("Profile button", () => {
  test.beforeEach(async ({ page }) => {
    if (!process.env.TEST_EMAIL) test.skip();
    await stubDataEndpoints(page);
    await page.goto("/");
  });

  test("profile dropdown opens and navigates to profile", async ({ page }) => {
    await page.getByRole("button", { name: "Profile menu" }).click();
    await page.getByRole("link", { name: "Profile" }).click();
    await expect(page).toHaveURL(/\/profile/);
  });
});
