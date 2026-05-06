import { test, expect } from "@playwright/test";
import { stubDataEndpoints } from "./helpers";

test.use({ storageState: ".playwright/user.json" });

// Chapter 1-1 has 8 questions.
test.describe("Quiz", () => {
  test.beforeEach(async ({ page }) => {
    if (!process.env.TEST_EMAIL) test.skip();
    await stubDataEndpoints(page);
    await page.goto("/?chapter=1-1&tab=questions");
  });

  test("renders question list", async ({ page }) => {
    await expect(page.getByText(/QUESTION 1 OF/)).toBeVisible();
  });

  test("submit is disabled before answering all questions", async ({ page }) => {
    await expect(page.getByRole("button", { name: /Submit Answers|Answer all questions/ })).toBeDisabled();
  });

  test("shows answered count while answering", async ({ page }) => {
    // Click the first answer option on question 1
    const firstQuestion = page.locator("div").filter({ hasText: /^QUESTION 1 OF/ }).first();
    await firstQuestion.getByRole("button").first().click();
    await expect(page.getByText(/1 \/ \d+/)).toBeVisible();
  });

  test("submit enables after all questions answered", async ({ page }) => {
    const questions = page.locator("p").filter({ hasText: /QUESTION \d+ OF \d+/ });
    const count = await questions.count();

    for (let i = 0; i < count; i++) {
      const block = questions.nth(i).locator("..").locator("..");
      await block.getByRole("button").first().click();
    }

    await expect(page.getByRole("button", { name: "Submit Answers" })).toBeEnabled();
  });

  test("results card appears after submitting", async ({ page }) => {
    const questions = page.locator("p").filter({ hasText: /QUESTION \d+ OF \d+/ });
    const count = await questions.count();
    for (let i = 0; i < count; i++) {
      await questions.nth(i).locator("..").locator("..").getByRole("button").first().click();
    }
    await page.getByRole("button", { name: "Submit Answers" }).click();

    await expect(page.getByText(/Passed|Failed/)).toBeVisible();
    await expect(page.getByText(/% correct/)).toBeVisible();
  });

  test("explanations are shown after submitting", async ({ page }) => {
    const questions = page.locator("p").filter({ hasText: /QUESTION \d+ OF \d+/ });
    const count = await questions.count();
    for (let i = 0; i < count; i++) {
      await questions.nth(i).locator("..").locator("..").getByRole("button").first().click();
    }
    await page.getByRole("button", { name: "Submit Answers" }).click();

    await expect(page.getByText("Explanation:").first()).toBeVisible();
  });

  test("retake resets the quiz", async ({ page }) => {
    const questions = page.locator("p").filter({ hasText: /QUESTION \d+ OF \d+/ });
    const count = await questions.count();
    for (let i = 0; i < count; i++) {
      await questions.nth(i).locator("..").locator("..").getByRole("button").first().click();
    }
    await page.getByRole("button", { name: "Submit Answers" }).click();
    await page.getByRole("button", { name: /Retake|Try Again/ }).click();

    await expect(page.getByRole("button", { name: /Submit Answers|Answer all questions/ })).toBeDisabled();
    await expect(page.getByText(/Passed|Failed/)).not.toBeVisible();
  });
});
