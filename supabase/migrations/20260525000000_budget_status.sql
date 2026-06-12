alter table budgets
  add column if not exists status text not null default 'active'
  check (status in ('active', 'paused'));
