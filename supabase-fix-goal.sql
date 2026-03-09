-- ============================================================
-- XG Tracker — Fix: Restore previous 7-day challenge goal
-- Run this in Supabase SQL Editor
-- ============================================================
-- auth.uid() does NOT work in the SQL Editor — use your actual user_id.

-- Step 1: Find your user_id (run this first)
SELECT id, twitter_username FROM profiles;

-- Step 2: Copy your user_id from Step 1 and replace YOUR_USER_ID_HERE below.
-- Then uncomment and run Step 2.

-- UPDATE goals
-- SET
--   goal_duration_days = 7,
--   goal_started_at = '2026-03-02T00:00:00.000Z',
--   track_replies = true,
--   track_tweets = false,
--   replies_per_day = 5,
--   updated_at = now()
-- WHERE user_id = 'YOUR_USER_ID_HERE';

-- Step 3: Verify
-- SELECT * FROM goals WHERE user_id = 'YOUR_USER_ID_HERE';
