# Plan: Team Context Feature

## Already Done — Do NOT Re-implement

- `lib/context.ts` — `resolveContext()` handles `personal` and `team`. For team, queries `team_members` to verify membership. **Complete.**
- `teams` and `team_members` tables — exist in DB, created in `supabase/migrations/20260527000000_step1_new_tables.sql`. RLS in place.
- `organizations` and `permissions` tables — exist in DB from same migration. `get_my_team_ids()` and `is_org_admin_or_owner()` SECURITY DEFINER helpers are deployed.
- `invitations` table — **exists in DB** from `20260527000000_step1_new_tables.sql` (not a new table; the task doc's name `team_invites` is a renaming — use the existing `invitations` table).
- `/api/teams/mine` (GET) — complete at `app/api/teams/mine/route.ts`.
- Context switcher UI in `BudgetClient.tsx` (~L2082–2133) — Personal + team list, active checkmarks, `switchContext`, `resetToPersonal`. **Desktop only** (mobile TODO at L2081).
- All existing personal context API routes (`goals`, `budgets`, `debts`, `assets`, `net-worth`) already call `resolveContext()`. **Do not touch.**
- Bills — personal only; `bills` table has no `context_type`/`context_id` columns. Out of scope for team context.

---

## Phase 1 — Database

### 1.1 — `team_shared_accounts` table (new)

**File:** `supabase/migrations/20260615000000_team_shared_accounts.sql` (new file)

Purpose: records which Plaid items (bank connections) an owner has shared with a team. The owner's `plaid_item_id` from the `plaid_items` table is the reference. This does NOT modify `plaid_items` or its RLS.

```sql
CREATE TABLE team_shared_accounts (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id        uuid        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  plaid_item_id  text        NOT NULL,
  owner_user_id  uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, plaid_item_id)
);

CREATE INDEX ON team_shared_accounts(team_id);
CREATE INDEX ON team_shared_accounts(owner_user_id);

ALTER TABLE team_shared_accounts ENABLE ROW LEVEL SECURITY;

-- Team members can read shared accounts for their teams
CREATE POLICY "team_shared_accounts: team member can read"
  ON team_shared_accounts FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM get_my_team_ids() WHERE team_id = team_shared_accounts.team_id)
  );

-- Only the plaid item owner can share it (org admin/owner also allowed)
CREATE POLICY "team_shared_accounts: owner or org admin can insert"
  ON team_shared_accounts FOR INSERT
  WITH CHECK (
    owner_user_id = auth.uid()
    OR is_org_admin_or_owner(
      (SELECT org_id FROM teams WHERE id = team_id)
    )
  );

-- Owner or org admin can remove shared account
CREATE POLICY "team_shared_accounts: owner or org admin can delete"
  ON team_shared_accounts FOR DELETE
  USING (
    owner_user_id = auth.uid()
    OR is_org_admin_or_owner(
      (SELECT org_id FROM teams WHERE id = team_id)
    )
  );
```

### 1.2 — `invitations` table — no new migration needed

The `invitations` table already exists with all required columns (`token`, `email`, `role`, `team_id`, `org_id`, `accepted`, `expires_at`). The UPDATE policy (mark `accepted = true`) is intentionally service-role only per the existing migration comment — the accept route must use the service role client.

**Conflict check:** No conflicts with personal context. `invitations` is org/team-scoped and has no overlap with personal user data tables.

---

## Phase 2 — API Routes

All new files live under `app/api/teams/`. Use `createClient` from `@/lib/supabase/server` for auth; use `createServiceClient` directly for operations that must bypass RLS (e.g., accepting an invite, inserting the first `team_members` row for a new team).

Role hierarchy from `team_members.role`: `org_owner` > `org_admin` > `team_manager` > `team_member`.

### 2.1 — Team CRUD

**`app/api/teams/route.ts`** (new file)
- `POST` — Create a new organization + team + initial `team_members` row (role: `org_owner`) atomically. Caller is the auth user. Use service role for the insert (org owner bootstrapping). Body: `{ name: string }`. Returns `{ team: { id, name } }`.
  - Conflict check: creates new org and team rows; no effect on personal context.

**`app/api/teams/[id]/route.ts`** (new file)
- `GET` — Return team details + member list. Requires caller to be a member (`get_my_team_ids()`).
- `PATCH` — Update team `name`. Requires `org_owner` or `org_admin` role.
- `DELETE` — Delete team (cascades to `team_members`, `team_shared_accounts`). Requires `org_owner` role. **Does not delete the org** (org deletion is out of scope).

### 2.2 — Member management

**`app/api/teams/[id]/members/route.ts`** (new file)
- `GET` — Return all `team_members` rows for the team with joined profile data (username, email from `auth.users`). Requires caller to be a member.

**`app/api/teams/[id]/members/[userId]/route.ts`** (new file)
- `PATCH` — Update `role`. Requires `org_owner` or `org_admin`. Cannot demote the last `org_owner`.
- `DELETE` — Remove a member. Requires `org_owner`/`org_admin`, OR self-removal (leave team). Cannot remove the last `org_owner`.

### 2.3 — Invite routes

Token generation: `import { randomBytes } from "crypto"; const token = randomBytes(32).toString("hex");`

**`app/api/teams/[id]/invite/route.ts`** (new file)
- `POST` — Create an invitation. Body: `{ email: string, role: "team_member" | "team_manager" | "org_admin" }`.
  - Requires `org_owner`, `org_admin`, or `team_manager` (team_manager can only invite `team_member`).
  - Generates `token`, sets `expires_at = now() + 7 days`.
  - Inserts into `invitations` table (uses service role to bypass RLS UPDATE-only restriction).
  - Triggers Resend email (see Phase 5). Returns `{ ok: true }`.

**`app/api/teams/invite/[token]/route.ts`** (new file)
- `GET` — Look up invitation by token (service role). Returns `{ team_name, inviter_email, role, email, expires_at, accepted }` for pre-flight display. Returns 404 if not found, 410 if expired or already accepted.

**`app/api/teams/invite/[token]/accept/route.ts`** (new file)
- `POST` — Accept invite. Auth required.
  - Validate token not expired and not yet accepted.
  - If `email` on invite is set: verify caller's email matches (case-insensitive). If no email on invite: any authenticated user may accept (link-based invite).
  - Use service role to: insert `team_members` row, set `invitations.accepted = true`.
  - Returns `{ team_id, team_name }` so the UI can switch context.

**`app/api/teams/invite/[token]/decline/route.ts`** (new file)
- `POST` — Mark invite declined. Auth required. Sets `accepted = false` + soft-deletes by setting `expires_at = now()` (or a dedicated `declined_at` column — use `expires_at = now()` to keep the schema minimal). Returns `{ ok: true }`.

### 2.4 — Shared accounts routes

**`app/api/teams/[id]/accounts/route.ts`** (new file)
- `GET` — Return all `team_shared_accounts` for the team, joined with `institution_name` and account list from the owner's `plaid_items` (service role needed to read other users' plaid_items). Requires caller to be a team member.
- `POST` — Share a Plaid item with the team. Body: `{ plaid_item_id: string }`. Caller must own the `plaid_items` row (verified against `user_id`). Inserts into `team_shared_accounts`.

