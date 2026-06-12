@AGENTS.md

When fixing bugs: edit the broken logic in place. Never delete a function,
component, or file as a method of fixing a bug. Refactoring and optimization
are fine — deletion as a bugfix is not.

# Hard Rules
- When fixing a bug: edit the broken logic in place. Never delete a function,
  component, or file as a method of fixing a bug.
- Never rewrite a working function to add a new feature — insert or append
- If a fix requires structural changes, explain why before touching anything
- Never rename exports without updating all imports
- Never change function signatures without checking all call sites

# Code Style
- TypeScript strict mode always on
- No `any` types — use `unknown` and narrow
- Prefer named exports over default exports
- Error handling: always explicit, never swallow errors silently

# Workflow
- Before implementing anything with 3+ steps: write a plan, wait for approval
- Run typecheck after any series of changes
- Run only the relevant single test, not the full suite
- After a bug fix: write a one-line comment explaining what was wrong and why
- Every new major feature requires a corresponding Playwright test that must
  pass before the feature is considered complete — no exceptions

# Testing
- Every major feature must have a Playwright test written alongside it
- The Playwright test must be passing before the feature is marked done
- Do not mark a feature complete or suggest committing if its Playwright
  test is failing or missing
- Run the relevant Playwright test after implementing any major feature:
  `npx playwright test <test-file>`
- Playwright tests live in /tests or alongside the feature — do not scatter them

# Scope Boundaries
- Do not modify files outside the task scope
- Do not install new packages without asking first
- Do not change .env files or config without explicit instruction

# Git & PR Workflow

## Branching Rules
- NEVER commit or push without explicit user instruction
- NEVER open, create, or push a PR without explicit user instruction
- If it has been 8+ hours since the last session: ask "Are we continuing on
  [current-branch] or starting a new branch?" before doing anything
- If starting a new branch: pull latest main first, then create and switch
  to the new branch
- NEVER stash changes under any circumstances
- If the user asks to create a new branch and there are uncommitted changes:
  stop, summarize what the changed files are and what the changes do,
  then ask "Do you want to commit them first or discard them?"
  Wait for explicit instruction before proceeding

## Commit Discipline
- Never auto-commit between tasks or "to save progress"
- Never chain commits + push + PR open in one autonomous sequence
- One PR per feature/fix — do not create multiple PRs to fix a previous PR
- Always run `npm run build` before any push — do not push if the build fails

## PR Description Format
When the user asks to open a PR, use this format:

---
## Summary
[1-2 sentence plain-English description of what this PR does and why]

## Changes
- [Bullet list of specific changes made]

## Testing
- Playwright test: [test file name and status — must be passing]
- [Any other testing done]

## Notes
[Any gotchas, follow-ups, or decisions made during implementation]

