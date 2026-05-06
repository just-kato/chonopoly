import { test, expect } from "@playwright/test";
import { stubDataEndpoints } from "./helpers";

test.use({ storageState: ".playwright/user.json" });

test.describe("Profile page", () => {
  test.beforeEach(async ({ page }) => {
    if (!process.env.TEST_EMAIL) test.skip();
    await stubDataEndpoints(page);
    await page.goto("/profile");
  });

  test("renders the profile page", async ({ page }) => {
    await expect(page.getByText("Back to Study Guide")).toBeVisible();
    await expect(page.getByRole("button", { name: "Profile" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Courses" })).toBeVisible();
  });

  test("back link returns to study guide", async ({ page }) => {
    await page.getByText("Back to Study Guide").click();
    await expect(page).toHaveURL("http://localhost:3000/");
  });

  test("Profile tab shows editable fields and disabled email", async ({ page }) => {
    await page.getByRole("button", { name: "Profile" }).click();
    await expect(page.getByRole("button", { name: "Save changes" })).toBeVisible();
    await expect(page.locator("input:disabled")).toBeVisible();
  });

  test("Courses tab shows course card and chapter list", async ({ page }) => {
    await page.getByRole("button", { name: "Courses" }).click();
    await expect(page.getByText("Georgia Real Estate Exam Prep")).toBeVisible();
    await expect(page.getByText("Continue where you left off")).toBeVisible();
    await expect(page.getByText("Chapter Breakdown")).toBeVisible();
    await expect(page.getByText("Kinds of Professional Activity")).toBeVisible();
  });

  test("chapter link in Courses navigates to that chapter", async ({ page }) => {
    await page.getByRole("button", { name: "Courses" }).click();
    await page.getByText("Kinds of Professional Activity").click();
    await expect(page).toHaveURL(/chapter=1-1/);
  });

  test("sign out is visible", async ({ page }) => {
    await expect(page.getByRole("button", { name: /sign out/i })).toBeVisible();
  });
});
