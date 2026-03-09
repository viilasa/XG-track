-- ============================================================
-- XG Tracker — Seed: simulate ONE day of goals met (streak = 1)
-- Run this in Supabase SQL Editor to test the streak starting from today.
-- Each subsequent day you meet your goals, the streak auto-increments.
-- Badges are awarded automatically at 7 / 30 / 100 day milestones.
-- ============================================================

DO $$
DECLARE
  v_user_id    UUID;
  v_reply_goal INT := 5;
  v_tweet_goal INT := 3;
  j            INT;
BEGIN
  SELECT id INTO v_user_id FROM profiles LIMIT 1;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No profile found — sign in first, then run this script.';
  END IF;

  -- Use your actual saved goals
  SELECT
    COALESCE(replies_per_day, 5),
    COALESCE(tweets_per_day, 3)
  INTO v_reply_goal, v_tweet_goal
  FROM goals
  WHERE user_id = v_user_id;

  RAISE NOTICE 'Seeding TODAY only for user %, reply goal=%, tweet goal=%',
    v_user_id, v_reply_goal, v_tweet_goal;

  -- ── 1. Insert dummy tweets for TODAY only ────────────────────────────────────

  -- Replies (is_reply = true)
  FOR j IN 1..v_reply_goal LOOP
    INSERT INTO tweets_cache (
      user_id, tweet_id, tweet_text,
      author_name, author_username, author_avatar,
      is_reply, in_reply_to_id,
      reply_count, retweet_count, like_count, view_count,
      is_blue_verified, created_at_twitter, fetched_at
    )
    SELECT
      v_user_id,
      'seed_reply_' || CURRENT_DATE::text || '_' || j::text,
      'Seed reply #' || j || ' — ' || CURRENT_DATE::text,
      COALESCE(p.twitter_name, 'You'),
      COALESCE(p.twitter_username, 'you'),
      COALESCE(p.twitter_avatar, ''),
      true,
      'seed_ref_0_' || j,
      0, 0, 1, 10, false,
      CURRENT_DATE::timestamptz + INTERVAL '9 hours' + (j || ' minutes')::INTERVAL,
      NOW()
    FROM profiles p WHERE p.id = v_user_id
    ON CONFLICT (user_id, tweet_id) DO NOTHING;
  END LOOP;

  -- Original tweets (is_reply = false)
  FOR j IN 1..v_tweet_goal LOOP
    INSERT INTO tweets_cache (
      user_id, tweet_id, tweet_text,
      author_name, author_username, author_avatar,
      is_reply,
      reply_count, retweet_count, like_count, view_count,
      is_blue_verified, created_at_twitter, fetched_at
    )
    SELECT
      v_user_id,
      'seed_tweet_' || CURRENT_DATE::text || '_' || j::text,
      'Seed tweet #' || j || ' — ' || CURRENT_DATE::text,
      COALESCE(p.twitter_name, 'You'),
      COALESCE(p.twitter_username, 'you'),
      COALESCE(p.twitter_avatar, ''),
      false,
      0, 0, 2, 20, false,
      CURRENT_DATE::timestamptz + INTERVAL '11 hours' + (j || ' minutes')::INTERVAL,
      NOW()
    FROM profiles p WHERE p.id = v_user_id
    ON CONFLICT (user_id, tweet_id) DO NOTHING;
  END LOOP;

  -- ── 2. Upsert daily_stats for TODAY with goals met ───────────────────────────
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

  -- ── 3. Set streak to 1 (today = day 1) ──────────────────────────────────────
  --    Badges are NOT awarded here — they are auto-awarded by the app
  --    when the streak reaches 7 / 30 / 100 during the next Sync.
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

  RAISE NOTICE 'Done! Streak is now day 1. It will auto-increment each day you meet your goals.';
END $$;
