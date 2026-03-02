-- ============================================================
-- XG Tracker — Migration: Challenge tracking + manual counters
-- Run this in your Supabase SQL editor
-- ============================================================

-- Add goal_started_at to track when a timed challenge started
-- This is set each time user saves goals with a duration (7/14/30/90 days)
ALTER TABLE goals ADD COLUMN IF NOT EXISTS goal_started_at TIMESTAMPTZ;

-- Ensure daily_stats has manual tracking columns (referenced in DailyStat type)
ALTER TABLE daily_stats ADD COLUMN IF NOT EXISTS manual_replies INT DEFAULT 0;
ALTER TABLE daily_stats ADD COLUMN IF NOT EXISTS manual_tweets INT DEFAULT 0;
