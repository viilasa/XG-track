-- ============================================================
-- XG Tracker — Fix: remove seeded data, set streak to day 1 (today)
-- Run this in Supabase SQL Editor, then hard-refresh the app
-- ============================================================

DO $$
DECLARE
  v_user_id    UUID;
  v_reply_goal INT := 5;
  v_tweet_goal INT := 3;
BEGIN
  SELECT id INTO v_user_id FROM profiles LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No profile found.';
  END IF;

  -- Use your actual saved goals
  SELECT
    COALESCE(replies_per_day, 5),
    COALESCE(tweets_per_day, 3)
  INTO v_reply_goal, v_tweet_goal
  FROM goals
  WHERE user_id = v_user_id;

  -- 1. Remove all dummy tweets inserted by the seed script
  DELETE FROM tweets_cache
  WHERE user_id = v_user_id
    AND tweet_id LIKE 'seed_%';

  -- 2. Remove seeded daily_stats for the past 6 days (before today)
  DELETE FROM daily_stats
  WHERE user_id = v_user_id
    AND date >= (CURRENT_DATE - 6)
    AND date < CURRENT_DATE;

  -- 3. Mark today as goal met (day 1 of the streak)
  INSERT INTO daily_stats (
    user_id, date,
    replies_sent, tweets_posted,
    replies_received, replies_cleared,
    goal_replies_met, goal_tweets_met,
    updated_at
  )
  VALUES (
    v_user_id, CURRENT_DATE,
    v_reply_goal, v_tweet_goal,
    0, 0,
    true, true,
    NOW()
  )
  ON CONFLICT (user_id, date) DO UPDATE SET
    replies_sent     = GREATEST(daily_stats.replies_sent, v_reply_goal),
    tweets_posted    = GREATEST(daily_stats.tweets_posted, v_tweet_goal),
    goal_replies_met = true,
    goal_tweets_met  = true,
    updated_at       = NOW();

  -- 4. Set streaks to day 1 (today = first day of streak)
  --    longest_* keeps any higher value from before
  INSERT INTO streaks (
    user_id,
    current_reply_streak,  longest_reply_streak,  last_reply_date,
    current_tweet_streak,  longest_tweet_streak,  last_tweet_date,
    current_engagement_streak, longest_engagement_streak,
    weekly_streak_score,
    updated_at
  )
  VALUES (
    v_user_id,
    1, 1, CURRENT_DATE,
    1, 1, CURRENT_DATE,
    1, 1,
    2,
    NOW()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    current_reply_streak      = 1,
    longest_reply_streak      = GREATEST(streaks.longest_reply_streak, 1),
    last_reply_date           = CURRENT_DATE,
    current_tweet_streak      = 1,
    longest_tweet_streak      = GREATEST(streaks.longest_tweet_streak, 1),
    last_tweet_date           = CURRENT_DATE,
    current_engagement_streak = 1,
    longest_engagement_streak = GREATEST(streaks.longest_engagement_streak, 1),
    weekly_streak_score       = 2,
    updated_at                = NOW();

  -- 5. Remove incorrectly awarded streak badges so they re-earn naturally
  DELETE FROM user_badges
  WHERE user_id = v_user_id
    AND badge_id IN (
      'reply_streak_7',  'reply_streak_30',  'reply_streak_100',
      'tweet_streak_7',  'tweet_streak_30',  'tweet_streak_100'
    );

  RAISE NOTICE 'Done for user %. Streak is now 1. Hard-refresh the app.', v_user_id;
END $$;
