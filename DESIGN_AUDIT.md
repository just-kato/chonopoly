# Park Properties — Frontend Design Audit

Read-only audit of how the frontend is actually built, with real values from the
codebase. No assumptions. Every claim cites the file and snippet.

---

## 1. Token System

**Source:** `app/globals.css` lines 85–133

```css
:root {
  /* Backgrounds */
  --color-base:           #0A0A0F;
  --color-surface:        #111118;
  --color-elevated:       #1A1A24;
  --color-overlay:        #22222F;

  /* Borders */
  --color-border-subtle:  rgba(255,255,255,0.05);
  --color-border-default: rgba(255,255,255,0.08);
  --color-border-strong:  rgba(255,255,255,0.14);

  /* Text */
  --color-text-primary:   #F4F4F6;
  --color-text-secondary: #8888A0;
  --color-text-tertiary:  #55556A;
  --color-text-disabled:  #33334A;

  /* Accent + status */
  --color-accent:         #00D4AA;
  --color-accent-glow:    rgba(0,212,170,0.15);
  --color-success:        #22C55E;
  --color-warning:        #F59E0B;
  --color-danger:         #EF4444;
  --color-info:           #3B82F6;

  /* Spacing scale */
  --space-1: 4px;  --space-2: 8px;   --space-3: 12px; --space-4: 16px;
  --space-5: 20px; --space-6: 24px;  --space-8: 32px; --space-10: 40px;
  --space-12: 48px; --space-16: 64px; --space-20: 80px;

  /* Border radius */
  --radius-sm:   6px;
  --radius-md:   10px;
  --radius-lg:   14px;
  --radius-xl:   20px;
  --radius-pill: 9999px;

  /* Shadows */
  --shadow-sm:   0 1px 3px rgba(0,0,0,0.4);
  --shadow-md:   0 4px 16px rgba(0,0,0,0.5);
  --shadow-lg:   0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04);
  --shadow-glow: 0 0 20px var(--color-accent-glow);

  /* Font aliases — resolved from Next.js variables injected in layout.tsx */
  --font-display: var(--font-syne);
  --font-body:    var(--font-dm-sans);
  --font-mono:    var(--font-jetbrains-mono);
}
```

**Font applied globally:**
```css
/* app/globals.css line 136 */
html, body {
  font-family: var(--font-body), system-ui, sans-serif;
}
```

**Legacy root block** (leftover, not used by UI components):
```css
/* app/globals.css lines 2–5 */
:root {
  --background: #0f0f11;
  --foreground: #e8e6df;
}
```

---

## 2. Typography

**Font loading:** `app/layout.tsx` — six faces via `next/font/google`

| CSS variable           | Face              | Weights      | Active role      |
|------------------------|-------------------|--------------|------------------|
| `--font-syne`          | Syne              | 600, 700     | `--font-display` |
| `--font-dm-sans`       | DM Sans           | 300–600      | `--font-body`    |
| `--font-jetbrains-mono`| JetBrains Mono    | 400, 500     | `--font-mono`    |
| `--font-playfair`      | Playfair Display  | 700, 900     | `font-serif` (Tailwind) |
| `--font-ibm-plex-sans` | IBM Plex Sans     | 300–600      | `font-sans` (Tailwind) |
| `--font-ibm-plex-mono` | IBM Plex Mono     | 400, 500     | `font-mono` (Tailwind) |

Playfair, IBM Plex Sans, and IBM Plex Mono are loaded and bound to Tailwind's
`font-serif`, `font-sans`, `font-mono` utility classes but are **not** the active
body or display face — they are available as opt-ins.

**Tailwind config binding** (`tailwind.config.ts` lines 10–14):
```ts
theme: {
  extend: {
    fontFamily: {
      sans:  ["'IBM Plex Sans'", "system-ui"],
      serif: ["'Playfair Display'", "Georgia"],
      mono:  ["'IBM Plex Mono'", "monospace"],
    },
  },
},
```

**Type scale in use** (inferred from component classes — no scale token defined):

