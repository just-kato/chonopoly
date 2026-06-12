alter table budgets
  add column if not exists period_type text not null default 'monthly'
  check (period_type in ('daily', 'weekly', 'monthly', 'quarterly', 'yearly'));
