// Admin tab tests.
// Server actions run server-side so we can't intercept Supabase calls directly.
// - User list is injected via window.__TEST_ADMIN_USERS__ before page load.
// - State-changing actions (delete, role toggle, save username) are intercepted at the
//   Next.js server action POST level (POST to /profile with Next-Action header).
// Requires TEST_EMAIL and TEST_PASSWORD.

import { test, expect, type Page } from "@playwright/test";

test.use({ storageState: ".playwright/user.json" });

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
const MOCK_ACTIVE_USER = {
  id: "user-active-1",
  email: "alice@example.com",
  username: "alice",
  role: "user" as const,
  created_at: "2024-01-01T00:00:00Z",
  invited: false,
};
const MOCK_ADMIN_USER = {
  id: "user-active-2",
  email: "bob@example.com",
  username: "bob",
  role: "admin" as const,
  created_at: "2024-01-02T00:00:00Z",
  invited: false,
};
const MOCK_INVITED_USER = {
  id: "user-invited-1",
  email: "charlie@example.com",
  username: null,
  role: "user" as const,
  created_at: "2024-01-03T00:00:00Z",
  invited: true,
};

// RSC wire format: simple inline action result (no lazy reference needed)
function rscSuccess(value: unknown): string {
  return `0:{"a":${JSON.stringify(value)},"f":"","b":"test"}\n`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function setupAdminPage(page: Page, users: object[] = []) {
  await page.route("**/rest/v1/profiles**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          username: "testadmin",
          last_chapter_id: null,
          last_tab_slug: null,
          role: "admin",
          avatar_url: null,
          avatar_color: "amber",
        },
      ]),
    })
  );
  await page.route("**/rest/v1/chapter_progress**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  );
  await page.addInitScript((injected) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__TEST_ADMIN_USERS__ = injected;
  }, users);
}

// Intercept the Next.js server action POST (any URL matching /profile path)
// and return a stubbed RSC success payload so state-changing actions resolve.
async function stubNextAction(page: Page, returnValue: unknown = {}) {
  await page.route("**/profile*", async (route, request) => {
    if (request.method() === "POST" && request.headers()["next-action"]) {
      await route.fulfill({
        status: 200,
        contentType: "text/x-component",
        body: rscSuccess(returnValue),
      });
      return;
    }
    await route.continue();
  });
}

// Navigate to /profile and wait for Admin tab to be fully rendered.
// Using waitFor on "INVITE USER" ensures the Admin tab content has mounted
// and the Profile tab content (username input, Save changes button) has unmounted.
async function gotoAdminTab(page: Page) {
  await page.goto("/profile");
  await page.getByRole("button", { name: "Admin" }).click();
  await expect(page.getByText("INVITE USER")).toBeVisible();
}

// Scoped user-row locator — avoids strict mode violations from broader selectors
function userRow(page: Page, email: string) {
  return page.locator('[data-testid="user-row"]').filter({ hasText: email });
}

// ---------------------------------------------------------------------------
// Invite form
// ---------------------------------------------------------------------------
test.describe("Admin tab - invite user", () => {
  test.beforeEach(async ({ page }) => {
    if (!process.env.TEST_EMAIL) test.skip();
    await setupAdminPage(page);
    await gotoAdminTab(page);
  });

  test("Admin tab is visible when user has admin role", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Admin" })).toBeVisible();
  });

  test("invite form renders inside Admin tab", async ({ page }) => {
    await expect(page.getByText("INVITE USER")).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "Invite" })).toBeVisible();
  });

  test("invite email input has required attribute", async ({ page }) => {
    await expect(page.locator('input[type="email"]')).toHaveAttribute("required");
  });

  test("submitting invite shows a feedback message", async ({ page }) => {
    await page.locator('input[type="email"]').fill("newuser@example.com");
    await page.getByRole("button", { name: "Invite" }).click();
    await expect(
      page.locator("p").filter({ hasText: /invite|error|authorized|rate|sent/i })
    ).toBeVisible({ timeout: 10000 });
  });
});

