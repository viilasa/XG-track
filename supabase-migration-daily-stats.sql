-- Run this in Supabase SQL Editor to fix daily_stats missing columns
-- Adds all columns required by the app

alter table daily_stats add column if not exists replies_sent int default 0;
alter table daily_stats add column if not exists tweets_posted int default 0;
alter table daily_stats add column if not exists replies_received int default 0;
alter table daily_stats add column if not exists replies_cleared int default 0;
alter table daily_stats add column if not exists goal_replies_met boolean default false;
alter table daily_stats add column if not exists goal_tweets_met boolean default false;
alter table daily_stats add column if not exists updated_at timestamptz default now();
alter table daily_stats add column if not exists created_at timestamptz default now();

-- Manual counter columns (for quick add feature)
alter table daily_stats add column if not exists manual_replies int default 0;
alter table daily_stats add column if not exists manual_tweets int default 0;
