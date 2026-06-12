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
  if not exists (select 1 from pg_policies where tablename = 'plaid_items' and policyname = 'owner_select') then
    create policy "owner_select" on plaid_items for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'plaid_items' and policyname = 'owner_insert') then
    create policy "owner_insert" on plaid_items for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where tablename = 'plaid_items' and policyname = 'owner_delete') then
    create policy "owner_delete" on plaid_items for delete using (auth.uid() = user_id);
  end if;
end $$;