// ---------------------------------------------------------------------------
// Empty user list
// ---------------------------------------------------------------------------
test.describe("Admin tab - empty user list", () => {
  test.beforeEach(async ({ page }) => {
    if (!process.env.TEST_EMAIL) test.skip();
    await setupAdminPage(page, []);
    await gotoAdminTab(page);
  });

  test("shows 'No other users yet' when list is empty", async ({ page }) => {
    await expect(page.getByText("No other users yet")).toBeVisible();
  });

  test("shows 'All Users (0)' heading", async ({ page }) => {
    await expect(page.getByText("All Users (0)")).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Active user rows
// ---------------------------------------------------------------------------
test.describe("Admin tab - active users", () => {
  test.beforeEach(async ({ page }) => {
    if (!process.env.TEST_EMAIL) test.skip();
    await setupAdminPage(page, [MOCK_ACTIVE_USER, MOCK_ADMIN_USER]);
    await gotoAdminTab(page);
    // Wait for user list to be populated before each test
    await expect(page.getByText("All Users (2)")).toBeVisible();
  });

  test("shows user count", async ({ page }) => {
    await expect(page.getByText("All Users (2)")).toBeVisible();
  });

  test("shows usernames and emails", async ({ page }) => {
    await expect(page.getByText("@alice")).toBeVisible();
    await expect(page.getByText("alice@example.com")).toBeVisible();
    await expect(page.getByText("@bob")).toBeVisible();
  });

  test("shows USER badge for regular user", async ({ page }) => {
    // Use exact match to avoid matching "INVITE USER" or "All Users" case-insensitively
    await expect(userRow(page, "alice@example.com").getByText("USER", { exact: true })).toBeVisible();
  });

  test("shows ADMIN badge for admin user", async ({ page }) => {
    await expect(userRow(page, "bob@example.com").getByText("ADMIN", { exact: true })).toBeVisible();
  });

  test("Edit button opens inline edit form", async ({ page }) => {
    await userRow(page, "alice@example.com").getByRole("button", { name: "Edit" }).click();
    await expect(userRow(page, "alice@example.com").locator('input[placeholder="username"]')).toBeVisible();
    await expect(userRow(page, "alice@example.com").getByRole("button", { name: "Save", exact: true })).toBeVisible();
    await expect(userRow(page, "alice@example.com").getByRole("button", { name: "Cancel" })).toBeVisible();
  });

  test("Cancel button closes inline edit form", async ({ page }) => {
    const row = userRow(page, "alice@example.com");
    await row.getByRole("button", { name: "Edit" }).click();
    await row.getByRole("button", { name: "Cancel" }).click();
    await expect(row.locator('input[placeholder="username"]')).not.toBeVisible();
  });

  test("edit form prefills existing username", async ({ page }) => {
    await userRow(page, "alice@example.com").getByRole("button", { name: "Edit" }).click();
    await expect(
      userRow(page, "alice@example.com").locator('input[placeholder="username"]')
    ).toHaveValue("alice");
  });

  test("first delete click shows confirmation banner", async ({ page }) => {
    await userRow(page, "alice@example.com").locator('[title="Delete user"]').click();
    await expect(page.getByText(/permanently deletes the account/i)).toBeVisible();
  });

  test("dismiss hides the confirmation banner", async ({ page }) => {
    await userRow(page, "alice@example.com").locator('[title="Delete user"]').click();
    await page.getByRole("button", { name: "Dismiss" }).click();
    await expect(page.getByText(/permanently deletes the account/i)).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Role toggle
// ---------------------------------------------------------------------------
test.describe("Admin tab - role toggle", () => {
  test.beforeEach(async ({ page }) => {
    if (!process.env.TEST_EMAIL) test.skip();
    await setupAdminPage(page, [MOCK_ACTIVE_USER]);
    await stubNextAction(page, {});
    await gotoAdminTab(page);
    await expect(page.getByText("All Users (1)")).toBeVisible();
  });

  test("role toggle button is present for active user", async ({ page }) => {
    await expect(userRow(page, "alice@example.com").locator('[title="Make admin"]')).toBeVisible();
  });

  test("clicking role toggle changes badge to ADMIN", async ({ page }) => {
    await userRow(page, "alice@example.com").locator('[title="Make admin"]').click();
    // After mock returns {}, handleRoleToggle updates local state → badge changes
    await expect(
      userRow(page, "alice@example.com").getByText("ADMIN", { exact: true })
    ).toBeVisible({ timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// Edit username save
// ---------------------------------------------------------------------------
test.describe("Admin tab - edit username", () => {
  test.beforeEach(async ({ page }) => {
    if (!process.env.TEST_EMAIL) test.skip();
    await setupAdminPage(page, [MOCK_ACTIVE_USER]);
    await stubNextAction(page, {});
    await gotoAdminTab(page);
    await expect(page.getByText("All Users (1)")).toBeVisible();
  });

  test("saving a new username updates the user row", async ({ page }) => {
    const row = userRow(page, "alice@example.com");
    await row.getByRole("button", { name: "Edit" }).click();
    await row.locator('input[placeholder="username"]').fill("newname");
    await row.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("@newname")).toBeVisible({ timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// Delete user
// ---------------------------------------------------------------------------
test.describe("Admin tab - delete user", () => {
  test.beforeEach(async ({ page }) => {
    if (!process.env.TEST_EMAIL) test.skip();
    await setupAdminPage(page, [MOCK_ACTIVE_USER]);
    await stubNextAction(page, {});
    await gotoAdminTab(page);
    await expect(page.getByText("All Users (1)")).toBeVisible();
  });

  test("confirming delete removes the user from the list", async ({ page }) => {
    const row = userRow(page, "alice@example.com");
    // First click shows confirmation
    await row.locator('[title="Delete user"]').click();
    // Second click (confirm) executes delete; mock returns {} so UI removes the row
    await row.locator('[title="Click again to confirm"]').click();
    await expect(page.getByText("@alice")).not.toBeVisible({ timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// Invited users
// ---------------------------------------------------------------------------
test.describe("Admin tab - invited users", () => {
  test.beforeEach(async ({ page }) => {
    if (!process.env.TEST_EMAIL) test.skip();
    await setupAdminPage(page, [MOCK_INVITED_USER]);
    await stubNextAction(page, {});
    await gotoAdminTab(page);
    await expect(page.getByText("All Users (1)")).toBeVisible();
  });

  test("invited user shows INVITED badge", async ({ page }) => {
    await expect(userRow(page, "charlie@example.com").getByText("INVITED", { exact: true })).toBeVisible();
  });

  test("invited user shows Pending status", async ({ page }) => {
    await expect(page.getByText("Pending…")).toBeVisible();
  });

  test("invited user shows Resend button", async ({ page }) => {
    await expect(page.getByRole("button", { name: /resend/i })).toBeVisible();
  });

  test("invited user shows Cancel invite button", async ({ page }) => {
    await expect(page.getByRole("button", { name: /cancel invite/i })).toBeVisible();
  });

  test("first cancel click shows confirmation banner for invite cancellation", async ({ page }) => {
    await page.getByRole("button", { name: /cancel invite/i }).click();
    await expect(page.getByText(/cancels the invite/i)).toBeVisible();
  });

  test("dismiss hides cancel invite confirmation", async ({ page }) => {
    await page.getByRole("button", { name: /cancel invite/i }).click();
    await page.getByRole("button", { name: "Dismiss" }).click();
    await expect(page.getByText(/cancels the invite/i)).not.toBeVisible();
  });

  test("confirming cancel removes the invited user from list", async ({ page }) => {
    await page.getByRole("button", { name: /cancel invite/i }).click();
    await page.getByRole("button", { name: "Confirm" }).click();
    await expect(page.getByText("charlie@example.com")).not.toBeVisible({ timeout: 5000 });
  });

  test("resend invite shows feedback message", async ({ page }) => {
    await page.getByRole("button", { name: /resend/i }).click();
    await expect(
      page.locator("p").filter({ hasText: /resent|error|authorized|rate/i })
    ).toBeVisible({ timeout: 10000 });
  });
});
