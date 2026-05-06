// Tests the profile page: tabs, editing, course progress, and sign-out link.
// Requires TEST_EMAIL and TEST_PASSWORD.

before(function () {
  if (!Cypress.env("TEST_EMAIL") || !Cypress.env("TEST_PASSWORD")) {
    this.skip();
  }
});

describe("Profile page", () => {
  beforeEach(() => {
    cy.loginAsUser();
    cy.stubDataEndpoints();
    cy.visit("/profile");
  });

  it("renders the profile page", () => {
    cy.contains("Back to Study Guide").should("be.visible");
    cy.contains("button", "Profile").should("be.visible");
    cy.contains("button", "Courses").should("be.visible");
  });

  it("back link navigates to the study guide", () => {
    cy.contains("Back to Study Guide").click();
    cy.url().should("eq", `${Cypress.config("baseUrl")}/`);
  });

  it("Profile tab shows editable fields", () => {
    cy.contains("button", "Profile").click();
    cy.get("input[value]").should("have.length.greaterThan", 0);
    cy.contains("button", "Save changes").should("be.visible");
  });

  it("email field is disabled", () => {
    cy.contains("button", "Profile").click();
    cy.get("input:disabled").should("have.length.greaterThan", 0);
  });

  it("Courses tab shows course card with progress circle", () => {
    cy.contains("button", "Courses").click();
    cy.contains("Georgia Real Estate Exam Prep").should("be.visible");
    cy.contains("Continue where you left off").should("be.visible");
    cy.contains("chapters complete").should("be.visible");
  });

  it("Courses tab lists chapters", () => {
    cy.contains("button", "Courses").click();
    cy.contains("Chapter Breakdown").should("be.visible");
    cy.contains("1.1").should("be.visible");
    cy.contains("Kinds of Professional Activity").should("be.visible");
  });

  it("chapter link in Courses tab navigates to that chapter", () => {
    cy.contains("button", "Courses").click();
    cy.contains("Kinds of Professional Activity").click();
    cy.url().should("include", "chapter=1-1");
  });

  it("sign out link is visible", () => {
    cy.contains("button", "Profile").click();
    cy.contains(/sign out/i).should("be.visible");
  });
});
