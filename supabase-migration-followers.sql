-- ============================================================
-- XG Tracker — Migration: follower_snapshots table
-- Run this in Supabase SQL Editor
-- ============================================================

create table if not exists follower_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  followers_count int not null,
  date date not null default current_date,
  created_at timestamptz default now(),
  unique(user_id, date)
);

-- RLS
alter table follower_snapshots enable row level security;

create policy "Users see own snapshots"
  on follower_snapshots for all
  using (user_id = auth.uid());
