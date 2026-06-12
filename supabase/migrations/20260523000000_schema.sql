-- ─── plaid_items ──────────────────────────────────────────────────────────────
-- Stores Plaid access tokens per user (one row per connected bank)

create table if not exists plaid_items (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  access_token     text not null,
  item_id          text not null,
  institution_name text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (user_id, item_id)
);

alter table plaid_items enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'plaid_items' and policyname = 'plaid_items_owner_select') then
    create policy "plaid_items_owner_select" on plaid_items for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'plaid_items' and policyname = 'plaid_items_owner_insert') then
    create policy "plaid_items_owner_insert" on plaid_items for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'plaid_items' and policyname = 'plaid_items_owner_delete') then
    create policy "plaid_items_owner_delete" on plaid_items for delete using (auth.uid() = user_id);
  end if;
end $$;

-- ─── profiles extension ────────────────────────────────────────────────────────
-- pay_cycle_start_day: day of month the pay cycle begins (1–28, default 1)

alter table profiles add column if not exists pay_cycle_start_day integer not null default 1;

-- ─── budgets ───────────────────────────────────────────────────────────────────
-- One row per user per category. category_id stores a CATEGORY_META key (e.g. "FOOD_AND_DRINK").

create table if not exists budgets (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  category_id      text not null,
  monthly_limit    numeric(12,2) not null check (monthly_limit > 0),
  rollover_enabled boolean not null default false,
  created_at       timestamptz not null default now(),
  unique (user_id, category_id)
);

alter table budgets enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'budgets' and policyname = 'budgets_owner') then
    create policy "budgets_owner" on budgets using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

-- ─── budget_periods ────────────────────────────────────────────────────────────
-- One row per budget per pay-cycle period.
-- effective_limit may exceed monthly_limit when rollover carries unspent balance.

create table if not exists budget_periods (
  id              uuid primary key default gen_random_uuid(),
  budget_id       uuid not null references budgets(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  period          text not null,
  effective_limit numeric(12,2) not null,
  amount_spent    numeric(12,2) not null default 0,
  notified_80     boolean not null default false,
  notified_over   boolean not null default false,
  created_at      timestamptz not null default now(),
  unique (budget_id, period)
);

alter table budget_periods enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename = 'budget_periods' and policyname = 'budget_periods_owner') then
    create policy "budget_periods_owner" on budget_periods using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

-- ─── Fix existing budgets table if category_id was created as uuid ─────────────
-- Drop any foreign key on category_id before changing type

do $$ declare
  r record;
begin
  for r in
    select conname from pg_constraint
    where conrelid = 'budgets'::regclass and contype = 'f'
    and conkey @> array[(select attnum from pg_attribute where attrelid = 'budgets'::regclass and attname = 'category_id')]
  loop
    execute 'alter table budgets drop constraint ' || quote_ident(r.conname);
  end loop;
end $$;

alter table budgets alter column category_id type text using category_id::text;
