import { test, expect } from "@playwright/test";
import { stubDataEndpoints } from "./helpers";

test.use({ storageState: ".playwright/user.json" });

test.describe("Key Terms", () => {
  test.beforeEach(async ({ page }) => {
    if (!process.env.TEST_EMAIL) test.skip();
    await stubDataEndpoints(page);
    await page.goto("/?chapter=1-1&tab=terms");
  });

  test("renders key terms list and flashcard", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Key Terms" })).toBeVisible();
    await expect(page.getByText("Flashcard Self-Test")).toBeVisible();
  });

  test("terms start collapsed", async ({ page }) => {
    // Definition panels are conditionally rendered — none exist in main when all terms are collapsed
    await expect(page.locator("main div.border-t").first()).not.toBeVisible();
  });

  test("clicking a term expands its definition", async ({ page }) => {
    const firstTerm = page.locator(".font-mono.text-amber-400").first().locator("..").locator("..");
    await firstTerm.click();
    await expect(page.locator("div.border-t p").first()).toBeVisible();
  });

  test("clicking an expanded term collapses it", async ({ page }) => {
    // Scope to main to avoid matching the sidebar's progress section (also has border-t + p)
    const main = page.locator("main");
    const firstTerm = main.locator(".font-mono.text-amber-400").first().locator("..").locator("..");
    await firstTerm.click();
    await expect(main.locator("div.border-t p").first()).toBeVisible();
    await firstTerm.click();
    await expect(main.locator("div.border-t p").first()).not.toBeVisible();
  });
});

test.describe("Flashcard", () => {
  test.beforeEach(async ({ page }) => {
    if (!process.env.TEST_EMAIL) test.skip();
    await stubDataEndpoints(page);
    await page.goto("/?chapter=1-1&tab=terms");
  });

  test("shows TERM 1 on load", async ({ page }) => {
    await expect(page.getByText(/TERM 1 OF/)).toBeVisible();
    await expect(page.getByText("tap to flip")).toBeVisible();
  });

  test("flips to definition on click", async ({ page }) => {
    const card = page.getByText(/TERM 1 OF/).locator("..").locator("..");
    await card.click();
    await expect(page.getByText("Tap to see term")).toBeVisible();
  });

  test("flips back to term on second click", async ({ page }) => {
    const card = page.getByText(/TERM 1 OF/).locator("..").locator("..");
    await card.click();
    await card.click();
    await expect(page.getByText("tap to flip")).toBeVisible();
  });

  test("Next button advances to term 2", async ({ page }) => {
    await page.getByRole("button", { name: "Next →" }).click();
    await expect(page.getByText(/TERM 2 OF/)).toBeVisible();
  });

  test("navigating resets the flip state", async ({ page }) => {
    const card = page.getByText(/TERM 1 OF/).locator("..").locator("..");
    await card.click();
    await expect(page.getByText("Tap to see term")).toBeVisible();
    await page.getByRole("button", { name: "Next →" }).click();
    await expect(page.getByText("tap to flip")).toBeVisible();
  });

  test("Prev button wraps from term 1 to the last term", async ({ page }) => {
    await page.getByRole("button", { name: "← Prev" }).click();
    await expect(page.getByText(/TERM 1 OF/)).not.toBeVisible();
  });
});

test.describe("Concept Cards", () => {
  test.beforeEach(async ({ page }) => {
    if (!process.env.TEST_EMAIL) test.skip();
    await stubDataEndpoints(page);
    await page.goto("/?chapter=1-1&tab=concepts");
  });

  test("renders concept cards", async ({ page }) => {
    await expect(page.getByRole("heading", { name: "Core Concepts" })).toBeVisible();
    await expect(page.locator("div.concept-body")).not.toBeVisible();
  });

  test("clicking a concept card expands it", async ({ page }) => {
    // Scope to main — sidebar chapter buttons also have w-full and appear first in the DOM
    await page.locator("main").locator("button.w-full").first().click();
    await expect(page.locator("div.concept-body").first()).toBeVisible();
  });

  test("clicking again collapses it", async ({ page }) => {
    const card = page.locator("main").locator("button.w-full").first();
    await card.click();
    await expect(page.locator("div.concept-body").first()).toBeVisible();
    await card.click();
    await expect(page.locator("div.concept-body").first()).not.toBeVisible();
  });
});
