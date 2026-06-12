export interface LinkedAccount {
  id: string;
  plaid_account_id: string;
  plaid_item_id: string;
  account_name: string;
  institution_name: string | null;
  account_subtype: string | null;
  cached_balance: number | null;
  account_role: "savings" | "spending";
}

export interface GoalAccountsGrouped {
  savings: LinkedAccount | null;
  spending: LinkedAccount[];
}

export interface ActiveContext {
  type: "personal" | "team";
  id: string;
}

export interface PlaidAccountInfo {
  plaid_account_id: string;
  plaid_item_id: string;
  account_name: string;
  institution_name: string | null;
  account_subtype: string | null;
  current_balance: number;
}

export interface GoalSummary {
  id: string;
  name: string;
  icon: string;
  goal_type: string;
  target_amount: number | null;
  target_date: string | null;
  created_at: string;
  current_balance: number;
  percent_complete: number;
  projected_completion_date: string | null;
  on_track: boolean;
  weekly_avg_growth: number;
  expected_balance: number;
  behind_by: number;
  status: "active" | "achieved" | "paused";
  last_synced_at: string | null;
}
