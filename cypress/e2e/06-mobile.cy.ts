// Tests the mobile responsive layout: hamburger menu, sidebar drawer, and backdrop.
// Requires TEST_EMAIL and TEST_PASSWORD.

before(function () {
  if (!Cypress.env("TEST_EMAIL") || !Cypress.env("TEST_PASSWORD")) {
    this.skip();
  }
});

describe("Mobile layout", () => {
  beforeEach(() => {
    cy.loginAsUser();
    cy.stubDataEndpoints();
    cy.viewport("iphone-x");
    cy.visit("/");
  });

  it("shows the hamburger button on mobile", () => {
    cy.get('button[aria-label="Open menu"]').should("be.visible");
  });

  it("sidebar is off-screen by default on mobile", () => {
    cy.get('button[aria-label="Close menu"]').should("not.be.visible");
  });

  it("hamburger button opens the sidebar", () => {
    cy.get('button[aria-label="Open menu"]').click();
    cy.get('button[aria-label="Close menu"]').should("be.visible");
    cy.contains("Real Estate Study Guide").should("be.visible");
  });

  it("X button closes the sidebar", () => {
    cy.get('button[aria-label="Open menu"]').click();
    cy.get('button[aria-label="Close menu"]').click();
    cy.get('button[aria-label="Close menu"]').should("not.be.visible");
  });

  it("tapping the backdrop closes the sidebar", () => {
    cy.get('button[aria-label="Open menu"]').click();
    cy.get('button[aria-label="Close menu"]').should("be.visible");
    // Click the semi-transparent backdrop (outside the sidebar)
    cy.get("body").click(10, 400);
    cy.get('button[aria-label="Close menu"]').should("not.be.visible");
  });

  it("selecting a chapter closes the sidebar", () => {
    cy.get('button[aria-label="Open menu"]').click();
    cy.contains("button", "Kinds of Property").click();
    cy.get('button[aria-label="Close menu"]').should("not.be.visible");
    cy.url().should("include", "chapter=1-2");
  });

  it("chapter content fills full width on mobile", () => {
    cy.get("main").invoke("width").should("be.greaterThan", 350);
  });

  it("tabs are horizontally scrollable on mobile", () => {
    cy.get("div").filter((_, el) => {
      const style = window.getComputedStyle(el);
      return style.overflowX === "auto" && el.querySelectorAll("button").length > 4;
    }).should("exist");
  });
});

describe("Desktop layout", () => {
  beforeEach(() => {
    cy.loginAsUser();
    cy.stubDataEndpoints();
    cy.viewport(1280, 800);
    cy.visit("/");
  });

  it("sidebar is visible by default on desktop", () => {
    cy.contains("Real Estate Study Guide").should("be.visible");
  });

  it("hamburger button is hidden on desktop", () => {
    cy.get('button[aria-label="Open menu"]').should("not.be.visible");
  });
});
