import { test, expect } from "@playwright/test";
import { stubDataEndpoints } from "./helpers";

test.use({ storageState: ".playwright/user.json" });

const MOCK_TEAM = { id: "team-abc-123", name: "Park Properties" };

const MOCK_ACCOUNTS = [
  {
    account_id: "acc1",
    name: "Business Checking",
    type: "depository",
    subtype: "checking",
    balances: { current: 12500.0, available: 12000.0 },
    institution_name: "Chase",
    plaid_item_id: "item-1",
  },
];

async function stubFinancesPage(page: import("@playwright/test").Page, teams: typeof MOCK_TEAM[] = []) {
  await stubDataEndpoints(page);
  // Override teams/mine with provided teams
  await page.route("**/api/teams/mine**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ teams }) })
  );
  await page.route("**/api/plaid/transactions**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ accounts: MOCK_ACCOUNTS, transactions: [] }),
    })
  );
  await page.route("**/rest/v1/plaid_items**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  );
  await page.route("**/api/plaid/accounts**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ accounts: MOCK_ACCOUNTS }),
    })
  );
}

// ─── Context switcher ─────────────────────────────────────────────────────────

test.describe("Context switcher", () => {
  test.beforeEach(async ({ page }) => {
    if (!process.env.TEST_EMAIL) test.skip();
  });

  test("shows Personal option and New team button", async ({ page }) => {
    await stubFinancesPage(page);
    await page.goto("/finances");

    // Personal is always shown in the sidebar context section
    await expect(page.getByTestId("context-personal")).toBeVisible();
    await expect(page.getByText("New team")).toBeVisible();
  });

  test("shows team names when user belongs to teams", async ({ page }) => {
    await stubFinancesPage(page, [MOCK_TEAM]);
    await page.goto("/finances");

    await expect(page.getByTestId(`context-team-${MOCK_TEAM.id}`)).toBeVisible();
    await expect(page.getByTestId(`context-team-${MOCK_TEAM.id}`)).toContainText(MOCK_TEAM.name);
  });

  test("switching to team context shows team banner and settings link", async ({ page }) => {
    await stubFinancesPage(page, [MOCK_TEAM]);
    await page.goto("/finances");

    await page.getByTestId(`context-team-${MOCK_TEAM.id}`).click();

    await expect(page.getByTestId("context-banner")).toBeVisible();
    await expect(page.getByText("Team settings")).toBeVisible();
  });

  test("reset button returns to personal context", async ({ page }) => {
    await stubFinancesPage(page, [MOCK_TEAM]);
    await page.goto("/finances");

    await page.getByTestId(`context-team-${MOCK_TEAM.id}`).click();
    await expect(page.getByTestId("context-banner")).toBeVisible();

    await page.getByTestId("context-reset").click();
    await expect(page.getByTestId("context-banner")).not.toBeVisible();
    await expect(page.getByTestId("context-personal")).toBeVisible();
  });
});

// ─── Team setup wizard ────────────────────────────────────────────────────────

test.describe("Team setup wizard", () => {
  test.beforeEach(async ({ page }) => {
    if (!process.env.TEST_EMAIL) test.skip();
  });

  test("wizard opens when New team is clicked", async ({ page }) => {
    await stubFinancesPage(page);
    await page.goto("/finances");

    await page.getByText("New team").click();
    await expect(page.getByText("Name your team")).toBeVisible();
  });

  test("wizard step 1 requires a team name before advancing", async ({ page }) => {
    await stubFinancesPage(page);
    await page.goto("/finances");

    await page.getByText("New team").click();
    // Try to advance without typing a name — Next button should be disabled
    const nextBtn = page.getByRole("button", { name: /next/i }).first();
    await expect(nextBtn).toBeDisabled();
  });

  test("wizard creates team and advances through all 5 steps", async ({ page }) => {
    await stubFinancesPage(page);

    // Mock team creation
    await page.route("**/api/teams", (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({ team: MOCK_TEAM }),
        });
      } else {
        route.continue();
      }
    });
    await page.route(`**/api/teams/${MOCK_TEAM.id}/invite`, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
    );
    await page.route(`**/api/teams/${MOCK_TEAM.id}/accounts`, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) })
    );

    await page.goto("/finances");
    await page.getByText("New team").click();

    // Step 1 — name
    await page.getByPlaceholder(/team name/i).fill("Park Properties");
    await page.getByRole("button", { name: /next/i }).first().click();

    // Step 2 — invite (skip)
    await expect(page.getByText(/who's on this team/i)).toBeVisible();
    await page.getByRole("button", { name: /skip/i }).first().click();

    // Step 3 — share goals (skip)
    await expect(page.getByText(/share your goals with the team/i)).toBeVisible();
    await page.getByRole("button", { name: /skip/i }).first().click();

    // Step 4 — connect finances (skip)
    await expect(page.getByText(/connect team finances/i)).toBeVisible();
    await page.getByRole("button", { name: /skip/i }).first().click();

    // Step 5 — done
    await expect(page.getByText(/park properties/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /go to/i })).toBeVisible();
  });

  test("wizard can be closed without creating a team", async ({ page }) => {
    await stubFinancesPage(page);
    await page.goto("/finances");

    await page.getByText("New team").click();
    await expect(page.getByText("Name your team")).toBeVisible();

    // Click the X / close button
    await page.keyboard.press("Escape");
    // Fallback: click the close button if Escape doesn't work
    const closeBtn = page.getByRole("button", { name: /close|cancel/i }).first();
    if (await closeBtn.isVisible()) await closeBtn.click();

    await expect(page.getByText("Name your team")).not.toBeVisible();
  });
});

