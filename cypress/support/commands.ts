declare global {
  namespace Cypress {
    interface Chainable {
      loginAsUser(): Chainable<void>;
      stubDataEndpoints(): Chainable<void>;
    }
  }
}

// Logs in using real credentials from cypress.env.json and caches the session.
Cypress.Commands.add("loginAsUser", () => {
  cy.session(
    "authenticated-user",
    () => {
      cy.visit("/login");
      cy.get('input[name="email"]').type(Cypress.env("TEST_EMAIL"));
      cy.get('input[name="password"]').type(Cypress.env("TEST_PASSWORD"), { log: false });
      cy.get('button[type="submit"]').click();
      cy.url().should("eq", `${Cypress.config("baseUrl")}/`);
    },
    {
      validate() {
        cy.visit("/");
        cy.url().should("not.include", "/login");
      },
    }
  );
});

// Stubs Supabase REST calls so tests run against predictable UI state.
Cypress.Commands.add("stubDataEndpoints", () => {
  cy.intercept("GET", "**/rest/v1/chapter_progress*", { body: [] }).as("getProgress");
  cy.intercept("POST", "**/rest/v1/chapter_progress*", { statusCode: 200, body: {} });

  cy.intercept("GET", "**/rest/v1/profiles*", {
    body: [
      {
        username: "testuser",
        display_name: "Test User",
        last_chapter_id: null,
        last_tab_slug: null,
        role: "user",
      },
    ],
  }).as("getProfile");
  cy.intercept("POST", "**/rest/v1/profiles*", { statusCode: 200, body: {} });
});

export {};
