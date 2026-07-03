// Unit tests for team feature utility functions.
// API routes use Supabase + Next.js APIs that require integration test setup;
// these tests cover the pure logic and email service layer.

jest.mock("resend", () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: {
      send: jest.fn().mockResolvedValue({ id: "mock-email-id" }),
    },
  })),
}));

import { sendExistingUserInviteEmail, sendNewUserInviteEmail } from "@/lib/teams/inviteEmailService";
import { Resend } from "resend";

const MockResend = Resend as jest.MockedClass<typeof Resend>;

// ─── inviteEmailService ───────────────────────────────────────────────────────

describe("inviteEmailService", () => {
  let sendMock: jest.Mock;

  beforeEach(() => {
    MockResend.mockClear();
    sendMock = jest.fn().mockResolvedValue({ id: "mock-id" });
    MockResend.mockImplementation(() => ({
      emails: { send: sendMock },
    }) as unknown as InstanceType<typeof Resend>);
  });

  const BASE_OPTS = {
    to: "invitee@example.com",
    teamName: "Park Properties",
    inviterEmail: "owner@example.com",
    role: "team_member",
    acceptUrl: "https://app.example.com/invite/abc123",
    expiresAt: new Date("2026-07-01T00:00:00Z"),
  };

  describe("sendExistingUserInviteEmail", () => {
    test("calls resend.emails.send with correct recipient", () => {
      sendExistingUserInviteEmail(BASE_OPTS);
      expect(sendMock).toHaveBeenCalledTimes(1);
      const call = sendMock.mock.calls[0][0] as Record<string, unknown>;
      expect(call.to).toBe("invitee@example.com");
    });

    test("subject contains team name", () => {
      sendExistingUserInviteEmail(BASE_OPTS);
      const call = sendMock.mock.calls[0][0] as Record<string, unknown>;
      expect(String(call.subject)).toContain("Park Properties");
    });

    test("html contains accept URL", () => {
      sendExistingUserInviteEmail(BASE_OPTS);
      const call = sendMock.mock.calls[0][0] as Record<string, unknown>;
      expect(String(call.html)).toContain("https://app.example.com/invite/abc123");
    });

    test("html contains inviter email", () => {
      sendExistingUserInviteEmail(BASE_OPTS);
      const call = sendMock.mock.calls[0][0] as Record<string, unknown>;
      expect(String(call.html)).toContain("owner@example.com");
    });

    test.each([
      ["org_owner", "Owner"],
      ["org_admin", "Admin"],
      ["team_manager", "Manager"],
      ["team_member", "Member"],
      ["viewer", "Viewer"],
    ])("role %s is displayed as %s", (role, label) => {
      sendExistingUserInviteEmail({ ...BASE_OPTS, role });
      const call = sendMock.mock.calls[0][0] as Record<string, unknown>;
      expect(String(call.html)).toContain(label);
    });

    test("unknown role falls back to raw value", () => {
      sendExistingUserInviteEmail({ ...BASE_OPTS, role: "custom_role" });
      const call = sendMock.mock.calls[0][0] as Record<string, unknown>;
      expect(String(call.html)).toContain("custom_role");
    });
  });

  describe("sendNewUserInviteEmail", () => {
    test("calls resend.emails.send once", () => {
      sendNewUserInviteEmail(BASE_OPTS);
      expect(sendMock).toHaveBeenCalledTimes(1);
    });

    test("html contains account creation guidance", () => {
      sendNewUserInviteEmail(BASE_OPTS);
      const call = sendMock.mock.calls[0][0] as Record<string, unknown>;
      expect(String(call.html)).toMatch(/create an account/i);
    });

    test("html contains accept URL", () => {
      sendNewUserInviteEmail(BASE_OPTS);
      const call = sendMock.mock.calls[0][0] as Record<string, unknown>;
      expect(String(call.html)).toContain("https://app.example.com/invite/abc123");
    });

    test("CTA button text differs from existing-user email", () => {
      sendExistingUserInviteEmail(BASE_OPTS);
      const existingHtml = String((sendMock.mock.calls[0][0] as Record<string, unknown>).html);

      sendMock.mockClear();
      sendNewUserInviteEmail(BASE_OPTS);
      const newUserHtml = String((sendMock.mock.calls[0][0] as Record<string, unknown>).html);

      expect(newUserHtml).not.toBe(existingHtml);
    });
  });
});

