-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)

create table if not exists calendar_tokens (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references users(id) on delete cascade,
  provider      text not null default 'google',
  refresh_token text not null,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique(user_id, provider)
);

alter table calendar_tokens enable row level security;

create policy "anon full access" on calendar_tokens
  for all to anon
  using (true)
  with check (true);

grant all on table calendar_tokens to anon, authenticated;
