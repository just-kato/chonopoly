import { test, expect } from "@playwright/test";
import { stubDataEndpoints } from "./helpers";

test.use({ storageState: ".playwright/user.json" });

const MOCK_ACCOUNTS = [
  {
    account_id: "acc1",
    item_id: "item1",
    name: "Checking",
    type: "depository",
    subtype: "checking",
    balances: { current: 3200, available: 3000 },
    institution_name: "Chase",
  },
  {
    account_id: "acc2",
    item_id: "item1",
    name: "Savings",
    type: "depository",
    subtype: "savings",
    balances: { current: 8500, available: 8500 },
    institution_name: "Chase",
  },
];

const MOCK_CONNECTED_ITEMS = [
  { itemId: "item1", institutionName: "Chase" },
];

const MOCK_TRANSACTIONS = [
  {
    transaction_id: "tx1",
    account_id: "acc1",
    name: "Trader Joe's",
    merchant_name: "Trader Joe's",
    amount: 72.50,
    date: "2026-06-04",
    personal_finance_category: { primary: "FOOD_AND_DRINK", detailed: "GROCERIES" },
    logo_url: null,
  },
];

async function stubProfileComplete(page: import("@playwright/test").Page) {
  await stubDataEndpoints(page);
  await page.route("**/api/profile**", (route) => {
    if (route.request().method() === "GET") {
      route.fulfill({
        status: 200, contentType: "application/json",
        body: JSON.stringify({
          email: "test@example.com",
          onboarding_complete: true,
          pay_cycle_start_day: 1,
          morning_report_enabled: true,
        }),
      });
    } else {
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
    }
  });
  await page.route("**/api/plaid/transactions**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ accounts: MOCK_CONNECTED_ITEMS, transactions: MOCK_TRANSACTIONS }) })
  );
  await page.route("**/api/plaid/accounts**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ accounts: MOCK_ACCOUNTS }) })
  );
  await page.route("**/api/plaid/create-link-token**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ link_token: "link-sandbox-fake" }) })
  );
  await page.route("**/api/onboarding**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ onboarding: { connected_bank: true, added_savings_goal: true, added_debt: true, added_asset: true, set_up_budget: true, dismissed_at: null } }) })
  );
  await page.route("**/api/net-worth**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ net_worth: 11700, total_assets: 12000, total_debts: 300 }) })
  );
  await page.route("**/api/budget/summary**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ summaries: [] }) })
  );
  await page.route("**/api/dreams**", (route) => {
    if (route.request().method() === "GET") {
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ dreams: [] }) });
    } else {
      route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ dream: { id: "d1", icon: "🏠", title: "Buy a house", description: null, goal_id: null, sort_order: 0 } }) });
    }
  });
  await page.route("**/api/milestones**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ milestones: [{ id: "m1", milestone_key: "bank_connected", earned_at: "2026-06-01T00:00:00Z" }] }) })
  );
  await page.route("**/api/goals/summary**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ goals: [] }) })
  );
}

async function stubProfileIncomplete(page: import("@playwright/test").Page) {
  await stubDataEndpoints(page);
  // Override the profiles stub to return onboarding_complete = false
  await page.route("**/rest/v1/profiles**", (route) =>
    route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify([{
        username: "testuser",
        last_chapter_id: null,
        last_tab_slug: null,
        role: "user",
        avatar_url: null,
        avatar_color: "amber",
        onboarding_complete: false,
        pay_cycle_start_day: 1,
        morning_report_enabled: true,
        health_score_last_calculated: null,
      }]),
    })
  );
  await page.route("**/api/profile**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ email: "test@example.com", onboarding_complete: false, pay_cycle_start_day: 1, morning_report_enabled: true }) })
  );
  await page.route("**/api/onboarding**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ onboarding: { connected_bank: false, added_savings_goal: false, added_debt: false, added_asset: false, set_up_budget: false, dismissed_at: null } }) })
  );
  await page.route("**/api/plaid/transactions**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ accounts: [], transactions: [] }) })
  );
  await page.route("**/api/goals/summary**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ goals: [] }) })
  );
  await page.route("**/api/debts/summary**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ debts: [] }) })
  );
  await page.route("**/api/assets/summary**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ assets: [] }) })
  );
  await page.route("**/api/budget/summary**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ summaries: [] }) })
  );
}

