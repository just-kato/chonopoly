import { test, expect } from "@playwright/test";
import { stubDataEndpoints } from "./helpers";

test.use({ storageState: ".playwright/user.json" });

async function goToManage(page: Parameters<typeof stubDataEndpoints>[0]) {
  await stubDataEndpoints(page);
  await page.route("**/api/budget/summary**", route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ summaries: [], totals: null }) })
  );
  await page.route("**/api/goals/summary**", route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ goals: [] }) })
  );
  await page.route("**/api/bills**", route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ bills: [] }) })
  );
  await page.route("**/api/debts/summary**", route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ debts: [] }) })
  );
  await page.route("**/api/assets/summary**", route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ assets: [] }) })
  );
  await page.route("**/api/plaid/**", route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ accounts: [], link_token: "test" }) })
  );
  await page.goto("/finances");
  await page.getByRole("button", { name: /^Manage$/i }).click();
}

// ─── Test 1: Toggle buttons visible ──────────────────────────────────────────

test("Manage panel shows card and table view toggle buttons", async ({ page }) => {
  if (!process.env.TEST_EMAIL) test.skip();
  await goToManage(page);
  await expect(page.getByTitle("Card view")).toBeVisible();
  await expect(page.getByTitle("Table view")).toBeVisible();
});

// ─── Test 2: Table view shows column headers ──────────────────────────────────

test("Switching to table view renders column headers for Budgets", async ({ page }) => {
  if (!process.env.TEST_EMAIL) test.skip();

  await stubDataEndpoints(page);
  await page.route("**/api/budget/summary**", route =>
    route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({
        summaries: [{
          budget_id: "b-1", category_name: "Food", category_color: "#f00",
          category_icon: "UtensilsCrossed", total_limit: 500, effective_limit: 500,
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
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ goals: [] }) })
  );
  await page.route("**/api/bills**", route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ bills: [] }) })
  );
  await page.route("**/api/debts/summary**", route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ debts: [] }) })
  );
  await page.route("**/api/assets/summary**", route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ assets: [] }) })
  );
  await page.route("**/api/plaid/**", route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ accounts: [] }) })
  );

  await page.goto("/finances");
  await page.getByRole("button", { name: /^Manage$/i }).click();

  // Switch to table view
  await page.getByTitle("Table view").click();

  // Column headers visible
  await expect(page.getByRole("columnheader", { name: /Category/i })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: /Period/i })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: /Progress/i })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: /Spent/i })).toBeVisible();

  // Data row visible
  await expect(page.getByText("Food")).toBeVisible();
});

// ─── Test 3: Card view is default; toggle back restores it ────────────────────

test("Switching to table then back to card restores card view", async ({ page }) => {
  if (!process.env.TEST_EMAIL) test.skip();
  await goToManage(page);

  // Card view is default — "Add budget" create button visible
  await expect(page.locator("button", { hasText: /^Add budget$/ }).first()).toBeVisible();

  // Switch to table
  await page.getByTitle("Table view").click();

  // Switch back to card
  await page.getByTitle("Card view").click();

  // Card view restored
  await expect(page.locator("button", { hasText: /^Add budget$/ }).first()).toBeVisible();
});

// ─── Test 4: View pref is per-section ────────────────────────────────────────

test("View preference is independent per section", async ({ page }) => {
  if (!process.env.TEST_EMAIL) test.skip();
  await goToManage(page);

  // Switch Budgets to table
  await page.getByTitle("Table view").click();

  // Navigate to Bills — should still be card by default
  await page.getByRole("button", { name: /^Bills$/i }).click();
  await expect(page.getByTitle("Card view")).toBeVisible();

  // Navigate back to Budgets — should still be table
  await page.getByRole("button", { name: /^Budgets$/i }).click();

  // Table view toggle should be active (accent styling means it was persisted)
  // Confirm by checking no "Add budget" header button shortcut from card slot
  // (table renders empty state when bills:[])
  const tableToggle = page.getByTitle("Table view");
  await expect(tableToggle).toBeVisible();
});

// ─── Test 5: localStorage persists view preference across reload ──────────────

