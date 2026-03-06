-- ============================================================
-- XG Tracker — Fix: Restore previous 7-day challenge goal
-- Run this in Supabase SQL Editor
-- ============================================================
-- This removes the accidentally-added tweet goal and restores
-- the original 7-day challenge that started on Mon March 2, 2026.

-- Step 1: Check current goals (run this first to see what's there)
-- SELECT * FROM goals WHERE user_id = auth.uid();

-- Step 2: Restore the original 7-day challenge
UPDATE goals
SET
  goal_duration_days = 7,
  goal_started_at = '2026-03-02T00:00:00.000Z',  -- Monday March 2
  track_replies = true,
  track_tweets = false,          -- remove the tweet goal that was added
  replies_per_day = 5,           -- adjust to your original value
  updated_at = now()
WHERE user_id = auth.uid();

-- Step 3: Verify the fix
-- SELECT id, replies_per_day, tweets_per_day, goal_duration_days, goal_started_at, track_replies, track_tweets
-- FROM goals WHERE user_id = auth.uid();
