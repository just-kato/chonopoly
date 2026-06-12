import { test, expect } from "@playwright/test";
import { stubDataEndpoints } from "./helpers";

test.use({ storageState: ".playwright/user.json" });

async function goToManage(page: Parameters<typeof stubDataEndpoints>[0]) {
  await stubDataEndpoints(page);

  // Stub all data endpoints ManagePanel panels need
  await page.route("**/api/budgets/summary**", route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ budgets: [], period: { start: "2026-06-01", end: "2026-06-30" } }) })
  );
  await page.route("**/api/goals/summary**", route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ goals: [] }) })
  );
  await page.route("**/api/bills/summary**", route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ bills: [] }) })
  );
  await page.route("**/api/debts/summary**", route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ debts: [] }) })
  );
  await page.route("**/api/assets/summary**", route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ assets: [] }) })
  );
  await page.route("**/api/plaid/accounts**", route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ accounts: [] }) })
  );
  await page.route("**/api/plaid/link-token**", route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ link_token: "test-token" }) })
  );

  await page.goto("/finances");
  await page.getByRole("button", { name: /^Manage$/i }).click();
}

// ─── Test 1: Manage nav item opens ManagePanel ────────────────────────────────

test("Manage nav item renders ManagePanel with secondary sidebar", async ({ page }) => {
  if (!process.env.TEST_EMAIL) test.skip();
  await goToManage(page);

  // All 5 sidebar nav items should be present
  await expect(page.getByRole("button", { name: /^Budgets$/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Bills$/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Goals$/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Debts$/i })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Assets$/i })).toBeVisible();
});

// ─── Test 2: Section header title updates on nav ─────────────────────────────

test("ManagePanel section title updates when switching sections", async ({ page }) => {
  if (!process.env.TEST_EMAIL) test.skip();
  await goToManage(page);

  // Default section is Budgets — title is a <p> not a heading
  await expect(page.locator("p.font-semibold", { hasText: /^Budgets$/ })).toBeVisible();

  // Switch to Bills
  await page.getByRole("button", { name: /^Bills$/i }).click();
  await expect(page.locator("p.font-semibold", { hasText: /^Bills$/ })).toBeVisible();

  // Switch to Goals
  await page.getByRole("button", { name: /^Goals$/i }).click();
  await expect(page.locator("p.font-semibold", { hasText: /^Goals$/ })).toBeVisible();

  // Switch to Debts
  await page.getByRole("button", { name: /^Debts$/i }).click();
  await expect(page.locator("p.font-semibold", { hasText: /^Debts$/ })).toBeVisible();

  // Switch to Assets
  await page.getByRole("button", { name: /^Assets$/i }).click();
  await expect(page.locator("p.font-semibold", { hasText: /^Assets$/ })).toBeVisible();
});

// ─── Test 3: Header create button label matches active section ────────────────

test("ManagePanel header create button label matches active section", async ({ page }) => {
  if (!process.env.TEST_EMAIL) test.skip();
  await goToManage(page);

  // Default: Budgets
  await expect(page.getByRole("button", { name: /Add budget/i })).toBeVisible();

  await page.getByRole("button", { name: /^Bills$/i }).click();
  await expect(page.getByRole("button", { name: /Add bill/i })).toBeVisible();

  await page.getByRole("button", { name: /^Goals$/i }).click();
  await expect(page.getByRole("button", { name: /Add goal/i })).toBeVisible();

  await page.getByRole("button", { name: /^Debts$/i }).click();
  // Use exact text to avoid matching the inline "Add debt" button in DebtPanel
  await expect(page.locator("button", { hasText: /^Add debt$/ }).first()).toBeVisible();

  await page.getByRole("button", { name: /^Assets$/i }).click();
  await expect(page.locator("button", { hasText: /^Add asset$/ }).first()).toBeVisible();
});

// ─── Test 4: Group labels in sidebar ─────────────────────────────────────────

test("ManagePanel sidebar shows Spending, Saving, and Net Worth group labels", async ({ page }) => {
  if (!process.env.TEST_EMAIL) test.skip();
  await goToManage(page);

  await expect(page.getByText("Spending")).toBeVisible();
  await expect(page.getByText("Saving")).toBeVisible();
  await expect(page.getByText("Net Worth")).toBeVisible();
});
