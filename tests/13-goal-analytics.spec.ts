import { test, expect } from "@playwright/test";
import { stubDataEndpoints } from "./helpers";

test.use({ storageState: ".playwright/user.json" });

const MOCK_GOAL = {
  id: "goal-analytics-1",
  name: "House Down Payment",
  icon: "🏠",
  goal_type: "savings",
  target_amount: 20000,
  target_date: "2027-12-31",
  created_at: "2026-01-01T00:00:00Z",
  current_balance: 5000,
  percent_complete: 25,
  projected_completion_date: null,
  on_track: false,
  weekly_avg_growth: 70,
  expected_balance: 6000,
  behind_by: 1000,
  status: "active",
  last_synced_at: new Date().toISOString(),
};

const MOCK_BUDGET_OVER = {
  budget_id: "budget-over-1",
  goal_id: "goal-analytics-1",
  category_name: "Food & Drink",
  category_color: "#34d399",
  category_icon: "UtensilsCrossed",
  total_limit: 300,
  effective_limit: 300,
  amount_spent: 340,
  amount_remaining: 0,
  percent_used: 113.3,
  over_budget: true,
  period_type: "monthly",
  period_start: "2026-05-01",
  period_end: "2026-05-31",
  days_remaining: 2,
  daily_rate: 0,
  transaction_count: 14,
  notified_80: false,
  notified_over: false,
  nudge_sent: false,
  status: "active",
};

const MOCK_PLAID_ACCOUNTS = [
  {
    plaid_account_id: "plaid-acc-1",
    plaid_item_id: "item-1",
    account_name: "Chase Checking",
    institution_name: "Chase",
    account_subtype: "checking",
    current_balance: 2450.00,
  },
  {
    plaid_account_id: "plaid-acc-2",
    plaid_item_id: "item-1",
    account_name: "Chase Savings",
    institution_name: "Chase",
    account_subtype: "savings",
    current_balance: 8200.00,
  },
];

async function goToDetail(
  page: Parameters<typeof stubDataEndpoints>[0],
  budgetSummaries: unknown[] = []
) {
  await stubDataEndpoints(page);
  await page.route("**/api/goals/summary**", route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ goals: [MOCK_GOAL] }) })
  );
  await page.route("**/api/goals/history**", route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ history: [] }) })
  );
  await page.route("**/api/goals/accounts**", route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ savings: null, spending: [] }) })
  );
  await page.route("**/api/budget/summary**", route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ summaries: budgetSummaries, totals: null }) })
  );
  await page.goto("/finances");
  await page.getByRole("button", { name: /goals/i }).click();
  await expect(page.getByText("House Down Payment")).toBeVisible();
  // Click the goal name to open detail view
  await page.getByText("House Down Payment").click();
  await expect(page.getByTestId("linked-accounts-section")).toBeVisible();
}

// ─── Test 1: Analytics section shows daily target ────────────────────────────

test("goal detail shows analytics section with daily target", async ({ page }) => {
  if (!process.env.TEST_EMAIL) test.skip();
  await goToDetail(page);
  await expect(page.getByTestId("analytics-section")).toBeVisible();
  await expect(page.getByText(/daily target/i)).toBeVisible();
  await expect(page.getByText(/current pace/i)).toBeVisible();
});

// ─── Test 2: Empty budgets state shows link button ───────────────────────────

test("goal detail shows No budgets linked empty state", async ({ page }) => {
  if (!process.env.TEST_EMAIL) test.skip();
  await goToDetail(page, []);
  await expect(page.getByText("No budgets linked yet.")).toBeVisible();
  await expect(page.getByTestId("inline-budget-btn")).toBeVisible();
});

// ─── Test 3: Inline budget form opens from empty state ───────────────────────

test("inline budget form opens from detail view", async ({ page }) => {
  if (!process.env.TEST_EMAIL) test.skip();
  await goToDetail(page, []);
  await page.getByTestId("inline-budget-btn").click();
  await expect(page.getByTestId("inline-budget-form")).toBeVisible();
  // Cancel closes it
  await page.getByRole("button", { name: /cancel/i }).last().click();
  await expect(page.getByTestId("inline-budget-form")).not.toBeVisible();
});

// ─── Test 4: Over-budget row shows delay impact ──────────────────────────────

test("goal detail shows over-budget row with delay impact", async ({ page }) => {
  if (!process.env.TEST_EMAIL) test.skip();
  await goToDetail(page, [MOCK_BUDGET_OVER]);
  await expect(page.getByTestId("analytics-section")).toBeVisible();
  await expect(page.getByText("Food & Drink")).toBeVisible();
  // Over-budget banner in analytics header
  await expect(page.getByText(/delays your goal/i)).toBeVisible();
  // Per-row overage text
  await expect(page.getByText(/over by/i)).toBeVisible();
  await expect(page.getByText(/delays goal/i)).toBeVisible();
});