// ─── Team settings panel ──────────────────────────────────────────────────────

test.describe("Team settings panel", () => {
  test.beforeEach(async ({ page }) => {
    if (!process.env.TEST_EMAIL) test.skip();
  });

  test("team settings panel opens from sidebar link", async ({ page }) => {
    await stubFinancesPage(page, [MOCK_TEAM]);

    await page.route(`**/api/teams/${MOCK_TEAM.id}**`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          team: { id: MOCK_TEAM.id, name: MOCK_TEAM.name, description: null, org_id: "org-1" },
          members: [{ id: "m1", user_id: "user-1", role: "org_owner", joined_at: new Date().toISOString() }],
        }),
      })
    );
    await page.route(`**/api/teams/${MOCK_TEAM.id}/accounts**`, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ accounts: [] }) })
    );

    await page.goto("/finances");
    await page.getByTestId(`context-team-${MOCK_TEAM.id}`).click();
    await page.getByText("Team settings").click();

    await expect(page.getByText("Team name")).toBeVisible();
    await expect(page.getByText("Members")).toBeVisible();
  });

  test("team settings shows danger zone with leave and delete buttons", async ({ page }) => {
    await stubFinancesPage(page, [MOCK_TEAM]);

    await page.route(`**/api/teams/${MOCK_TEAM.id}**`, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          team: { id: MOCK_TEAM.id, name: MOCK_TEAM.name, description: null, org_id: "org-1" },
          members: [{ id: "m1", user_id: "user-1", role: "org_owner", joined_at: new Date().toISOString() }],
        }),
      })
    );
    await page.route(`**/api/teams/${MOCK_TEAM.id}/accounts**`, (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ accounts: [] }) })
    );

    await page.goto("/finances");
    await page.getByTestId(`context-team-${MOCK_TEAM.id}`).click();
    await page.getByText("Team settings").click();

    await expect(page.getByText("Leave team")).toBeVisible();
    await expect(page.getByText("Delete team")).toBeVisible();
  });
});

// ─── Invite accept page ───────────────────────────────────────────────────────

test.describe("Invite accept page (/invite/[token])", () => {
  test.beforeEach(async ({ page }) => {
    if (!process.env.TEST_EMAIL) test.skip();
  });

  test("shows team name, role, and accept/decline buttons for valid token", async ({ page }) => {
    await page.route("**/api/teams/invite/valid-token", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          team_name: "Park Properties",
          role: "team_member",
          email: "test@example.com",
          expires_at: new Date(Date.now() + 86400000).toISOString(),
        }),
      })
    );

    await page.goto("/invite/valid-token");

    await expect(page.getByText("Park Properties")).toBeVisible();
    await expect(page.getByRole("button", { name: /join team/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /decline/i })).toBeVisible();
  });

  test("shows error state for expired or invalid token", async ({ page }) => {
    await page.route("**/api/teams/invite/bad-token", (route) =>
      route.fulfill({ status: 410, contentType: "application/json", body: JSON.stringify({ error: "Invite has expired" }) })
    );

    await page.goto("/invite/bad-token");

    // Should show the specific error message in the error paragraph
    await expect(page.getByText("Invite has expired")).toBeVisible();
  });

  test("shows not-found state for unknown token", async ({ page }) => {
    await page.route("**/api/teams/invite/unknown-token", (route) =>
      route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({ error: "Invite not found" }) })
    );

    await page.goto("/invite/unknown-token");

    await expect(page.getByText(/not found|invalid/i).first()).toBeVisible();
  });
});
