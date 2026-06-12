import { test, expect } from "@playwright/test";
import { stubDataEndpoints } from "./helpers";

test.use({ storageState: ".playwright/user.json" });

const GOAL_ROW = {
  id: "goal-1", name: "Emergency Fund", icon: "🎯", goal_type: "savings",
  target_amount: 10000, target_date: "2027-01-01", created_at: "2026-01-01T00:00:00Z",
  current_balance: 2500, percent_complete: 25, projected_completion_date: null,
  on_track: true, weekly_avg_growth: 100, expected_balance: 2000,
  behind_by: 0, status: "active", last_synced_at: null,
};

async function goToBudgets(page: Parameters<typeof stubDataEndpoints>[0]) {
  await stubDataEndpoints(page);
  await page.route("**/api/budget/summary**", route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ summaries: [], totals: null }) })
  );
  await page.route("**/api/goals/summary**", route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ goals: [GOAL_ROW] }) })
  );
  await page.route("**/api/plaid/**", route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ accounts: [], link_token: "test" }) })
  );
  await page.route("**/api/budget/suggest**", route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ average: null }) })
  );
  await page.goto("/finances");
  await page.getByRole("button", { name: /^Budgets$/i }).click();
}

// ─── Test 1: Wizard opens ─────────────────────────────────────────────────────

test("Clicking 'Create your first budget' opens the wizard", async ({ page }) => {
  if (!process.env.TEST_EMAIL) test.skip();
  await goToBudgets(page);
  await page.getByRole("button", { name: /Create your first budget/i }).click();
  await expect(page.getByText("New budget")).toBeVisible();
  // Progress dots visible (4 dots rendered)
  await expect(page.locator(".wizard-pop-in")).toBeVisible();
});

// ─── Test 2: Step 1 — cannot advance without category ────────────────────────

test("Step 1: Next button disabled until category selected", async ({ page }) => {
  if (!process.env.TEST_EMAIL) test.skip();
  await goToBudgets(page);
  await page.getByRole("button", { name: /Create your first budget/i }).click();

  const nextBtn = page.getByRole("button", { name: /Next →/i });
  await expect(nextBtn).toBeDisabled();

  await page.getByRole("button", { name: "Food & Drink" }).click();
  await expect(nextBtn).toBeEnabled();
});

// ─── Test 3: Step 2 — Skip advances to step 3 ────────────────────────────────

test("Step 2: 'Skip — no goal' advances to step 3", async ({ page }) => {
  if (!process.env.TEST_EMAIL) test.skip();
  await goToBudgets(page);
  await page.getByRole("button", { name: /Create your first budget/i }).click();

  // Step 1 — pick a category
  await page.getByRole("button", { name: "Food & Drink" }).click();
  await page.getByRole("button", { name: /Next →/i }).click();

  // Step 2 — skip
  await expect(page.getByText("Which savings goal is this for?")).toBeVisible();
  await page.getByRole("button", { name: /Skip — no goal/i }).click();

  // Step 3
  await expect(page.getByText("Set your limit")).toBeVisible();
});

// ─── Test 4: Step 3 — cannot advance without limit ───────────────────────────

test("Step 3: Review button disabled until limit > 0", async ({ page }) => {
  if (!process.env.TEST_EMAIL) test.skip();
  await goToBudgets(page);
  await page.getByRole("button", { name: /Create your first budget/i }).click();

  await page.getByRole("button", { name: "Food & Drink" }).click();
  await page.getByRole("button", { name: /Next →/i }).click();
  await page.getByRole("button", { name: /Skip — no goal/i }).click();

  const reviewBtn = page.getByRole("button", { name: /Review →/i });
  await expect(reviewBtn).toBeDisabled();

  await page.locator("input[type=number]").fill("500");
  await expect(reviewBtn).toBeEnabled();
});

// ─── Test 5: Step 4 — review card shows correct values ───────────────────────