| Use              | Size class      | Weight    | Example location                     |
|------------------|-----------------|-----------|--------------------------------------|
| Card section label | `text-[9px]`  | —         | ProfilePanel, ManagePanel section headers |
| Caption / badge  | `text-[10px]`  | —         | GoalImportModal badge, milestone pct  |
| Label / caption  | `text-[11px]`  | —         | ProfilePanel account rows            |
| Body / UI        | `text-[13px]`  | medium/semibold | ManagePanel, GoalImportModal rows |
| Section heading  | `text-[14px]`  | semibold  | GoalImportModal header               |
| Content heading  | `text-[20px]`  | semibold  | ManagePanel section title            |
| Hero number (Profile) | `text-[28px]` | bold (`font-[var(--font-display)]`) | net worth card |
| Health score     | `text-[52px]`  | bold      | financial health card                |

No `font-size` or `line-height` tokens exist in `:root`. All sizes are arbitrary
Tailwind values (`text-[Npx]`).

---

## 3. Color

**Mode:** dark only. All `--color-*` tokens are single values; no light-mode
`@media (prefers-color-scheme: light)` block exists.

**The one hardcoded raw hex in component code** (not a token):
```ts
// components/goals/FullScreenGoalWizard.tsx line 10
const COLORS = ['#00D4AA','#60a5fa','#a78bfa','#fb923c','#f472b6','#facc15','#34d399','#f87171'];
```
These are chart series colors; `#00D4AA` matches `--color-accent` but the rest are
raw Tailwind palette hexes not bound to tokens.

**Status colors used inline** (not via token):
```ts
// components/budget/ProfilePanel.tsx lines 173–174 (scoreBarColor helper)
if (pct >= 0.7) return "var(--color-success)";
if (pct >= 0.4) return "#f59e0b";   // hardcoded amber — same value as --color-warning
return "var(--color-danger)";
```

**Accent-glow** is defined in tokens but its only consumer is `--shadow-glow`, which
is defined but grep reveals no component currently applies `shadow-(--shadow-glow)`.

---

## 4. Tailwind Config

**File:** `tailwind.config.ts`

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans:  ["'IBM Plex Sans'", "system-ui"],
        serif: ["'Playfair Display'", "Georgia"],
        mono:  ["'IBM Plex Mono'", "monospace"],
      },
    },
  },
};

export default config;
```

**No custom color palette, no custom spacing, no custom radius, no custom screens
are defined.** All design decisions live in `globals.css` CSS custom properties and
are consumed via Tailwind's arbitrary-value syntax or `var()` inline styles.

**Build:** `@tailwindcss/postcss` v4 (devDependency). Import in `globals.css`:
```css
@import "tailwindcss";
```

---

## 5. Component Patterns

### 5a. Card

**Pattern:** `bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-sm)]`

From `components/budget/ProfilePanel.tsx` lines 542–543:
```tsx
<div className="bg-[var(--color-surface)] border border-[var(--color-border-default)] rounded-[var(--radius-lg)] p-4 shadow-[var(--shadow-sm)] cursor-pointer ...">
```

### 5b. Modal

**Pattern:** backdrop `fixed inset-0 bg-black/50`, panel `bg-(--color-elevated) border border-(--color-border-default) rounded-2xl shadow-2xl max-w-lg w-full flex flex-col`

From `components/teams/GoalImportModal.tsx` lines 100–101:
```tsx
<div className="fixed inset-0 flex items-center justify-center z-60 bg-black/50 px-4">
  <div className="bg-(--color-elevated) border border-(--color-border-default) rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh]">
