import { GoalSummary } from "../../lib/goals/types";

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "";

async function apiFetch(path: string, init?: RequestInit) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${path} failed: ${res.status}`);
  return res.json();
}

export async function getGoalSummaries(): Promise<GoalSummary[]> {
  const d = await apiFetch("/api/goals/summary");
  return d.goals ?? [];
}

export async function createGoal(payload: {
  name: string;
  icon: string;
  target_amount: number;
  target_date: string;
  plaid_account_id: string;
  plaid_item_id: string;
}): Promise<void> {
  await apiFetch("/api/goals/create", { method: "POST", body: JSON.stringify(payload) });
}

export async function syncGoal(goalId: string): Promise<void> {
  await apiFetch("/api/goals/sync", { method: "POST", body: JSON.stringify({ goal_id: goalId }) });
}

export async function updateGoal(goalId: string, patch: Partial<{
  name: string;
  target_amount: number;
  target_date: string;
  status: "active" | "achieved" | "paused";
}>): Promise<void> {
  await apiFetch("/api/goals/update", { method: "PATCH", body: JSON.stringify({ goal_id: goalId, ...patch }) });
}

export async function deleteGoal(goalId: string): Promise<void> {
  await apiFetch("/api/goals/delete", { method: "DELETE", body: JSON.stringify({ goal_id: goalId }) });
}