// ─── Token uniqueness ─────────────────────────────────────────────────────────

describe("invite token generation", () => {
  test("crypto.randomBytes produces unique tokens on repeated calls", () => {
    const { randomBytes } = require("crypto") as typeof import("crypto");
    const tokens = Array.from({ length: 10 }, () => randomBytes(32).toString("hex"));
    const unique = new Set(tokens);
    expect(unique.size).toBe(10);
  });

  test("token is 64 hex characters (32 bytes)", () => {
    const { randomBytes } = require("crypto") as typeof import("crypto");
    const token = randomBytes(32).toString("hex");
    expect(token).toHaveLength(64);
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });
});

// ─── resolveContext ───────────────────────────────────────────────────────────

jest.mock("@supabase/supabase-js", () => ({
  createClient: jest.fn(),
}));

import { resolveContext } from "@/lib/context";
import { createClient } from "@supabase/supabase-js";

const mockCreateClient = createClient as jest.Mock;

describe("resolveContext", () => {
  const USER_ID = "user-abc-123";
  const TEAM_ID = "team-xyz-456";

  beforeEach(() => {
    mockCreateClient.mockClear();
  });

  test("returns personal context for personal type", async () => {
    mockCreateClient.mockReturnValue({ from: jest.fn() });
    const ctx = await resolveContext("personal", USER_ID, USER_ID);
    expect(ctx).toEqual({ type: "personal", id: USER_ID });
  });

  test("returns personal context when type is null (default)", async () => {
    mockCreateClient.mockReturnValue({ from: jest.fn() });
    const ctx = await resolveContext(null, null, USER_ID);
    expect(ctx).toEqual({ type: "personal", id: USER_ID });
  });

  test("always uses userId as personal context id regardless of passed id", async () => {
    mockCreateClient.mockReturnValue({ from: jest.fn() });
    const ctx = await resolveContext("personal", "some-other-id", USER_ID);
    expect(ctx?.id).toBe(USER_ID);
  });

  test("returns team context when user is a member", async () => {
    const maybeSingleMock = jest.fn().mockResolvedValue({ data: { team_id: TEAM_ID }, error: null });
    const eqMock2 = jest.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const eqMock1 = jest.fn().mockReturnValue({ eq: eqMock2 });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock1 });
    const fromMock = jest.fn().mockReturnValue({ select: selectMock });
    mockCreateClient.mockReturnValue({ from: fromMock });

    const ctx = await resolveContext("team", TEAM_ID, USER_ID);
    expect(ctx).toEqual({ type: "team", id: TEAM_ID });
  });

  test("returns null when user is NOT a team member", async () => {
    const maybeSingleMock = jest.fn().mockResolvedValue({ data: null, error: null });
    const eqMock2 = jest.fn().mockReturnValue({ maybeSingle: maybeSingleMock });
    const eqMock1 = jest.fn().mockReturnValue({ eq: eqMock2 });
    const selectMock = jest.fn().mockReturnValue({ eq: eqMock1 });
    const fromMock = jest.fn().mockReturnValue({ select: selectMock });
    mockCreateClient.mockReturnValue({ from: fromMock });

    const ctx = await resolveContext("team", TEAM_ID, USER_ID);
    expect(ctx).toBeNull();
  });

  test("returns null when team rawId is missing", async () => {
    mockCreateClient.mockReturnValue({ from: jest.fn() });
    const ctx = await resolveContext("team", null, USER_ID);
    expect(ctx).toBeNull();
  });

  test("returns null on Supabase error (graceful fallback)", async () => {
    const fromMock = jest.fn().mockImplementation(() => { throw new Error("DB down"); });
    mockCreateClient.mockReturnValue({ from: fromMock });

    const ctx = await resolveContext("team", TEAM_ID, USER_ID);
    expect(ctx).toBeNull();
  });
});
