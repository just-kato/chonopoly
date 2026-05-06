// Tests the login page UI — no Supabase credentials required.
// The forgot-password and reset-link flows are tested at the UI level only.

describe("Login page", () => {
  beforeEach(() => {
    cy.visit("/login");
  });

  it("renders the login form", () => {
    cy.contains("Sign in to continue").should("be.visible");
    cy.get('input[name="email"]').should("be.visible");
    cy.get('input[name="password"]').should("be.visible");
    cy.get('button[type="submit"]').should("contain.text", "Sign in");
  });

  it("password field starts hidden", () => {
    cy.get('input[name="password"]').should("have.attr", "type", "password");
  });

  it("toggles password visibility", () => {
    cy.get('input[name="password"]').should("have.attr", "type", "password");
    cy.get('button[aria-label="Show password"]').click();
    cy.get('input[name="password"]').should("have.attr", "type", "text");
    cy.get('button[aria-label="Hide password"]').click();
    cy.get('input[name="password"]').should("have.attr", "type", "password");
  });

  it("shows an error on invalid credentials", () => {
    cy.get('input[name="email"]').type("nobody@example.com");
    cy.get('input[name="password"]').type("wrongpassword");
    cy.get('button[type="submit"]').click();
    cy.contains(/invalid|credentials|password/i, { timeout: 8000 }).should("be.visible");
  });

  it("switches to forgot-password mode", () => {
    cy.contains("button", "Forgot password?").click();
    cy.contains("Reset your password").should("be.visible");
    cy.contains("We'll send you a reset link").should("be.visible");
    cy.get('button[type="submit"]').should("contain.text", "Send reset link");
    cy.get('input[name="password"]').should("not.exist");
  });

  it("forgot-password form has an email field", () => {
    cy.contains("button", "Forgot password?").click();
    cy.get('input[name="email"][type="email"]').should("be.visible");
  });

  it("returns to login from forgot-password mode", () => {
    cy.contains("button", "Forgot password?").click();
    cy.contains("button", "← Back to sign in").click();
    cy.contains("Sign in to continue").should("be.visible");
    cy.get('input[name="password"]').should("be.visible");
  });
});

describe("Reset password page", () => {
  it("shows an error when no code param is present", () => {
    cy.visit("/reset-password");
    cy.contains(/invalid|expired|reset link/i, { timeout: 8000 }).should("be.visible");
  });
});
