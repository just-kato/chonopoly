// Tests core navigation: sidebar chapter selection and tab switching.
// Requires TEST_EMAIL and TEST_PASSWORD in cypress.env.json.

before(function () {
  if (!Cypress.env("TEST_EMAIL") || !Cypress.env("TEST_PASSWORD")) {
    this.skip();
  }
});

describe("Sidebar navigation", () => {
  beforeEach(() => {
    cy.loginAsUser();
    cy.stubDataEndpoints();
    cy.visit("/");
  });

  it("renders the sidebar with chapters", () => {
    cy.contains("Real Estate Study Guide").should("be.visible");
    cy.contains("CHAPTER 1").should("be.visible");
    cy.contains("1.1").should("be.visible");
    cy.contains("Kinds of Professional Activity").should("be.visible");
  });

  it("shows the active chapter highlighted", () => {
    cy.contains("Kinds of Professional Activity")
      .closest("button")
      .should("have.class", "text-amber-400");
  });

  it("navigates to a different chapter", () => {
    cy.contains("button", "Kinds of Property").click();
    cy.url().should("include", "chapter=1-2");
    cy.contains("1.2 — Kinds of Property").should("be.visible");
  });

  it("updates the active indicator after chapter change", () => {
    cy.contains("button", "Kinds of Property").click();
    cy.contains("button", "Kinds of Property")
      .closest("button")
      .should("have.class", "text-amber-400");
    cy.contains("button", "Kinds of Professional Activity")
      .closest("button")
      .should("not.have.class", "text-amber-400");
  });

  it("shows the progress circle", () => {
    cy.get("svg").contains("0%").should("exist");
    cy.contains("chapters complete").should("be.visible");
  });
});

describe("Tab navigation", () => {
  beforeEach(() => {
    cy.loginAsUser();
    cy.stubDataEndpoints();
    cy.visit("/?chapter=1-1");
  });

  it("renders all seven tabs", () => {
    const tabs = [
      "Overview",
      "Course Content",
      "Core Concepts",
      "Key Terms",
      "Quick Reference",
      "Resources",
      "Practice Questions",
    ];
    tabs.forEach((tab) => cy.contains("button", tab).should("be.visible"));
  });

  it("Overview tab is active by default", () => {
    cy.contains("button", "Overview").should("have.class", "text-amber-400");
    cy.contains("Chapter Overview").should("be.visible");
  });

  it("switches to Core Concepts tab", () => {
    cy.contains("button", "Core Concepts").click();
    cy.url().should("include", "tab=concepts");
    cy.contains("Core Concepts").first().should("be.visible");
  });

  it("switches to Key Terms tab", () => {
    cy.contains("button", "Key Terms").click();
    cy.url().should("include", "tab=terms");
    cy.contains("Key Terms").first().should("be.visible");
  });

  it("switches to Practice Questions tab", () => {
    cy.contains("button", "Practice Questions").click();
    cy.url().should("include", "tab=questions");
    cy.contains("Practice Questions").first().should("be.visible");
  });

  it("switches to Quick Reference tab", () => {
    cy.contains("button", "Quick Reference").click();
    cy.url().should("include", "tab=reference");
    cy.contains("Quick Reference").first().should("be.visible");
  });
});

describe("Profile button", () => {
  beforeEach(() => {
    cy.loginAsUser();
    cy.stubDataEndpoints();
    cy.visit("/");
  });

  it("shows the profile button", () => {
    cy.get('a[href="/profile"]').should("be.visible");
  });

  it("profile button links to the profile page", () => {
    cy.get('a[href="/profile"]').click();
    cy.url().should("include", "/profile");
  });
});