test("Step 4: Review card shows category, period, and limit", async ({ page }) => {
  if (!process.env.TEST_EMAIL) test.skip();
  await goToBudgets(page);
  await page.getByRole("button", { name: /Create your first budget/i }).click();

  await page.getByRole("button", { name: "Food & Drink" }).click();
  await page.getByRole("button", { name: /Next →/i }).click();
  await page.getByRole("button", { name: /Skip — no goal/i }).click();

  await page.locator("input[type=number]").fill("350");
  await page.getByRole("button", { name: /Review →/i }).click();

  await expect(page.getByText("Looks good?")).toBeVisible();
  await expect(page.getByText("Food & Drink")).toBeVisible();
  await expect(page.getByText("Monthly")).toBeVisible();
  await expect(page.getByText("$350.00")).toBeVisible();
  await expect(page.getByText("Create budget")).toBeVisible();
});

// ─── Test 6: Full create flow — mocked API ────────────────────────────────────

test("Full create flow: wizard calls /api/budget/create and closes", async ({ page }) => {
  if (!process.env.TEST_EMAIL) test.skip();
  await goToBudgets(page);

  let createCalled = false;
  await page.route("**/api/budget/create**", route => {
    createCalled = true;
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });

  await page.getByRole("button", { name: /Create your first budget/i }).click();
  await page.getByRole("button", { name: "Transportation" }).click();
  await page.getByRole("button", { name: /Next →/i }).click();
  await page.getByRole("button", { name: /Skip — no goal/i }).click();
  await page.locator("input[type=number]").fill("200");
  await page.getByRole("button", { name: /Review →/i }).click();
  await page.getByRole("button", { name: /Create budget/i }).click();

  expect(createCalled).toBe(true);
  // Wizard closes — "New budget" heading gone
  await expect(page.getByText("New budget")).not.toBeVisible();
});

// ─── Test 7: Edit mode — pre-fills values and shows "Save changes" ────────────

test("Edit mode: wizard pre-fills and shows 'Save changes' on step 4", async ({ page }) => {
  if (!process.env.TEST_EMAIL) test.skip();

  await stubDataEndpoints(page);
  await page.route("**/api/budget/summary**", route =>
    route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({
        summaries: [{
          budget_id: "b-1", name: "My Food Budget", category_name: "Food & Drink",
          category_color: "#34d399", category_icon: "UtensilsCrossed",
          goal_id: "goal-1", total_limit: 500, effective_limit: 500,
          amount_spent: 200, amount_remaining: 300, percent_used: 40,
          over_budget: false, period_type: "monthly", period_start: "2026-06-01",
          period_end: "2026-06-30", days_remaining: 24, daily_rate: 8.33,
          transaction_count: 5, notified_80: false, notified_over: false,
          nudge_sent: false, status: "active",
        }],
        totals: null,
      }),
    })
  );
  await page.route("**/api/goals/summary**", route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ goals: [GOAL_ROW] }) })
  );
  await page.route("**/api/plaid/**", route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ accounts: [] }) })
  );
  await page.route("**/api/budget/suggest**", route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ average: null }) })
  );

  await page.goto("/finances");
  await page.getByRole("button", { name: /^Budgets$/i }).click();

  // Click the pencil edit button on the card
  await page.locator("[title='Edit budget']").click();

  // Wizard opens in edit mode with pre-filled name
  await expect(page.getByText("Edit budget")).toBeVisible();
  await expect(page.locator("input[placeholder]").first()).toHaveValue("My Food Budget");

  // Advance to step 4
  await page.getByRole("button", { name: /Next →/i }).click();
  await page.getByRole("button", { name: /Next →/i }).click();
  await page.getByRole("button", { name: /Review →/i }).click();

  await expect(page.getByText("Save changes")).toBeVisible();
});

// ─── Test 8: Discard overlay ──────────────────────────────────────────────────

test("Discard overlay shown when closing with dirty state; Keep editing dismisses it", async ({ page }) => {
  if (!process.env.TEST_EMAIL) test.skip();
  await goToBudgets(page);
  await page.getByRole("button", { name: /Create your first budget/i }).click();

  // Type a name to make it dirty
  await page.locator("input[placeholder*='Groceries']").fill("Coffee");

  // Click X
  await page.locator("button:has(svg)").filter({ hasNot: page.locator("span") }).first().click();

  // Discard overlay appears
  await expect(page.getByText("Discard this budget?")).toBeVisible();

  // Keep editing dismisses it
  await page.getByRole("button", { name: "Keep editing" }).click();
  await expect(page.getByText("Discard this budget?")).not.toBeVisible();
  await expect(page.getByText("New budget")).toBeVisible();
});
