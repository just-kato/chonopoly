-- savings_goals table
create table if not exists savings_goals (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete cascade not null,
  name             text not null,
  icon             text not null default '🎯',
  target_amount    numeric(12,2) not null,
  target_date      date not null,
  plaid_account_id text not null,
  plaid_item_id    text not null,
  current_balance  numeric(12,2) not null default 0,
  previous_balance numeric(12,2) not null default 0,
  last_synced_at   timestamptz,
  status           text not null default 'active'
                   check (status in ('active', 'achieved', 'paused')),
  notified_drop    boolean not null default false,
  created_at       timestamptz not null default now()
);

alter table savings_goals enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'savings_goals' and policyname = 'users manage own goals'
  ) then
    create policy "users manage own goals" on savings_goals
      for all using (auth.uid() = user_id);
  end if;
end $$;

-- savings_goal_history table (one row per sync, used for projected completion math)
create table if not exists savings_goal_history (
  id          uuid primary key default gen_random_uuid(),
  goal_id     uuid references savings_goals(id) on delete cascade not null,
  balance     numeric(12,2) not null,
  recorded_at timestamptz not null default now()
);

alter table savings_goal_history enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'savings_goal_history' and policyname = 'users view own goal history'
  ) then
    create policy "users view own goal history" on savings_goal_history
      for select using (
        exists (
          select 1 from savings_goals g
          where g.id = goal_id and g.user_id = auth.uid()
        )
      );
  end if;
end $$;

do $$ begin
  if not exists (
    select 1 from pg_policies where tablename = 'savings_goal_history' and policyname = 'service writes goal history'
  ) then
    create policy "service writes goal history" on savings_goal_history
      for insert with check (true);
  end if;
end $$;
