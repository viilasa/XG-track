-- ============================================================
-- XG Tracker — Supabase Schema
-- Run this entire file in your Supabase SQL editor
-- ============================================================

-- Profiles (synced from X OAuth)
create table if not exists profiles (
  id uuid references auth.users primary key,
  twitter_id text unique,
  twitter_username text,
  twitter_name text,
  twitter_avatar text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table profiles enable row level security;
drop policy if exists "Users can CRUD own profile" on profiles;
create policy "Users can CRUD own profile" on profiles
  using (auth.uid() = id) with check (auth.uid() = id);

-- Goals
create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade unique,
  replies_per_day int default 5,
  tweets_per_day int default 3,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table goals enable row level security;
drop policy if exists "Users can CRUD own goals" on goals;
create policy "Users can CRUD own goals" on goals
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Daily stats
create table if not exists daily_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  date date default current_date,
  replies_sent int default 0,
  tweets_posted int default 0,
  replies_received int default 0,
  replies_cleared int default 0,
  goal_replies_met boolean default false,
  goal_tweets_met boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, date)
);
alter table daily_stats enable row level security;
drop policy if exists "Users can CRUD own daily_stats" on daily_stats;
create policy "Users can CRUD own daily_stats" on daily_stats
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Streaks
create table if not exists streaks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade unique,
  current_reply_streak int default 0,
  current_tweet_streak int default 0,
  current_engagement_streak int default 0,
  longest_reply_streak int default 0,
  longest_tweet_streak int default 0,
  longest_engagement_streak int default 0,
  weekly_streak_score int default 0,
  last_reply_date date,
  last_tweet_date date,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table streaks enable row level security;
drop policy if exists "Users can CRUD own streaks" on streaks;
create policy "Users can CRUD own streaks" on streaks
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Received tweets (inbox)
create table if not exists received_tweets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  tweet_id text,
  tweet_text text,
  author_name text,
  author_username text,
  author_avatar text,
  created_at_twitter timestamptz,
  is_cleared boolean default false,
  cleared_at timestamptz,
  fetched_at timestamptz default now(),
  unique(user_id, tweet_id)
);
alter table received_tweets enable row level security;
drop policy if exists "Users can CRUD own received_tweets" on received_tweets;
create policy "Users can CRUD own received_tweets" on received_tweets
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Badges (static reference data — no RLS needed)
create table if not exists badges (
  id text primary key,
  name text not null,
  description text,
  icon text,
  category text,
  threshold int
);

-- User earned badges
create table if not exists user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  badge_id text references badges(id),
  earned_at timestamptz default now(),
  unique(user_id, badge_id)
);
alter table user_badges enable row level security;
drop policy if exists "Users can read own badges" on user_badges;
create policy "Users can read own badges" on user_badges
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Seed badge definitions ───────────────────────────────────────────────────
insert into badges (id, name, description, icon, category, threshold) values
  ('reply_streak_7',   'Week Warrior',      'Reply goal met 7 days in a row',    '🔥', 'reply_streak',  7),
  ('reply_streak_30',  'Monthly Maestro',   'Reply goal met 30 days in a row',   '💎', 'reply_streak',  30),
  ('reply_streak_100', 'Century Champion',  'Reply goal met 100 days in a row',  '👑', 'reply_streak',  100),
  ('tweet_streak_7',   'Consistent Creator','Tweet goal met 7 days in a row',    '⚡', 'tweet_streak',  7),
  ('tweet_streak_30',  'Content Machine',   'Tweet goal met 30 days in a row',   '🚀', 'tweet_streak',  30),
  ('tweet_streak_100', 'Legendary Poster',  'Tweet goal met 100 days in a row',  '🏆', 'tweet_streak',  100),
  ('cleared_50',       'Inbox Zero Hero',   'Cleared 50 received replies',       '✅', 'inbox',          50),
  ('cleared_200',      'Reply Master',      'Cleared 200 received replies',      '🎯', 'inbox',          200)
on conflict (id) do nothing;

-- ── Cache for user's own tweets + replies ────────────────────────────────────
create table if not exists tweets_cache (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  tweet_id text not null,
  tweet_text text,
  author_name text,
  author_username text,
  author_avatar text,
  is_reply boolean default false,
  in_reply_to_id text,
  reply_count int default 0,
  retweet_count int default 0,
  like_count int default 0,
  view_count int default 0,
  is_blue_verified boolean default false,
  created_at_twitter timestamptz,
  fetched_at timestamptz default now(),
  unique(user_id, tweet_id)
);
alter table tweets_cache enable row level security;
drop policy if exists "Users can CRUD own tweets_cache" on tweets_cache;
create policy "Users can CRUD own tweets_cache" on tweets_cache
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ── Add last_synced_at to profiles ───────────────────────────────────────────
alter table profiles add column if not exists last_synced_at timestamptz;

-- ── Add goal options: duration, track_replies, track_tweets ───────────────────
alter table goals add column if not exists goal_duration_days int;
alter table goals add column if not exists track_replies boolean default true;
alter table goals add column if not exists track_tweets boolean default true;

-- ── Fix daily_stats: add missing columns (if table was created with old schema) ─
alter table daily_stats add column if not exists replies_sent int default 0;
alter table daily_stats add column if not exists tweets_posted int default 0;
alter table daily_stats add column if not exists replies_received int default 0;
alter table daily_stats add column if not exists replies_cleared int default 0;
alter table daily_stats add column if not exists goal_replies_met boolean default false;
alter table daily_stats add column if not exists goal_tweets_met boolean default false;