**`app/api/teams/[id]/accounts/[plaidItemId]/route.ts`** (new file)
- `DELETE` — Remove a shared account. Caller must be the `owner_user_id` or `org_owner`/`org_admin`.

**Conflict check:** These routes read other users' `plaid_items` using service role. They do NOT modify `plaid_items` or existing Plaid connection logic. Personal RLS on `plaid_items` is untouched.

---

## Phase 3 — Context Extension

`lib/context.ts` is **complete**. No changes needed.

The remaining wiring is UI-only (Phase 4): after the Team Setup Wizard creates a team, call `setTeams(prev => [...prev, newTeam])` in `BudgetClient.tsx` (the `teams` state already exists at L1804) and call `switchContext({ type: "team", id: newTeam.id })`. No API wiring changes.

---

## Phase 4 — UI

### 4.1 — Team Setup Wizard

**`components/teams/TeamSetupWizard.tsx`** (new file)

Pattern: `fixed inset-0` fullscreen overlay, `style={{ zIndex: 60 }}` (above sidebar z-30, mobile nav z-40, below onboarding modal z-50 — use 60 so it sits above the sidebar but does not conflict). Use same dark split-panel layout as `FullScreenGoalWizard.tsx` (left panel: visual/summary, right panel: form steps).

Props:
```ts
interface TeamSetupWizardProps {
  onComplete: (team: { id: string; name: string }) => void;
  onClose: () => void;
}
```