```

### 5c. Full-screen wizard (split-panel)

**Pattern:** `fixed inset-0 grid grid-cols-1 md:grid-cols-2` with `style={{ zIndex: 70 }}`
- Left panel: form steps
- Right panel: `hidden md:flex` — illustration only, never shown on mobile

**Source:** `components/teams/TeamSetupWizard.tsx` (per rebuild in prior session)
**Reference:** `components/goals/FullScreenGoalWizard.tsx` (same structural pattern)

Body scroll lock in wizard mounts:
```ts
useEffect(() => {
  document.body.style.overflow = "hidden";
  return () => { document.body.style.overflow = ""; };
}, []);
```

### 5d. Stat card

**Component:** `components/budget/StatCard.tsx`  
**Used in:** GoalsPanel, OverviewPanel

Pattern: icon + big number + label, same structure as the design reference doc's
"paired stat cards."

### 5e. Section label

**Pattern:** `text-[9px] uppercase tracking-[0.1em] text-(--color-text-tertiary) mb-N`
or `tracking-widest` (Tailwind alias for same).

Seen in ProfilePanel, ManagePanel sidebar, GoalImportModal.

### 5f. Inline confirmation

Inline yes/no confirm (no modal) used in ProfilePanel for bank removal:
```tsx
{removeConfirm === group.itemId ? (
  <div className="flex items-center gap-2">
    <span className="text-[11px] text-(--color-text-tertiary)">Remove?</span>
    <button onClick={() => removeBank(group.itemId)} className="text-[11px] text-red-400 ...">Yes</button>
    <button onClick={() => setRemoveConfirm(null)} className="text-[11px] ...">No</button>
  </div>
) : ...}
```
`ConfirmDialog` is a named abstraction in `TeamSettingsPanel.tsx` but is not a
shared component file — it's defined inline.

### 5g. Skeleton loader

CSS class only:
```css
/* app/globals.css lines 146–156 */
.skeleton {
  background: linear-gradient(
    90deg, var(--color-elevated) 25%, var(--color-overlay) 50%, var(--color-elevated) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s ease-in-out infinite;
  border-radius: var(--radius-sm);
}
```
Applied as `<div className="h-11 skeleton rounded-xl" />`.

---

## 6. Layout & Breakpoints

### Shell (`components/BudgetClient.tsx`)

Route: `/finances` (`app/finances/page.tsx`)

**Desktop (≥ 1024px `lg`):**
- Fixed left sidebar: `h-screen w-[220px]` (approximate) with nav items
- Main content: `flex-1 overflow-y-auto`

**Mobile (< 1024px):**
- Bottom tab bar: 5 items — Overview, Manage, Transactions, Analytics, Profile
- Top bar: app name + context badge

```ts
// BudgetClient.tsx lines 2000–2005
const navItems = [
  { id: "overview"     as ViewState, icon: <LayoutDashboard size={16} />, label: "Overview" },
  { id: "manage"       as ViewState, icon: <LayoutGrid size={16} />,      label: "Manage" },
  { id: "transactions" as ViewState, icon: <Search size={16} />,          label: "Transactions" },
  { id: "analytics"    as ViewState, icon: <PieChart size={16} />,        label: "Analytics" },
  { id: "profile"      as ViewState, icon: <User size={16} />,            label: "Profile" },
];
```

Valid `ViewState` values: `"overview" | "manage" | "budgets" | "goals" | "debts" | "bills" | "transactions" | "analytics" | "profile"` plus account-specific string IDs.

### ManagePanel (`components/budget/ManagePanel.tsx`)

Mobile: `lg:hidden` horizontal-scroll pill strip of sections (Budgets / Bills / Goals / Debts / Assets)
Desktop: `hidden lg:flex` sidebar at `w-45` (180px)
Content: `flex-col lg:flex-row overflow-hidden lg:h-[calc(100vh-56px)]`

### ProfilePanel bento grid (`components/budget/ProfilePanel.tsx`)

```tsx
// line 709–718
<div
  className="grid-cols-1 md:grid-cols-2 lg:grid-cols-3 profile-bento-grid"
  style={{ display: "grid", gridAutoRows: "auto", gap: "12px", padding: "20px" }}
>
```

```css
/* app/globals.css lines 378–382 */
@media (max-width: 1023px) {
  .profile-bento-grid > * {
    grid-column: 1 / -1 !important;
  }
}
```

Card column spans (desktop 3-col grid):
- `net-worth`: col 1 / 2 (1 col)
- `financial-health`: col 2 / 4 (2 col)
- `banks`: col 1 / 2 (1 col)
- `dreams`: col 2 / 4 (2 col)

All collapse to full-width on mobile via the media query override.

### Analytics grid

```css
/* app/globals.css lines 386–404 */
@media (max-width: 1023px) {
  .analytics-bento-grid > * { grid-column: 1 / -1 !important; }
}
@media (max-width: 1023px) {
  .analytics-chart-row { grid-template-columns: 1fr !important; grid-template-rows: auto !important; }
}
@media (max-width: 1023px) {
  .analytics-readiness-narrative { grid-template-columns: 1fr !important; }
}
```

**Breakpoint summary:**

| Where used             | Breakpoint | Method                          |
|------------------------|------------|---------------------------------|
| Desktop sidebar show   | `lg` / 1024px | Tailwind `lg:flex`, `lg:hidden` |
| Mobile bottom nav      | `< lg`     | Tailwind `lg:hidden`            |
| Bento grid collapse    | `≤ 1023px` | CSS media query + `!important`  |
| Wizard right panel     | `md` / 768px | Tailwind `hidden md:flex`     |

---

## 7. Charts / Data Viz

**Library:** `recharts` v3.8.1

**Components in use:**

| File | Chart types imported |
|------|----------------------|
| `components/budget/ActivityChart.tsx` | `AreaChart`, `Area`, `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `ResponsiveContainer` |
| `components/budget/SpendingChart.tsx` | `PieChart`, `Pie`, `Cell`, `BarChart`, `Bar`, `XAxis`, `YAxis`, `Tooltip`, `ResponsiveContainer` |
| `components/budget/TrendCharts.tsx` | `BarChart`, `Bar`, `AreaChart`, `Area`, `XAxis`, `ReferenceLine`, `ResponsiveContainer` |
| `components/GoalsPanel.tsx` | `LineChart`, `Line`, `XAxis`, `YAxis`, `Tooltip`, `ResponsiveContainer` |

**ActivityChart** renders spending over day / week / month / year tabs. Uses
`AreaChart` with two `Area` series (current period + previous period comparison).

**Chart color strategy:**
- Accent line: hardcoded `#00D4AA` (matches `--color-accent` but is not a token reference)
- Viz palette in FullScreenGoalWizard: `['#00D4AA','#60a5fa','#a78bfa','#fb923c','#f472b6','#facc15','#34d399','#f87171']`
- `var(--color-accent)` is used for some series; raw hex for others — no single source of truth for chart colors

**ResponsiveContainer** is used uniformly; no fixed pixel dimensions on chart wrappers.

---

## 8. Animations

All keyframes defined in `app/globals.css`.

### Wizard step transitions (lines 50–81)

| Class                  | Keyframe              | Duration | Easing        |
|------------------------|-----------------------|----------|---------------|
| `.wizard-exit-forward` | translate X → -60px, fade | 220ms | ease-in  |
| `.wizard-exit-back`    | translate X → +60px, fade | 220ms | ease-in  |
| `.wizard-enter-forward`| +60px → 0, fade in    | 220ms    | ease-out      |
| `.wizard-enter-back`   | -60px → 0, fade in    | 220ms    | ease-out      |
| `.wizard-slide-up`     | Y 100% → 0, fade in   | 280ms    | cubic-bezier(0.16,1,0.3,1) |
| `.wizard-pop-in`       | scale 0.95 → 1, fade  | 180ms    | cubic-bezier(0.16,1,0.3,1) |

### Skeleton loader

`.skeleton` — `shimmer` keyframe, `1.5s ease-in-out infinite`

### Onboarding

| Class           | Keyframe         | Used for                 |
|-----------------|------------------|--------------------------|
| `.nudge-appear` | `slide-down` 200ms | nudge prompt appearing |
| `.pulse-dot`    | `pulse-dot` 2s   | sidebar pulsing dot      |
| `.border-pulse` | `border-pulse` 2.2s | onboarding card ring  |
| `.ob-fade-slide-up` / `.ob-fade-slide-right` | `fadeSlideUp`, `fadeSlideRight` | onboarding step 1 reveals |
| `prefers-reduced-motion` override | disables `.ob-fade-slide-up`, `.ob-fade-slide-right` | |

### Budget / charts

| Class               | Keyframe       | Used for                       |
|---------------------|----------------|--------------------------------|
| `.progress-bar-animate` | `grow-bar` 700ms | budget progress bar mount |
| `.dash-draw`        | `dash-draw` 1.2s | DebtWizard SVG stroke draw   |
| `.debt-type-pulse`  | 2.5s loop      | DebtWizard type selection      |
| `.rock-scale`       | `rockScale` 3s | DebtWizard illustration        |

### Other

`countUp`, `fadeIn`, `scaleIn`, `slideInLeft`, `sweepUnderline`, `debtCardSlideUp`,
`assetIconDrop`, `goalRingFill`, `flow-dot` — all defined, used by wizard illustration
components.

---

## 9. Token Usage Consistency

**Two syntaxes coexist and are both valid in Tailwind v4, but components are
inconsistently split between them:**

| Syntax | Example | Used in |
|--------|---------|---------|
| CSS var shorthand `-(--token)` | `bg-(--color-accent)` | ManagePanel, GoalImportModal, BudgetClient (newer code) |
| Bracket arbitrary `[var(--token)]` | `bg-[var(--color-accent)]` | ProfilePanel (pervasive), older components |

**ProfilePanel is the largest consumer of the bracket form** (`[var(--...)]` appears ~50+ times).
Newer components (GoalImportModal, TeamSettingsPanel, ManagePanel) uniformly use
the shorthand `-(--...)`.

**Inline `style={{ ... }}` with `var()`** is a third pattern used for values
that Tailwind can't express or for dynamic computation:
```tsx
// ProfilePanel line 666
style={{ width: `${Math.min(100, ...)}%`, background: "var(--color-accent)" }}

// GoalImportModal line 175
style={{ background: "var(--color-accent)", color: "var(--color-base)" }}
```

**No linting rule enforces one form.** Both compile correctly; the inconsistency
is cosmetic but will matter when adding the mobile token layer.

---

## 10. Design Docs on Disk

**`docs/` root:**
- `docs/plans/` — 60+ plan files; each maps to a feature/session (e.g. `ANALYTICS_REDESIGN_PLAN.md`, `DESIGN_SYSTEM_PLAN.md`, `MANAGE_PANEL_PLAN.md`)
- `docs/reports/` — ~35 report/audit files (e.g. `ARCHITECTURE.md`, `ANALYTICS_REDESIGN.md`, `ONBOARDING_DESIGN_SYSTEM.md`)
- `docs/prompts/` — raw prompt files; includes the design doc under review:
  - `docs/prompts/park-properties-design-approach.md` — the mobile design proposal (status: direction for review)

**Relevant existing design system docs:**
- `docs/plans/DESIGN_SYSTEM_PLAN.md` — a prior design-system migration plan
- `docs/reports/ONBOARDING_DESIGN_SYSTEM.md` — onboarding-specific design system notes
- `docs/prompts/goal-wizard-design-system.md` — goal wizard DS notes

None of these files have been read for this audit; they exist and may contain
prior decisions relevant to any token migration.

**`docs/plaid-transaction-system.md`** — Plaid integration architecture doc
(also at docs root, separate from plans/reports/prompts).

---

## Summary: Key Facts for the Mobile Design Proposal

1. **The app is dark-mode only.** All tokens are dark values. A new mobile token
   layer targeting `--surface: #F3F5F2` etc. would need either a `@media` scope or
   a `.mobile` class scope to avoid overriding the desktop dark theme.

2. **The accent is `#00D4AA`** (teal-green). The proposal replaces this with
   `--equity: #1B6B4C` (evergreen) for mobile. These are mutually exclusive styles.

3. **Fonts active today:** Syne (display), DM Sans (body), JetBrains Mono (mono).
   The proposal adds Hanken Grotesk — a seventh font or a replacement.

4. **No font-size tokens exist.** The proposal's size scale (32–36px hero, 13px body,
   12–13px labels) would be new conventions, not backed by existing tokens.

5. **ProfilePanel is the first implementation target** and is also the most
   inconsistent file in token notation (`[var(--)]` bracket form throughout).
   Any refactor of ProfilePanel should normalize notation as a side effect.

6. **The bento grid already has a mobile collapse** via `.profile-bento-grid`
   media query. The mobile profile layout in the proposal requires overriding or
   replacing this grid with a single-column stack — the existing mechanism does
   that, but the card content inside each tile needs redesign.

7. **Recharts is the chart library.** The proposal's monthly cash-flow bar chart
   maps to existing `BarChart` from recharts — no new library needed.

8. **DnD kit** (`@dnd-kit/core`, `@dnd-kit/sortable`) is used for ProfilePanel
   card reordering. If the mobile layout locks card order, the drag handles can
   be hidden (`lg:block hidden`) without removing the DnD logic.
