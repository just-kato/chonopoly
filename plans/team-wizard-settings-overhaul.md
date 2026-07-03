# Plan: Team Wizard & Settings Overhaul

## Audit summary — what already exists vs what needs building

### API routes — EXISTS (do not rebuild)
- `POST /api/teams` ✓
- `GET /PATCH /DELETE /api/teams/[id]` ✓
- `GET /api/teams/mine` ✓
- `GET /api/teams/[id]/members` ✓
- `PATCH /DELETE /api/teams/[id]/members/[userId]` ✓ (self-removal already handled — leave team uses this)
- `POST /api/teams/[id]/invite` ✓
- `GET /POST /api/teams/[id]/accounts` ✓
- `DELETE /api/teams/[id]/accounts/[plaidItemId]` ✓
- `GET /api/teams/invite/[token]` ✓
- `POST /api/teams/invite/[token]/accept` ✓
- `POST /api/teams/invite/[token]/decline` ✓
- `GET /api/plaid/items` ✓ (just added)

### API routes — MISSING (must build)
- `GET /api/teams/[id]/invites` — list pending invites
- `DELETE /api/teams/[id]/invites/[inviteId]` — cancel invite
- `POST /api/teams/[id]/transfer-ownership` — body: `{ new_owner_id }`
- `POST /api/teams/[id]/goals/import` — body: `{ personal_goal_id }`

### Note on leave team
TeamSettingsPanel currently calls `/api/teams/[id]/leave` which doesn't exist.
Fix: call `DELETE /api/teams/[id]/members/[userId]` with the current user's own ID — the existing handler already covers self-removal and last-owner guard.

---

## Phase 1 — Wizard Rebuild (`components/teams/TeamSetupWizard.tsx`)

Full rewrite. Same split-panel layout as `FullScreenGoalWizard`:
```
fixed inset-0 grid grid-cols-1 md:grid-cols-2 z-[70]
```
Left: `flex flex-col justify-between px-10 py-10 bg-(--color-base) overflow-y-auto`  
Right: `hidden md:flex flex-col items-center justify-center h-full bg-(--color-elevated)`

Progress dots (same dot pattern as FullScreenGoalWizard — 5 dots).  
`anim` state: `'wizard-enter-forward' | 'wizard-enter-back'` — CSS classes already defined globally.

### Step 1 — Name your team
- Headline: "What's your team called?"
- Subhead: "A household, a business, any group working toward shared financial goals."
- Input: team name (required), placeholder "Team name"
- CTA: "Next →" (disabled until name.trim() !== "")
- On Next: `POST /api/teams` → store `team.id` and `team.name` in wizard state
- Right panel: static illustration — building icon + team name preview text

### Step 2 — Invite members
- Headline: "Who's on this team?"
- Subhead: "Invite by email. They'll get a link to join. Add more anytime in settings."
- Inline form: email input + role select (Member / Manager) + Add button
- Pending list: each row shows email + role badge + ✕ to remove
- Empty state: "No invites added yet"
- Skip: "Skip — invite later" link below nav
- CTA: "Next →" (always enabled — skip is separate)
- On Next: fire `POST /api/teams/[id]/invite` per row (parallel Promise.all, catch per-item)
- Right panel: illustration — envelope with avatars

### Step 3 — Import goals
- Headline: "Share your goals with the team?"
- Subhead: "A team copy will be created. Your personal goals stay untouched."
- On mount (step === 3): fetch `GET /api/goals?context_type=personal&context_id=[userId]`
- List: checkbox per goal, icon + name + target amount, default unchecked
- "Select all" toggle at top
- Info note: "💡 Goals you share will appear in both personal and team accounts"
- Empty state: "No personal goals to import"
- Skip: "Skip — set up goals later"
- On Next: fire `POST /api/teams/[id]/goals/import` per checked goal (parallel)
- Right panel: illustration — goal icons overlapping / shared