// ─── Test 5: Wizard shows step 6 after goal creation ────────────────────────

test("goal wizard shows optional budget step after creation", async ({ page }) => {
  if (!process.env.TEST_EMAIL) test.skip();
  await stubDataEndpoints(page);
  await page.route("**/api/goals/summary**", route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ goals: [] }) })
  );
  await page.route("**/api/plaid/accounts**", route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ accounts: MOCK_PLAID_ACCOUNTS }) })
  );
  await page.route("**/api/goals/create**", route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ goal_id: "new-goal-step6-1" }) })
  );

  await page.goto("/finances");
  await page.getByRole("button", { name: /goals/i }).click();
  await expect(page.getByText("No savings goals yet")).toBeVisible();
  await page.getByRole("button", { name: /create your first goal/i }).click();
  await expect(page.getByTestId("goal-wizard")).toBeVisible();

  // Step 1: name
  await page.getByPlaceholder(/emergency fund/i).fill("My Analytics Test Goal");
  await page.getByRole("button", { name: /next →/i }).click();

  // Step 2: skip target
  await page.getByRole("button", { name: /skip for now/i }).click();

  // Step 3: pick savings account
  await expect(page.getByText("Chase Savings")).toBeVisible();
  await page.getByText("Chase Savings").click();
  await page.getByRole("button", { name: /next →/i }).click();

  // Step 4: review accounts
  await page.getByRole("button", { name: /review →/i }).click();

  // Step 5: create
  await page.getByTestId("wizard-create-btn").click();

  // Step 6 should appear
  await expect(page.getByTestId("wizard-finish-btn")).toBeVisible();
  await expect(page.getByText(/add budgets to this goal/i)).toBeVisible();
  // Progress should show 6 dots
  await expect(page.getByTestId("wizard-progress")).toBeVisible();
});

// ─── Test 6: Wizard step 6 skip closes wizard ────────────────────────────────

test("wizard step 6 skip closes wizard and creates goal", async ({ page }) => {
  if (!process.env.TEST_EMAIL) test.skip();
  await stubDataEndpoints(page);
  let goalCreated = false;
  await page.route("**/api/goals/summary**", route =>
    route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ goals: goalCreated ? [MOCK_GOAL] : [] }),
    })
  );
  await page.route("**/api/plaid/accounts**", route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ accounts: MOCK_PLAID_ACCOUNTS }) })
  );
  await page.route("**/api/goals/create**", route => {
    goalCreated = true;
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ goal_id: "new-goal-step6-skip" }) });
  });

  await page.goto("/finances");
  await page.getByRole("button", { name: /goals/i }).click();
  await page.getByRole("button", { name: /create your first goal/i }).click();
  await page.getByPlaceholder(/emergency fund/i).fill("Skip Budget Test");
  await page.getByRole("button", { name: /next →/i }).click();
  await page.getByRole("button", { name: /skip for now/i }).click();
  await page.getByText("Chase Savings").click();
  await page.getByRole("button", { name: /next →/i }).click();
  await page.getByRole("button", { name: /review →/i }).click();
  await page.getByTestId("wizard-create-btn").click();

  // Wait for step 6
  await expect(page.getByTestId("wizard-finish-btn")).toBeVisible();
  // "Skip for now" label when no budgets added
  await expect(page.getByTestId("wizard-finish-btn")).toContainText("Skip for now");

  // Click skip
  await page.getByTestId("wizard-finish-btn").click();

  // Wizard should close
  await expect(page.getByTestId("goal-wizard")).not.toBeVisible();
});

// ─── Test 7: Budget edit form shows goal picker ──────────────────────────────

test("budget edit form shows goal picker", async ({ page }) => {
  if (!process.env.TEST_EMAIL) test.skip();
  await stubDataEndpoints(page);
  await page.route("**/api/goals/summary**", route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ goals: [MOCK_GOAL] }) })
  );
  await page.route("**/api/budget/summary**", route =>
    route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ summaries: [MOCK_BUDGET_OVER], totals: { total_budgeted: 300, total_spent: 340, monthly_income: 0 } }),
    })
  );
  await page.route("**/api/budget/suggest**", route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ average: null }) })
  );

  await page.goto("/finances");
  await page.getByRole("button", { name: /budgets/i }).click();
  await expect(page.getByText("Food & Drink")).toBeVisible();

  // Click the pencil/edit button for the budget
  await page.locator('[title="Edit budget"]').click();

  // Edit form should show goal picker with the goal
  await expect(page.getByText("Savings goal")).toBeVisible();
  await expect(page.getByText("House Down Payment")).toBeVisible();
});