5 steps:

| Step | Title | Content |
|------|-------|---------|
| 1 | Name your team | Text input for team name. Validates non-empty. |
| 2 | Invite members | Email input + role select (`team_member` / `team_manager`). "Add another" repeater. Can skip. |
| 3 | Share bank accounts | List the user's connected `plaid_items` (fetch `/api/plaid/accounts`). Checkbox each item to share. Can skip. |
| 4 | Review | Summary: team name, pending invites count, accounts to share. |
| 5 | Done | Confirmation screen. "Go to [team name]" button calls `onComplete`. |

Flow:
- Step 1 POST → `/api/teams` on "Next" (creates team immediately, gets `team.id`).
- Step 2 POST → `/api/teams/[id]/invite` per email entry (fire-and-forget; failures shown inline).
- Step 3 POST → `/api/teams/[id]/accounts` per checked item.
- Step 4 is read-only review (no API call).
- Step 5 calls `onComplete(team)`.

### 4.2 — Team Settings Panel

**`components/teams/TeamSettingsPanel.tsx`** (new file)

Rendered as a slide-over or as a sub-view inside `ProfilePanel`. Recommended: add a "Team settings" link in the context switcher section of the desktop sidebar (visible only when `activeContext.type === "team"`), which calls `navTo("team-settings")` and renders `TeamSettingsPanel` in the main content area the same way `ProfilePanel` is rendered at `view === "profile"`.

- ViewState: add `"team-settings"` to the union in `components/budget/types.ts`.
- In `BudgetClient.tsx`: add `{view === "team-settings" && activeContext.type === "team" && <TeamSettingsPanel teamId={activeContext.id} onBack={() => navTo("overview")} />}` alongside the other view renders (~L2392).

Props:
```ts
interface TeamSettingsPanelProps {
  teamId: string;
  onBack: () => void;
}
```

Sections:
- Team name (editable inline, PATCH `/api/teams/[id]`).
- Member list (GET `/api/teams/[id]/members`): shows each member's name, email, role, with role dropdown (PATCH `/api/teams/[id]/members/[userId]`) and remove button (DELETE) — gated to `org_owner`/`org_admin`.
- Invite new member: email + role form → POST `/api/teams/[id]/invite`.
- Shared accounts: list from GET `/api/teams/[id]/accounts`; add (POST) and remove (DELETE) buttons.
- Danger zone: "Leave team" (DELETE self from members) and "Delete team" (DELETE `/api/teams/[id]`, owner only).

### 4.3 — "+" Button Entry Point (Team Setup Wizard trigger)

**Modified file:** `components/BudgetClient.tsx`

In the context switcher section (~L2133, after the `<hr>`), add a small `+` button below the team list:

```tsx
{/* Add team button */}
<button
  onClick={() => setTeamWizardOpen(true)}
  className="flex items-center gap-[10px] h-9 text-[13px] text-(--color-text-tertiary) hover:text-(--color-text-primary) transition-colors w-full"
>
  <Plus size={16} className="shrink-0" />
  New team
</button>
```

Add state: `const [teamWizardOpen, setTeamWizardOpen] = useState(false);`

Render wizard:
```tsx
{teamWizardOpen && (
  <TeamSetupWizard
    onComplete={(team) => {
      setTeams(prev => [...prev, team]);
      switchContext({ type: "team", id: team.id });
      setTeamWizardOpen(false);
    }}
    onClose={() => setTeamWizardOpen(false)}
  />
)}
```