### Step 4 — Share bank accounts
- Headline: "Connect team finances"
- Subhead: "Share an existing account or connect a new joint account."
- On mount (step === 4): fetch `GET /api/plaid/items` (uses DB, not live Plaid)
- List: toggle per institution (institution_name), item_id as value
- "Connect new joint account" button → Plaid Link (optional, can be v2)
- Skip: "Skip — add accounts later"
- On Next: fire `POST /api/teams/[id]/accounts` per selected item_id
- Right panel: illustration — bank/building icon with share arrows

### Step 5 — Done
- Headline: "{teamName} is ready"
- Summary counts: "X members invited · Y goals shared · Z accounts connected"
- Primary CTA: "Go to {teamName} →" → calls `onComplete(team)` (switches context)
- Secondary: "Stay in personal for now" → calls `onClose()`
- No back button on step 5
- Right panel: celebration illustration — checkmark / confetti

### Wizard state shape
```ts
step: 1 | 2 | 3 | 4 | 5
anim: 'wizard-enter-forward' | 'wizard-enter-back'
teamName: string
teamId: string | null          // set after step 1 POST
invites: { email: string; role: string }[]
inviteEmail: string            // transient form field
inviteRole: string
personalGoals: { id, name, icon, target_amount }[]
selectedGoalIds: Set<string>
plaidItems: { item_id, institution_name }[]
selectedItemIds: Set<string>
loading: boolean
error: string | null
// counts for step 5 summary
invitesSent: number
goalsImported: number
accountsShared: number
```

---

## Phase 2 — New API Routes

### `GET /api/teams/[id]/invites/route.ts`
- Auth: must be team member (any role)
- Query: `team_invites` where `team_id = id AND accepted IS NULL AND expires_at > now()`
- Return: `{ invites: [{ id, email, role, created_at, invited_by }] }`

### `DELETE /api/teams/[id]/invites/[inviteId]/route.ts`
- Auth: org_owner or org_admin (check team_members)
- Delete from `team_invites` where `id = inviteId AND team_id = id AND accepted IS NULL`
- Return: `{ ok: true }` or 404 if not found / already accepted

### `POST /api/teams/[id]/transfer-ownership/route.ts`
- Auth: caller must be `org_owner` of this team
- Body: `{ new_owner_id: string }`
- Guard: `new_owner_id` must be a current member of this team
- Guard: `new_owner_id !== caller.id`
- Ops (both via service role, transaction-like):
  1. UPDATE `team_members` SET role = 'team_manager' WHERE team_id = id AND user_id = caller.id
  2. UPDATE `team_members` SET role = 'org_owner' WHERE team_id = id AND user_id = new_owner_id
- Return: `{ ok: true }`

### `POST /api/teams/[id]/goals/import/route.ts`
- Auth: must be team member
- Body: `{ personal_goal_id: string }`
- Fetch personal goal: `savings_goals` where `id = personal_goal_id AND owner_id = caller.id AND owner_type = 'personal'`
- Guard: if not found → 404
- Guard: if already imported → check `imported_from_goal_id = personal_goal_id AND owner_id = teamId` → return 409 "Already imported"
- Insert new row into `savings_goals` copying: name, icon, target_amount, target_date, goal_type
  - `owner_type = 'team'`, `owner_id = teamId`, `imported_from_goal_id = personal_goal_id`
  - `status = 'active'`, `current_balance = 0`
- Return: `{ goal: { id, name } }`

---

## Phase 3 — TeamSettingsPanel Rebuild (`components/teams/TeamSettingsPanel.tsx`)

Full rewrite. Props: `{ teamId: string; userId: string; onBack: () => void }`

Fetches on mount:
1. `GET /api/teams/[id]` → team info + members
2. `GET /api/teams/[id]/invites` → pending invites
3. `GET /api/teams/[id]/accounts` → shared accounts

Local state tracks caller's role (from members list, match on userId).

### Section 1 — Team Info
- Team name: inline edit — click pencil icon → input → save (PATCH on blur/Enter) / cancel (Escape)
- "Created by [email] · [date]"

### Section 2 — Members
- Each row: avatar initials + name/email + role dropdown + "Remove" button
- Role dropdown: options depend on caller's role
  - org_owner: can set any role
  - org_admin: can set team_member / team_manager only
  - Others: read-only display