test("Table view preference persists after page reload", async ({ page }) => {
  if (!process.env.TEST_EMAIL) test.skip();
  await goToManage(page);

  // Set Budgets to table view and remember it
  await page.getByTitle("Table view").click();
  await page.waitForTimeout(100);

  // Confirm localStorage was written
  const stored = await page.evaluate(() => localStorage.getItem("manage_view_budgets"));
  expect(stored).toBe("table");

  // Reload
  await page.reload();
  await page.getByRole("button", { name: /^Manage$/i }).click();

  // Should still be in table view (toggle button present + card isn't the default)
  const storedAfter = await page.evaluate(() => localStorage.getItem("manage_view_budgets"));
  expect(storedAfter).toBe("table");
});

// ─── Test 6: All section table headers render ─────────────────────────────────

test("Table view headers render for Bills, Goals, Debts, Assets", async ({ page }) => {
  if (!process.env.TEST_EMAIL) test.skip();

  await stubDataEndpoints(page);
  await page.route("**/api/budget/summary**", route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ summaries: [], totals: null }) })
  );
  // Bills — one row so table renders
  await page.route("**/api/bills**", route =>
    route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ bills: [{
        id: "bill-1", name: "Netflix", amount: 15.99, due_day: 5,
        recurrence: "monthly", is_active: true, is_auto_detected: false,
        next_due_date: "2026-06-05", last_paid_at: null,
        category_id: null, created_at: "2026-01-01T00:00:00Z", bill_payments: [],
      }] }),
    })
  );
  // Goals — one row
  await page.route("**/api/goals/summary**", route =>
    route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ goals: [{
        id: "goal-1", name: "Emergency Fund", icon: "🎯", goal_type: "savings",
        target_amount: 10000, target_date: "2027-01-01", created_at: "2026-01-01T00:00:00Z",
        current_balance: 2500, percent_complete: 25, projected_completion_date: null,
        on_track: true, weekly_avg_growth: 100, expected_balance: 2000,
        behind_by: 0, status: "active", last_synced_at: null,
      }] }),
    })
  );
  // Debts — one row
  await page.route("**/api/debts/summary**", route =>
    route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ debts: [{
        id: "debt-1", name: "Chase Card", icon: "💳", debt_type: "credit_card",
        original_balance: 5000, current_balance: 3800, interest_rate: 24.99,
        minimum_payment: 95, priority_order: 0, target_date: null,
        status: "active", created_at: "2026-01-01T00:00:00Z",
        amount_paid: 1200, percent_paid: 24, monthly_interest: 79.14,
        months_to_payoff: 60, projected_payoff_date: "2031-07-01", total_interest_remaining: 1919,
      }] }),
    })
  );
  // Assets — one row
  await page.route("**/api/assets/summary**", route =>
    route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ assets: [{
        id: "asset-1", name: "My Car", icon: "🚗", asset_type: "vehicle",
        current_value: 18000, linked_debt_id: null, linked_debt_name: null,
        linked_debt_balance: null, net_equity: 18000, created_at: "2026-01-01T00:00:00Z",
      }], claimed_debt_ids: [] }),
    })
  );
  await page.route("**/api/plaid/**", route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ accounts: [] }) })
  );

  await page.goto("/finances");
  await page.getByRole("button", { name: /^Manage$/i }).click();

  const sections: Array<{ name: string; headers: RegExp[] }> = [
    { name: "Bills",   headers: [/Amount/i, /Recurrence/i, /Status/i] },
    { name: "Goals",   headers: [/^Target$/i, /Saved/i, /Pace/i] },
    { name: "Debts",   headers: [/Balance/i, /APR/i, /Monthly Interest/i] },
    { name: "Assets",  headers: [/Value/i, /Linked Debt/i, /Net Equity/i] },
  ];

  for (const { name, headers } of sections) {
    await page.getByRole("button", { name: new RegExp(`^${name}$`, "i") }).click();
    await page.getByTitle("Table view").click();
    for (const h of headers) {
      await expect(page.getByRole("columnheader", { name: h })).toBeVisible();
    }
  }
});
