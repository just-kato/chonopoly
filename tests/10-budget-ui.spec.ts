import { test, expect } from "@playwright/test";
import { stubDataEndpoints } from "./helpers";

test.use({ storageState: ".playwright/user.json" });

const MOCK_ACCOUNTS = [
  {
    account_id: "acc1",
    name: "Checking",
    type: "depository",
    subtype: "checking",
    balances: { current: 2450.00, available: 2300.00 },
    institution_name: "Chase",
  },
];

const MOCK_BUDGET_SUMMARY = {
  summaries: [
    {
      budget_id: "budget-1",
      goal_id: "goal-1",
      category_name: "Food & Drink",
      category_color: "#34d399",
      category_icon: "UtensilsCrossed",
      total_limit: 200.00,
      effective_limit: 200.00,
      amount_spent: 87.50,
      amount_remaining: 112.50,
      percent_used: 43.8,
      over_budget: false,
      period_type: "monthly",
      period_start: "2026-05-01",
      period_end: "2026-05-31",
      days_remaining: 4,
      daily_rate: 12.50,
      transaction_count: 3,
      notified_80: false,
      notified_over: false,
      nudge_sent: false,
      status: "active",
    },
  ],
  totals: { total_budgeted: 200, total_spent: 87.5, monthly_income: 0 },
};

const MOCK_GOALS = {
  goals: [
    { id: "goal-1", name: "Emergency Fund", icon: "🏦", goal_type: "savings", target_amount: 5000, current_balance: 1200, status: "active" },
  ],
};

const MOCK_SNAPSHOTS_EMPTY = { snapshots: [] };

const MOCK_SNAPSHOTS = {
  snapshots: [
    { date: "2026-05-27", daily_rate: 10.00, amount_spent: 90.00, remaining_after: 110.00, days_remaining_after: 4 },
    { date: "2026-05-26", daily_rate: 11.25, amount_spent: 80.00, remaining_after: 120.00, days_remaining_after: 5 },
    { date: "2026-05-25", daily_rate: 12.50, amount_spent: 70.00, remaining_after: 130.00, days_remaining_after: 6 },
  ],
};

async function stubBudgetPage(page: Parameters<typeof stubDataEndpoints>[0]) {
  await stubDataEndpoints(page);
  await page.route("**/rest/v1/plaid_items**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([{ id: "id1", access_token: "tok", item_id: "item1", institution_name: "Chase" }]),
    })
  );
  await page.route("**/api/plaid/transactions**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ accounts: MOCK_ACCOUNTS, transactions: [] }),
    })
  );
}

test.describe("Budget UI — Step 6", () => {
  test("budget card shows daily rate", async ({ page }) => {
    if (!process.env.TEST_EMAIL) test.skip();
    await stubBudgetPage(page);
    await page.route("**/api/budget/summary**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_BUDGET_SUMMARY) })
    );
    await page.route("**/api/goals/summary**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_GOALS) })
    );
    await page.goto("/finances");
    await page.getByRole("button", { name: /budgets/i }).click();

    await expect(page.getByText("$12.50")).toBeVisible();
    await expect(page.getByText(/\/day/)).toBeVisible();
    await expect(page.getByText("$87.50 / $200.00")).not.toBeVisible();
  });

  test("budget card click opens drill-down, back returns to list", async ({ page }) => {
    if (!process.env.TEST_EMAIL) test.skip();
    await stubBudgetPage(page);
    await page.route("**/api/budget/summary**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_BUDGET_SUMMARY) })
    );
    await page.route("**/api/goals/summary**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_GOALS) })
    );
    await page.route("**/api/budget/snapshots**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_SNAPSHOTS_EMPTY) })
    );
    await page.goto("/finances");
    await page.getByRole("button", { name: /budgets/i }).click();

    // Click the card (not a button inside it)
    await page.locator("text=Food & Drink").first().click();

    // Drill-down header visible
    await expect(page.getByRole("button", { name: /back/i })).toBeVisible();
    await expect(page.getByText("$12.50")).toBeVisible();

    // Back button returns to list
    await page.getByRole("button", { name: /back/i }).click();
    await expect(page.locator("text=Food & Drink").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /back/i })).not.toBeVisible();
  });

  test("drill-down no-snapshots state shows nightly message", async ({ page }) => {
    if (!process.env.TEST_EMAIL) test.skip();
    await stubBudgetPage(page);
    await page.route("**/api/budget/summary**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_BUDGET_SUMMARY) })
    );
    await page.route("**/api/goals/summary**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_GOALS) })
    );
    await page.route("**/api/budget/snapshots**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_SNAPSHOTS_EMPTY) })
    );
    await page.goto("/finances");
    await page.getByRole("button", { name: /budgets/i }).click();
    await page.locator("text=Food & Drink").first().click();

    await expect(page.getByText(/Snapshots are calculated nightly/)).toBeVisible();
  });

  test("drill-down Daily tab shows snapshot rows", async ({ page }) => {
    if (!process.env.TEST_EMAIL) test.skip();
    await stubBudgetPage(page);
    await page.route("**/api/budget/summary**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_BUDGET_SUMMARY) })
    );
    await page.route("**/api/goals/summary**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_GOALS) })
    );
    await page.route("**/api/budget/snapshots**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_SNAPSHOTS) })
    );
    await page.goto("/finances");
    await page.getByRole("button", { name: /budgets/i }).click();
    await page.locator("text=Food & Drink").first().click();

    // Daily tab is default — 3 rows should appear
    await expect(page.getByText("May 27")).toBeVisible();
    await expect(page.getByText("May 26")).toBeVisible();
    await expect(page.getByText("May 25")).toBeVisible();
  });

  test("no-goals empty state shows goal CTA, not budget CTA", async ({ page }) => {
    if (!process.env.TEST_EMAIL) test.skip();
    await stubBudgetPage(page);
    await page.route("**/api/budget/summary**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ summaries: [], totals: null }) })
    );
    await page.route("**/api/goals/summary**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ goals: [] }) })
    );
    await page.goto("/finances");
    await page.getByRole("button", { name: /budgets/i }).click();

    await expect(page.getByText("Create a savings goal first")).toBeVisible();
    await expect(page.getByText("Create your first budget")).not.toBeVisible();
  });

  test("context switcher shows Personal in sidebar", async ({ page }) => {
    if (!process.env.TEST_EMAIL) test.skip();
    await stubBudgetPage(page);
    await page.route("**/api/budget/summary**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ summaries: [], totals: null }) })
    );
    await page.route("**/api/goals/summary**", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_GOALS) })
    );
    await page.goto("/finances");

    await expect(page.getByText("Personal")).toBeVisible();
    await expect(page.getByText("CONTEXT")).toBeVisible();
  });
});
