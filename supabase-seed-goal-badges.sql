-- ============================================================
-- XG Tracker — Seed: Goal Challenge Badges
-- Run this in Supabase SQL Editor
-- ============================================================

INSERT INTO badges (id, name, description, icon, category, threshold) VALUES
  ('goal_first',   'First Victory',  'Completed your first goal challenge',     '🏅', 'goal', 1),
  ('goal_3',       'Triple Threat',  'Completed 3 goal challenges',             '🎯', 'goal', 3),
  ('goal_10',      'Goal Crusher',   'Completed 10 goal challenges',            '💪', 'goal', 10),
  ('goal_perfect', 'Perfect Week',   'Met every single day in a challenge',     '⭐', 'goal', 1)
ON CONFLICT (id) DO NOTHING;
