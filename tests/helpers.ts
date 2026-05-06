import { Page } from "@playwright/test";

export async function stubDataEndpoints(page: Page) {
  await page.route("**/rest/v1/chapter_progress**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" })
  );
  await page.route("**/rest/v1/profiles**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([
        {
          username: "testuser",
          display_name: "Test User",
          last_chapter_id: null,
          last_tab_slug: null,
          role: "user",
        },
      ]),
    })
  );
}