Import `Plus` from lucide-react (already imported at the top of the file — verify before adding).

### 4.4 — Mobile Context Switcher

**Modified file:** `components/BudgetClient.tsx`

The TODO comment at L2081 indicates the context switcher is desktop-sidebar-only. Resolution: expose context switching on mobile via the `profile` view, which is already accessible from the mobile bottom nav is NOT in navItems — but `ProfilePanel` is rendered at `view === "profile"`.

Two options; use Option A (lower risk):

**Option A — Add context section to `ProfilePanel` (mobile-friendly)**

Modified file: `components/budget/ProfilePanel.tsx`

- Add `teams`, `activeContext`, `switchContext`, `resetToPersonal`, `onAddTeam` to `ProfilePanelProps`.
- Render a "Context" section above the Identity card (or below it) showing Personal + team list, same visual pattern as the desktop sidebar section, with "New team" `+` button.
- On mobile, the user taps "Profile" in the bottom nav → sees the context switcher inline.
- This is additive — the desktop sidebar context switcher is unchanged.

**Option B — Mobile-only sheet** (higher effort, out of scope for this plan pass).

Use Option A. Update `ProfilePanel` call site in `BudgetClient.tsx` (~L2392) to pass the new props:
```tsx
<ProfilePanel
  activeContext={activeContext}
  teams={teams}
  switchContext={switchContext}
  resetToPersonal={resetToPersonal}
  onAddTeam={() => setTeamWizardOpen(true)}
  onNavigate={navTo}
/>
```

**Conflict check:** `ProfilePanel` currently receives only `activeContext` and `onNavigate`. Adding props is additive — no existing behavior changes.

### 4.5 — "Team settings" link in desktop sidebar

**Modified file:** `components/BudgetClient.tsx`

Below the context banner / `<hr>` in the context section, when `activeContext.type === "team"`, render:
```tsx
{activeContext.type === "team" && (
  <button
    onClick={() => navTo("team-settings")}
    className="flex items-center gap-[10px] h-8 text-[11px] text-(--color-text-tertiary) hover:text-(--color-text-primary) transition-colors w-full"
  >
    <Settings size={13} className="shrink-0" />
    Team settings
  </button>
)}
```

Import `Settings` from lucide-react.

---

## Phase 5 — Emails

### 5.1 — Resend setup status

Resend is already installed (`package.json`: `"resend": "^6.12.3"`). The `Resend` class is imported and used in:
- `lib/goals/notificationService.ts` — `sendBalanceDropEmail`, `sendGoalAchievedEmail`
- `lib/budget/notificationService.ts` — morning report
- `lib/bills/notificationService.ts`
- Edge functions use raw `fetch` to the Resend API (Deno-compatible)

`FROM` address: `process.env.RESEND_FROM_EMAIL ?? "noreply@parkhawkinsproperties.com"`
`RESEND_API_KEY` env var: already in use.

No new packages. No new env vars.

### 5.2 — New notification service file

**`lib/teams/inviteEmailService.ts`** (new file)

Follow the exact pattern from `lib/goals/notificationService.ts`.

```ts
import { Resend } from "resend";

const FROM = process.env.RESEND_FROM_EMAIL ?? "noreply@parkhawkinsproperties.com";
function resend() { return new Resend(process.env.RESEND_API_KEY); }
```

Export two functions:

**`sendExistingUserInviteEmail`**
- Sent when the invitee already has a Chonopoly account.
- Body: team name, inviter name/email, role, accept link (`${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`), expiry date.
- Subject: `"[Team name] invited you to join"`

**`sendNewUserInviteEmail`**
- Sent when the invitee does NOT have a Chonopoly account.
- Body: same as above, plus a note that they'll need to create an account before the link will work (the accept route redirects unauthenticated users to login, then continues).
- Subject: `"You've been invited to [Team name] on Chonopoly"`

