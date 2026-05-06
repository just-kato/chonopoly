// Tests the practice quiz: answering, submitting, scoring, and retaking.
// Chapter 1-1 has 8 questions. Requires TEST_EMAIL and TEST_PASSWORD.

before(function () {
  if (!Cypress.env("TEST_EMAIL") || !Cypress.env("TEST_PASSWORD")) {
    this.skip();
  }
});

describe("Quiz", () => {
  beforeEach(() => {
    cy.loginAsUser();
    cy.stubDataEndpoints();
    cy.visit("/?chapter=1-1&tab=questions");
  });

  it("renders question list", () => {
    cy.contains("QUESTION 1 OF").should("be.visible");
    cy.get("button").contains(/^A$/).should("be.visible");
  });

  it("submit button is disabled until all questions are answered", () => {
    cy.contains("button", /Submit Answers|Answer all questions/).should("be.disabled");
  });

  it("shows answered count while answering", () => {
    // Answer the first question
    cy.contains("QUESTION 1 OF").closest("div").within(() => {
      cy.get("button").first().click();
    });
    cy.contains(/1 \/ \d+/).should("be.visible");
  });

  it("enables submit after answering all questions", () => {
    // Answer every question by picking the first option
    cy.get("div").filter((_, el) =>
      !!(el.textContent?.includes("QUESTION") && el.textContent?.includes(" OF "))
    ).each(($block) => {
      cy.wrap($block).within(() => {
        cy.get("button").first().click();
      });
    });
    cy.contains("button", "Submit Answers").should("not.be.disabled");
  });

  it("shows results after submitting", () => {
    // Answer all and submit
    cy.get("div").filter((_, el) =>
      !!(el.textContent?.includes("QUESTION") && el.textContent?.includes(" OF "))
    ).each(($block) => {
      cy.wrap($block).within(() => {
        cy.get("button").first().click();
      });
    });
    cy.contains("button", "Submit Answers").click();
    cy.contains(/Passed|Failed/).should("be.visible");
    cy.contains(/\d+\/\d+/).should("be.visible");
    cy.contains(/% correct/).should("be.visible");
  });

  it("shows CORRECT / INCORRECT labels after submitting", () => {
    cy.get("div").filter((_, el) =>
      !!(el.textContent?.includes("QUESTION") && el.textContent?.includes(" OF "))
    ).each(($block) => {
      cy.wrap($block).within(() => {
        cy.get("button").first().click();
      });
    });
    cy.contains("button", "Submit Answers").click();
    cy.contains(/CORRECT|INCORRECT/).should("be.visible");
  });

  it("shows explanation after submitting", () => {
    cy.get("div").filter((_, el) =>
      !!(el.textContent?.includes("QUESTION") && el.textContent?.includes(" OF "))
    ).each(($block) => {
      cy.wrap($block).within(() => {
        cy.get("button").first().click();
      });
    });
    cy.contains("button", "Submit Answers").click();
    cy.contains("Explanation:").should("be.visible");
  });

  it("retake button resets the quiz", () => {
    cy.get("div").filter((_, el) =>
      !!(el.textContent?.includes("QUESTION") && el.textContent?.includes(" OF "))
    ).each(($block) => {
      cy.wrap($block).within(() => {
        cy.get("button").first().click();
      });
    });
    cy.contains("button", "Submit Answers").click();
    cy.contains("button", /Retake|Try Again/).click();
    cy.contains("button", /Submit Answers|Answer all questions/).should("be.disabled");
    cy.contains(/CORRECT|INCORRECT/).should("not.exist");
  });
});
