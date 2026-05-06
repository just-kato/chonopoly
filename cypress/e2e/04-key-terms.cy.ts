// Tests key terms expand/collapse, concept cards, and flashcard navigation.
// Requires TEST_EMAIL and TEST_PASSWORD.

before(function () {
  if (!Cypress.env("TEST_EMAIL") || !Cypress.env("TEST_PASSWORD")) {
    this.skip();
  }
});

describe("Key Terms", () => {
  beforeEach(() => {
    cy.loginAsUser();
    cy.stubDataEndpoints();
    cy.visit("/?chapter=1-1&tab=terms");
  });

  it("renders the key terms list", () => {
    cy.contains("Key Terms").first().should("be.visible");
    cy.contains("Flashcard Self-Test").should("be.visible");
    // chapter 1-1 has key terms in amber font
    cy.get(".font-mono.text-amber-400").should("have.length.greaterThan", 0);
  });

  it("terms start collapsed", () => {
    cy.contains("definition").should("not.exist");
  });

  it("clicking a term expands its definition", () => {
    cy.get(".font-mono.text-amber-400").first().closest("button").click();
    cy.get(".text-\\[\\#c8c5bc\\]").should("be.visible");
  });

  it("clicking an expanded term collapses it", () => {
    const $btn = cy.get(".font-mono.text-amber-400").first().closest("button");
    $btn.click();
    cy.get(".text-\\[\\#c8c5bc\\]").should("be.visible");
    $btn.click();
    cy.get(".text-\\[\\#c8c5bc\\]").should("not.exist");
  });

  it("only one term is expanded at a time", () => {
    cy.get(".font-mono.text-amber-400").eq(0).closest("button").click();
    cy.get(".font-mono.text-amber-400").eq(1).closest("button").click();
    // after opening the second, first should be closed
    cy.get("div[class*='border-t']").filter(":visible").should("have.length", 1);
  });
});

describe("Flashcard", () => {
  beforeEach(() => {
    cy.loginAsUser();
    cy.stubDataEndpoints();
    cy.visit("/?chapter=1-1&tab=terms");
  });

  it("renders the flashcard", () => {
    cy.contains("Flashcard Self-Test").should("be.visible");
    cy.contains("TERM 1 OF").should("be.visible");
    cy.contains("tap to flip").should("be.visible");
  });

  it("shows the term on the front face", () => {
    cy.get("p.font-serif.text-2xl").should("be.visible");
  });

  it("flips to show the definition on click", () => {
    cy.get("p.font-serif.text-2xl").invoke("text").as("termText");
    cy.contains("TERM 1 OF").closest("div[class*='rounded-xl']").click();
    cy.contains("Tap to see term").should("be.visible");
    cy.get("p.font-serif.text-2xl").should("not.exist");
  });

  it("flips back to the term on second click", () => {
    cy.contains("TERM 1 OF").closest("div[class*='rounded-xl']").click();
    cy.contains("TERM 1 OF").closest("div[class*='rounded-xl']").click();
    cy.get("p.font-serif.text-2xl").should("be.visible");
    cy.contains("tap to flip").should("be.visible");
  });

  it("Next button advances to the next card", () => {
    cy.contains("TERM 1 OF").should("be.visible");
    cy.contains("button", "Next →").click();
    cy.contains("TERM 2 OF").should("be.visible");
  });

  it("Prev button wraps to the last card from the first", () => {
    cy.contains("TERM 1 OF").should("be.visible");
    cy.contains("button", "← Prev").click();
    // wraps to the last term
    cy.contains(/TERM \d+ OF/).invoke("text").should("match", /TERM \d+ OF \d+/);
    cy.contains("TERM 1 OF").should("not.exist");
  });

  it("navigating to next resets the flip state", () => {
    cy.contains("TERM 1 OF").closest("div[class*='rounded-xl']").click();
    cy.contains("Tap to see term").should("be.visible");
    cy.contains("button", "Next →").click();
    cy.contains("tap to flip").should("be.visible");
  });
});

describe("Concept Cards", () => {
  beforeEach(() => {
    cy.loginAsUser();
    cy.stubDataEndpoints();
    cy.visit("/?chapter=1-1&tab=concepts");
  });

  it("renders concept cards", () => {
    cy.contains("Core Concepts").first().should("be.visible");
    cy.get("div[class*='rounded-xl']").should("have.length.greaterThan", 0);
  });

  it("concept body is hidden by default", () => {
    cy.get("div.concept-body").should("not.exist");
  });

  it("clicking a concept card expands it", () => {
    cy.get("button[class*='w-full flex items-center gap-4']").first().click();
    cy.get("div.concept-body").should("be.visible");
  });

  it("clicking an open concept card closes it", () => {
    const card = cy.get("button[class*='w-full flex items-center gap-4']").first();
    card.click();
    cy.get("div.concept-body").should("be.visible");
    card.click();
    cy.get("div.concept-body").should("not.exist");
  });
});
