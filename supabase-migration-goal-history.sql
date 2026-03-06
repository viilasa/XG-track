-- ============================================================
-- XG Tracker — Migration: goal_history table
-- Run this in Supabase SQL Editor
-- ============================================================

create table if not exists goal_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  replies_per_day int not null default 5,
  tweets_per_day int not null default 3,
  goal_duration_days int,
  goal_started_at timestamptz,
  track_replies boolean not null default true,
  track_tweets boolean not null default true,
  -- How many days the user actually completed their goal
  days_completed int not null default 0,
  total_days int not null default 0,
  -- When this goal ended (completed or replaced)
  ended_at timestamptz not null default now(),
  ended_reason text not null default 'completed', -- 'completed' | 'replaced' | 'abandoned'
  created_at timestamptz default now()
);

-- RLS
alter table goal_history enable row level security;

create policy "Users see own goal history"
  on goal_history for all
  using (user_id = auth.uid());
