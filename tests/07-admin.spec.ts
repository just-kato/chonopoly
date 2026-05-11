// Admin tab tests.
// Server actions run server-side so we can't intercept Supabase calls.
// - User list is injected via window.__TEST_ADMIN_USERS__ before page load.
// - State-changing actions (delete, role toggle, etc.) are intercepted at the
//   Next.js server action POST level and return a stubbed RSC success payload.
// Requires TEST_EMAIL and TEST_PASSWORD.

import { test, expect, type Page } from "@playwright/test";

test.use({ storageState: ".playwright/user.json" });

// ---------------------------------------------------------------------------
// Shared mock data
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

// RSC wire format for a server action returning a plain value
function rscSuccess(value: unknown): string {
  return `0:{"a":"$L1","f":"","b":"test"}\n1:${JSON.stringify(value)}\n`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function setupAdminPage(
  page: Page,
  users: typeof MOCK_ACTIVE_USER[] = []
) {
  // Stub profile as admin so the Admin tab renders
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

  // Inject mock users before page load so AdminTab's useEffect picks them up
  await page.addInitScript((injected) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).__TEST_ADMIN_USERS__ = injected;
  }, users);
}

// Intercept the server action POST to /profile and return an RSC success payload
async function stubNextAction(page: Page, returnValue: unknown = {}) {
  await page.route("**/profile", async (route, request) => {
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

// ---------------------------------------------------------------------------
// Invite form
// ---------------------------------------------------------------------------
test.describe("Admin tab - invite user", () => {
  test.beforeEach(async ({ page }) => {
    if (!process.env.TEST_EMAIL) test.skip();
    await setupAdminPage(page);
    await page.goto("/profile");
    await page.getByRole("button", { name: "Admin" }).click();
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
    const input = page.locator('input[type="email"]');
    await expect(input).toHaveAttribute("required");
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
    await page.goto("/profile");
    await page.getByRole("button", { name: "Admin" }).click();
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
    await page.goto("/profile");
    await page.getByRole("button", { name: "Admin" }).click();
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
    const aliceRow = page.locator("div").filter({ hasText: /alice@example\.com/ }).first();
    await expect(aliceRow.getByText("USER")).toBeVisible();
  });

  test("shows ADMIN badge for admin user", async ({ page }) => {
    const bobRow = page.locator("div").filter({ hasText: /bob@example\.com/ }).first();
    await expect(bobRow.getByText("ADMIN")).toBeVisible();
  });

  test("Edit button opens inline edit form", async ({ page }) => {
    await page.getByRole("button", { name: "Edit" }).first().click();
    await expect(page.locator('input[placeholder="username"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "Save" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
  });

  test("Cancel button closes inline edit form", async ({ page }) => {
    await page.getByRole("button", { name: "Edit" }).first().click();
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.locator('input[placeholder="username"]')).not.toBeVisible();
  });

  test("edit form prefills existing username", async ({ page }) => {
    await page.getByRole("button", { name: "Edit" }).first().click();
    const input = page.locator('input[placeholder="username"]');
    await expect(input).toHaveValue("alice");
  });

  test("first delete click shows confirmation banner", async ({ page }) => {
    const deleteBtn = page.locator('[title="Delete user"]').first();
    await deleteBtn.click();
    await expect(
      page.getByText(/permanently deletes the account/i)
    ).toBeVisible();
  });

  test("dismiss hides the confirmation banner", async ({ page }) => {
    const deleteBtn = page.locator('[title="Delete user"]').first();
    await deleteBtn.click();
    await page.getByRole("button", { name: "Dismiss" }).click();
    await expect(
      page.getByText(/permanently deletes the account/i)
    ).not.toBeVisible();
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
    await page.goto("/profile");
    await page.getByRole("button", { name: "Admin" }).click();
  });

  test("role toggle button is present for active user", async ({ page }) => {
    await expect(
      page.locator('[title="Make admin"]')
    ).toBeVisible();
  });

  test("clicking role toggle changes badge to ADMIN", async ({ page }) => {
    await page.locator('[title="Make admin"]').click();
    await expect(page.getByText("ADMIN")).toBeVisible({ timeout: 5000 });
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
    await page.goto("/profile");
    await page.getByRole("button", { name: "Admin" }).click();
  });

  test("saving a new username updates the user row", async ({ page }) => {
    await page.getByRole("button", { name: "Edit" }).first().click();
    const input = page.locator('input[placeholder="username"]');
    await input.fill("newname");
    await page.getByRole("button", { name: "Save" }).click();
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
    await page.goto("/profile");
    await page.getByRole("button", { name: "Admin" }).click();
  });

  test("confirming delete removes the user from the list", async ({ page }) => {
    // First click shows confirmation
    await page.locator('[title="Delete user"]').click();
    // Second click (now titled "Click again to confirm") executes delete
    await page.locator('[title="Click again to confirm"]').click();
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
    await page.goto("/profile");
    await page.getByRole("button", { name: "Admin" }).click();
  });

  test("invited user shows INVITED badge", async ({ page }) => {
    await expect(page.getByText("INVITED")).toBeVisible();
  });

  test("invited user shows Pending status", async ({ page }) => {
    await expect(page.getByText("Pending…")).toBeVisible();
  });

  test("invited user shows Resend button", async ({ page }) => {
    await expect(page.getByRole("button", { name: /resend/i })).toBeVisible();
  });

  test("invited user shows Cancel invite button", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /cancel invite/i })
    ).toBeVisible();
  });

  test("first cancel click shows confirmation banner for invite cancellation", async ({ page }) => {
    await page.getByRole("button", { name: /cancel invite/i }).click();
    await expect(
      page.getByText(/cancels the invite/i)
    ).toBeVisible();
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