test.describe("Profile — blocking onboarding gate", () => {
  test("new user sees blocking onboarding modal, not the app", async ({ page }) => {
    if (!process.env.TEST_EMAIL) test.skip();
    await stubProfileIncomplete(page);
    await page.goto("/finances");
    await expect(page.getByTestId("onboarding-gate")).toBeVisible({ timeout: 8000 });
    await expect(page.getByTestId("onboarding-modal")).toBeVisible();
    // Sidebar should NOT be visible
    await expect(page.locator("aside")).not.toBeVisible();
  });

  test("onboarding modal has no skip or X button", async ({ page }) => {
    if (!process.env.TEST_EMAIL) test.skip();
    await stubProfileIncomplete(page);
    await page.goto("/finances");
    await expect(page.getByTestId("onboarding-modal")).toBeVisible({ timeout: 8000 });
    // No skip button
    await expect(page.getByText("Skip for now")).not.toBeVisible();
    // No X button (lucide X icon — check via aria or role)
    await expect(page.locator('[data-testid="onboarding-modal"] button[aria-label="close"]')).not.toBeVisible();
  });
});

test.describe("Profile — panel access", () => {
  test.beforeEach(async ({ page }) => {
    if (!process.env.TEST_EMAIL) test.skip();
    await stubProfileComplete(page);
    await page.goto("/finances");
    await expect(page.locator("aside")).toBeVisible({ timeout: 8000 });
  });

  test("sidebar profile area is clickable and navigates to profile view", async ({ page }) => {
    if (!process.env.TEST_EMAIL) test.skip();
    const profileBtn = page.locator("aside button").filter({ hasText: "testuser" });
    await expect(profileBtn).toBeVisible();
    await profileBtn.click();
    await expect(page.getByText("Identity")).toBeVisible({ timeout: 5000 });
  });

  test("profile panel renders all 6 section headers", async ({ page }) => {
    if (!process.env.TEST_EMAIL) test.skip();
    await page.locator("aside button").filter({ hasText: "testuser" }).click();
    await expect(page.getByText("Identity")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("Net Worth")).toBeVisible();
    await expect(page.getByText("Connected Banks")).toBeVisible();
    await expect(page.getByText("Financial Health")).toBeVisible();
    await expect(page.getByText("Dreams")).toBeVisible();
    await expect(page.getByText("Milestones")).toBeVisible();
  });

  test("net worth section shows value and clicking navigates to debts", async ({ page }) => {
    if (!process.env.TEST_EMAIL) test.skip();
    await page.locator("aside button").filter({ hasText: "testuser" }).click();
    const netWorthBtn = page.getByTestId("profile-net-worth");
    await expect(netWorthBtn).toBeVisible({ timeout: 5000 });
    await expect(netWorthBtn).toContainText("11,700");
    await netWorthBtn.click();
    // Should navigate to debts view — check for Debts & Assets heading
    await expect(page.getByRole("heading", { name: "Debts & Assets" })).toBeVisible({ timeout: 5000 });
  });

  test("health score renders", async ({ page }) => {
    if (!process.env.TEST_EMAIL) test.skip();
    await page.locator("aside button").filter({ hasText: "testuser" }).click();
    await expect(page.getByTestId("health-score")).toBeVisible({ timeout: 5000 });
  });

  test("earned milestone shows label and date, unearned shows grayed", async ({ page }) => {
    if (!process.env.TEST_EMAIL) test.skip();
    await page.locator("aside button").filter({ hasText: "testuser" }).click();
    await expect(page.getByText("Bank connected")).toBeVisible({ timeout: 5000 });
    // Unearned badge should be present but grayed
    const unearnedBadge = page.locator(".grayscale").first();
    await expect(unearnedBadge).toBeVisible();
  });
});

test.describe("Profile — Dreams CRUD", () => {
  test("add a dream and it appears in the list", async ({ page }) => {
    if (!process.env.TEST_EMAIL) test.skip();
    // After POST, return the new dream in subsequent GET calls
    let dreamsData: unknown[] = [];
    await page.route("**/api/dreams**", (route) => {
      if (route.request().method() === "POST") {
        dreamsData = [{ id: "d1", icon: "🏠", title: "Buy a house", description: null, goal_id: null, sort_order: 0, goal: null }];
        route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify({ dream: dreamsData[0] }) });
      } else {
        route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ dreams: dreamsData }) });
      }
    });

    await stubProfileComplete(page);
    await page.goto("/finances");
    await page.locator("aside button").filter({ hasText: "testuser" }).click();
    await expect(page.getByText("Dreams")).toBeVisible({ timeout: 5000 });

    // Open add dream modal
    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.getByPlaceholder("Dream title")).toBeVisible();

    // Fill in title and submit
    await page.getByPlaceholder("Dream title").fill("Buy a house");
    await page.getByRole("button", { name: "Add dream" }).click();

    await expect(page.getByText("Buy a house")).toBeVisible({ timeout: 5000 });
  });
});