- Own row: role shown as badge (cannot change own role), no Remove button
- Remove button → confirm dialog: "Remove [name] from [team]?" Cancel / Remove (red)
  - On confirm: `DELETE /api/teams/[id]/members/[userId]`
- "Invite new member" button (bottom of section) → expands inline form: email + role + Send invite
  - On send: `POST /api/teams/[id]/invite`

### Section 3 — Pending Invites
- Fetched from `GET /api/teams/[id]/invites`
- Each row: email + role badge + "Sent [date]" + "Cancel" button
- Cancel → confirm dialog: "Cancel invite to [email]?" Cancel / Cancel Invite (red)
  - On confirm: `DELETE /api/teams/[id]/invites/[inviteId]`
- Empty state: "No pending invites"

### Section 4 — Shared Accounts
- List from `GET /api/teams/[id]/accounts`
- Each row: institution name + "Remove" button
- Remove → confirm dialog: "Remove [institution] from team?" Cancel / Remove (red)
  - On confirm: `DELETE /api/teams/[id]/accounts/[plaidItemId]`
- "Share an account" button → inline picker:
  - Fetches `GET /api/plaid/items`, filters out already-shared ones
  - Checkbox list → "Add selected"
  - On add: `POST /api/teams/[id]/accounts` per item

### Section 5 — Import Goals
- "Import goals from personal" button → opens `GoalImportModal` (Phase 4)
- After modal closes with imports: refresh goals (optional)

### Section 6 — Danger Zone
Three separate sub-sections with red borders/labels.

**Transfer Ownership** (org_owner only, hidden otherwise):
- Button: "Transfer Ownership"
- Step 1 modal: list of members (excluding self), radio select → "Continue →"
- Step 2 modal: "Transfer ownership to [name]? You will become a Manager. This cannot be undone." Cancel / "Transfer" (red)
- On confirm: `POST /api/teams/[id]/transfer-ownership` with `{ new_owner_id }`
- On success: re-fetch team, caller's role updates to team_manager

**Leave Team**:
- If caller is org_owner: button disabled, tooltip "Transfer ownership before leaving"
- If not owner: button "Leave Team" → confirm dialog "Leave [team name]? You'll lose access to team data." Cancel / "Leave" (red)
  - On confirm: `DELETE /api/teams/[id]/members/[userId]` with caller's own userId
  - On success: `onBack()` + trigger teams list refresh in BudgetClient

**Delete Team** (org_owner only, hidden otherwise):
- Button: "Delete Team"
- Modal: "This will permanently delete [team name] and all its data."
- Text input: placeholder "Type team name to confirm"
- Delete button disabled until input === teamName exactly
- On confirm: `DELETE /api/teams/[id]`
- On success: `onBack()` + remove team from BudgetClient teams list + reset context to personal

### Confirmation dialog pattern
Shared `ConfirmDialog` inline component (local to file, not extracted):
```tsx
// props: message, confirmLabel, onCancel, onConfirm, loading
// red confirm button, cancel is ghost
```

---

## Phase 4 — Goal Import Modal (`components/teams/GoalImportModal.tsx`)

New component. Props: `{ teamId: string; userId: string; onClose: () => void; onImported: (count: number) => void }`

Layout: `fixed inset-0 flex items-center justify-center z-[60] bg-black/50`  
Panel: `max-w-lg w-full mx-4 bg-(--color-elevated) rounded-2xl`

- Header: "Import goals from personal" + ✕ button
- On mount: fetch `GET /api/goals?context_type=personal&context_id=[userId]`
- Also fetch `GET /api/goals?context_type=team&context_id=[teamId]` to find already-imported goals (check `imported_from_goal_id`)
- Each goal row: checkbox + icon + name + target amount formatted
  - Already-imported (imported_from_goal_id match): disabled checkbox + "Already in team" badge
  - Not yet imported: enabled checkbox (default unchecked)
- "Select all" toggle
- Empty state: "No personal goals to import"
- Footer: "Cancel" (ghost) + "Import [N] selected" (accent, disabled if N=0, loading state)
- On import: `POST /api/teams/[id]/goals/import` per checked ID (sequential to avoid race)
- On success: calls `onImported(count)` then `onClose()`

