import { test, expect } from "@playwright/test";
import { stubDataEndpoints } from "./helpers";

test.use({ storageState: ".playwright/user.json" });

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_ACCOUNT = {
  account_id: "acc-1",
  item_id: "item-1",
  name: "Checking",
  type: "depository",
  subtype: "checking",
  balances: { current: 1000, available: 950 },
  institution_name: "Test Bank",
};

const MOCK_TX_ORIGINAL = {
  transaction_id: "tx-cat-override-1",
  account_id: "acc-1",
  merchant_name: "Whole Foods Market",
  name: "Whole Foods Market",
  amount: 84.50,
  date: "2026-07-01",
  pending: false,
  iso_currency_code: "USD",
  personal_finance_category: { primary: "FOOD_AND_DRINK", detailed: "FOOD_AND_DRINK" },
  category_override: null,
  logo_url: null,
};

// Same transaction after override has been saved
const MOCK_TX_OVERRIDDEN = {
  ...MOCK_TX_ORIGINAL,
  category_override: "GENERAL_MERCHANDISE",
};

const MOCK_TRANSACTIONS_ORIGINAL = { transactions: [MOCK_TX_ORIGINAL], accounts: [MOCK_ACCOUNT] };
const MOCK_TRANSACTIONS_OVERRIDDEN = { transactions: [MOCK_TX_OVERRIDDEN], accounts: [MOCK_ACCOUNT] };

// ─── Helper ───────────────────────────────────────────────────────────────────

async function goToTransactions(
  page: Parameters<typeof stubDataEndpoints>[0],
  txResponse = MOCK_TRANSACTIONS_ORIGINAL
) {
  await stubDataEndpoints(page);
  await page.route("**/rest/v1/plaid_items**", route =>
    route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify([{ item_id: "item-1", institution_name: "Test Bank" }]),
    })
  );
  await page.route("**/api/plaid/transactions**", route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(txResponse) })
  );
  await page.route("**/api/bills**", route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ bills: [] }) })
  );
  await page.goto("/finances?tab=transactions");
  // Wait for transactions tab to render
  await page.waitForSelector("text=Whole Foods Market", { timeout: 8000 });
}

// ─── Test 1: CategoryPill override persists across reload ────────────────────

test("category override persists across page reload", async ({ page }) => {
  if (!process.env.TEST_EMAIL) test.skip();

  await goToTransactions(page);

  // The transaction starts as FOOD_AND_DRINK
  const initialPill = page.locator('[title="Click to change category"]').first();
  await expect(initialPill).toContainText("Food & Drink");

  // Intercept the PATCH — confirm it fires with the new category
  let patchBody: Record<string, unknown> = {};
  await page.route("**/api/transactions/tx-cat-override-1/category**", async route => {
    const req = route.request();
    try { patchBody = await req.postDataJSON(); } catch { /* ignore */ }
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
  });

  // Click the CategoryPill to open picker
  await initialPill.click();
  // Select "General Merchandise"
  await page.locator('[data-testid="category-picker"], .rounded-xl').filter({ hasText: "General Merch" }).locator('button', { hasText: "General Merch" }).first().click();

  // Optimistic update: pill should show the new category immediately
  await expect(initialPill).toContainText("General Merch", { timeout: 3000 });

  // PATCH was sent with correct payload
  expect(patchBody.category).toBe("GENERAL_MERCHANDISE");

  // ── Reload: GET returns transaction with override already set ──────────────
  await page.unroute("**/api/plaid/transactions**");
  await page.route("**/api/plaid/transactions**", route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(MOCK_TRANSACTIONS_OVERRIDDEN) })
  );

  await page.reload();
  await page.waitForSelector("text=Whole Foods Market", { timeout: 8000 });

  // Label must survive the reload — loaded from category_override in GET response
  const reloadedPill = page.locator('[title="Click to change category"]').first();
  await expect(reloadedPill).toContainText("General Merch");
});

// ─── Test 2: Row menu "Change category" opens CategoryPill picker ─────────────

test("row menu Change category opens the category picker", async ({ page }) => {
  if (!process.env.TEST_EMAIL) test.skip();

  await goToTransactions(page);

  await page.route("**/api/transactions/tx-cat-override-1/category**", route =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
  );

  // Hover the row to reveal the MoreHorizontal actions button
  const row = page.locator("div").filter({ hasText: /Whole Foods Market/ }).first();
  await row.hover();

  // Open the row actions menu
  await row.locator("button").filter({ has: page.locator("svg") }).last().click();
  await expect(page.getByRole("button", { name: /change category/i })).toBeVisible();

  // Click "Change category" — should open the CategoryPill dropdown, NOT call PATCH directly
  await page.getByRole("button", { name: /change category/i }).click();

  // The picker dropdown should be visible (contains category options)
  await expect(page.locator(".rounded-xl").filter({ hasText: "Food & Drink" }).first()).toBeVisible();
});

// ─── Test 3: PATCH failure reverts optimistic update ─────────────────────────

test("PATCH failure reverts category label", async ({ page }) => {
  if (!process.env.TEST_EMAIL) test.skip();

  await goToTransactions(page);

  // Make the PATCH fail
  await page.route("**/api/transactions/tx-cat-override-1/category**", route =>
    route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ error: "Server error" }) })
  );

  // Optimistically change the category
  const pill = page.locator('[title="Click to change category"]').first();
  await pill.click();
  await page.locator(".rounded-xl button").filter({ hasText: "General Merch" }).first().click();

  // After PATCH failure, the label should revert back to Food & Drink
  await expect(pill).toContainText("Food & Drink", { timeout: 3000 });
});