### 5.3 — Checking if invitee has an account

In `/api/teams/[id]/invite/route.ts`, after inserting the invitation, use the service role client to check `auth.users` (via `supabase.auth.admin.listUsers()` or query `auth.users` directly) whether the email exists. Call the appropriate email function.

### 5.4 — Accept flow with unauthenticated users

The accept link `/invite/[token]` is a public page. If the user is not authenticated, redirect to `/login?redirect=/invite/[token]`. After login/signup, Supabase Auth redirects back and the accept page calls `POST /api/teams/invite/[token]/accept`.

**`app/invite/[token]/page.tsx`** (new file) — renders a minimal accept/decline card. Fetches token details from GET `/api/teams/invite/[token]` and shows team name + role. Two buttons: "Join team" → POST accept, "Decline" → POST decline.

---

## File Checklist

| File | Status | Notes |
|------|--------|-------|
| `supabase/migrations/20260615000000_team_shared_accounts.sql` | NEW | `team_shared_accounts` table + RLS |
| `app/api/teams/route.ts` | NEW | POST create team |
| `app/api/teams/[id]/route.ts` | NEW | GET / PATCH / DELETE team |
| `app/api/teams/[id]/members/route.ts` | NEW | GET members |
| `app/api/teams/[id]/members/[userId]/route.ts` | NEW | PATCH / DELETE member |
| `app/api/teams/[id]/invite/route.ts` | NEW | POST create invite |
| `app/api/teams/invite/[token]/route.ts` | NEW | GET token lookup |
| `app/api/teams/invite/[token]/accept/route.ts` | NEW | POST accept |
| `app/api/teams/invite/[token]/decline/route.ts` | NEW | POST decline |
| `app/api/teams/[id]/accounts/route.ts` | NEW | GET / POST shared accounts |
| `app/api/teams/[id]/accounts/[plaidItemId]/route.ts` | NEW | DELETE shared account |
| `lib/teams/inviteEmailService.ts` | NEW | Resend email functions |
| `components/teams/TeamSetupWizard.tsx` | NEW | 5-step wizard |
| `components/teams/TeamSettingsPanel.tsx` | NEW | Settings panel |
| `app/invite/[token]/page.tsx` | NEW | Public accept/decline page |
| `components/budget/types.ts` | MODIFIED | Add `"team-settings"` to `ViewState` |
| `components/budget/ProfilePanel.tsx` | MODIFIED | Add context switcher section (mobile fix) |
| `components/BudgetClient.tsx` | MODIFIED | Add `teamWizardOpen` state, wizard render, "New team" button, "Team settings" link, pass new props to `ProfilePanel` |

---

## Conflict Flags

- `plaid_items` RLS — team shared accounts route reads other users' plaid_items using service role. **Do not add new RLS policies to `plaid_items`.** The service role bypass is intentional and scoped to the shared accounts API only.
- `invitations` table — already exists with an RLS UPDATE restriction (no authenticated UPDATE policy). The accept route **must** use the service role client to flip `accepted = true`.
- `team_members` INSERT policy — requires `is_org_admin_or_owner`. The new team creation route must use service role to insert the first `org_owner` row (bootstrapping), same pattern as noted in the Step 1 migration comment.
- `BudgetClient.tsx` `navItems` array — do not add `"team-settings"` to `navItems` (it should not appear in the mobile bottom tab bar or the desktop nav list). It is a sub-view reached via the sidebar context section only.
- Bills — remain personal only. No `context_type`/`context_id` columns on `bills` table. Do not add them.

---

## Playwright Test

**`tests/15-teams.spec.ts`** (new file) — must pass before feature is marked done.

Minimum coverage:
- Create a team (wizard flow, step through all 5 steps).
- Context switches to the new team after wizard completes.
- "Team settings" link appears in sidebar when team context is active.
- Invite form submits successfully (mock email or verify API returns 200).
- Accept invite token (happy path: authenticated user).
- Shared account can be added and removed.
- Mobile: "Profile" view shows context switcher with Personal + team options.