**Trigger points:**
1. `TeamSettingsPanel` — Section 5 "Import Goals" button
2. `GoalsPanel` — empty state when `activeContext.type === 'team'`: add "Import from personal" button

---

## Phase 5 — Context Indicator

### 5.1 — Add variables to BudgetClient.tsx

After the existing `contextLabel` computation (currently around line 1857), add:
```ts
const activeTeamName = activeContext.type === 'team'
  ? (teams.find(t => t.id === activeContext.id)?.name ?? 'Team')
  : null;
const contextOwner = activeTeamName ?? 'Your';
const contextOwnerLower = activeTeamName?.toLowerCase() ?? 'your';
```

### 5.2 — Mobile top bar team badge

In the mobile top bar (around line 2244), below the "Park Properties" wordmark span, add:
```tsx
{activeContext.type === 'team' && activeTeamName && (
  <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-(--color-accent)/15 text-(--color-accent) border border-(--color-accent)/30">
    {activeTeamName}
  </span>
)}
```
The top bar will need a small structural adjustment to stack the wordmark and badge vertically — change the left side from a flat `<span>` to a `<div className="flex flex-col gap-0.5">`.

### 5.3 — Desktop sidebar active team highlight

In the teams list render (around line 2103), the active team button currently has no visual differentiation. Change the className on the active team's `<button>` to add:
- `bg-(--color-accent)/5` background
- `border-l-2 border-(--color-accent)` left accent border

### 5.4 — Dynamic language audit

Audit scope is limited to panels that are shown in team context. Do not touch personal-only panels.

Files and approximate locations to update:
- `components/budget/GoalsPanel.tsx` — header "Your Goals" → `{contextOwner} Goals`, empty state "your goals" text
- `components/budget/BillsPanel.tsx` — header/empty state "your bills"
- `components/budget/OverviewPanel.tsx` — "Your spending", "your accounts"
- `components/budget/ManagePanel.tsx` — "your accounts" in empty state

Pass `contextOwner` and `contextOwnerLower` as props to each panel. Audit exact strings during implementation, not in this plan.

---

## Phase 6 — Migration SQL

One new migration file: `supabase/migrations/20260615000003_goals_import.sql`

```sql
ALTER TABLE savings_goals
  ADD COLUMN IF NOT EXISTS imported_from_goal_id uuid
    REFERENCES savings_goals(id) ON DELETE SET NULL;
```

Run via `supabase db push` before implementing Phase 2 goal import route.

---

## Implementation order

1. Phase 6 — migration (run first, unblocks goal import)
2. Phase 2 — 4 new API routes
3. Phase 1 — Wizard rebuild
4. Phase 3 — TeamSettingsPanel rebuild
5. Phase 4 — GoalImportModal
6. Phase 5 — Context indicator + dynamic language

---

## Files touched

| File | Action |
|------|--------|
| `supabase/migrations/20260615000003_goals_import.sql` | NEW |
| `app/api/teams/[id]/invites/route.ts` | NEW |
| `app/api/teams/[id]/invites/[inviteId]/route.ts` | NEW |
| `app/api/teams/[id]/transfer-ownership/route.ts` | NEW |
| `app/api/teams/[id]/goals/import/route.ts` | NEW |
| `components/teams/TeamSetupWizard.tsx` | REBUILD |
| `components/teams/TeamSettingsPanel.tsx` | REBUILD |
| `components/teams/GoalImportModal.tsx` | NEW |
| `components/BudgetClient.tsx` | EDIT — add variables, mobile badge, sidebar highlight, panel props |
| `components/budget/GoalsPanel.tsx` | EDIT — accept contextOwner prop, update strings |
| `components/budget/BillsPanel.tsx` | EDIT — accept contextOwner prop, update strings |
| `components/budget/OverviewPanel.tsx` | EDIT — accept contextOwner prop, update strings |
| `components/budget/ManagePanel.tsx` | EDIT — accept contextOwner prop, update strings |

Files NOT touched: all personal context logic, Plaid connection flow, existing plaid_items RLS, existing goal/budget/debt/asset/bill API routes for personal context.
