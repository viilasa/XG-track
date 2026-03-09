-- ============================================================
-- XG Tracker — Migration: Goal History Table
-- Run this in Supabase SQL Editor if you don't have goal_history table
-- ============================================================

-- Goal History (completed/abandoned challenges)
create table if not exists goal_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  replies_per_day int,
  tweets_per_day int,
  goal_duration_days int,
  goal_started_at timestamptz,
  track_replies boolean default true,
  track_tweets boolean default true,
  days_completed int default 0,
  total_days int,
  ended_at timestamptz default now(),
  ended_reason text check (ended_reason in ('completed', 'replaced', 'abandoned')),
  created_at timestamptz default now()
);

alter table goal_history enable row level security;

drop policy if exists "Users can CRUD own goal_history" on goal_history;
create policy "Users can CRUD own goal_history" on goal_history
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Add goal_started_at to goals table if not exists
alter table goals add column if not exists goal_started_at timestamptz;

-- Seed goal badges if not already present
INSERT INTO badges (id, name, description, icon, category, threshold) VALUES
  ('goal_first',   'First Victory',  'Completed your first goal challenge',     '🏅', 'goal', 1),
  ('goal_3',       'Triple Threat',  'Completed 3 goal challenges',             '🎯', 'goal', 3),
  ('goal_10',      'Goal Crusher',   'Completed 10 goal challenges',            '💪', 'goal', 10),
  ('goal_perfect', 'Perfect Week',   'Met every single day in a challenge',     '⭐', 'goal', 1)
ON CONFLICT (id) DO NOTHING;
