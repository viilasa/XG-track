import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { calculateStreak, todayString } from '@/lib/streakUtils'
import type { Streak } from '@/types'

const DEFAULT_STREAK: Omit<Streak, 'id' | 'user_id' | 'created_at' | 'updated_at'> = {
  current_reply_streak: 0,
  current_tweet_streak: 0,
  current_engagement_streak: 0,
  longest_reply_streak: 0,
  longest_tweet_streak: 0,
  longest_engagement_streak: 0,
  weekly_streak_score: 0,
  last_reply_date: null,
  last_tweet_date: null,
}

export function useStreaks(userId: string | undefined) {
  const qc = useQueryClient()

  const { data: streaks, isLoading } = useQuery({
    queryKey: ['streaks', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('streaks')
        .select('*')
        .eq('user_id', userId!)
        .maybeSingle()

      if (error) throw error
      return data as Streak | null
    },
  })

  const updateStreaks = useMutation({
    mutationFn: async (opts: { replyGoalMet: boolean; tweetGoalMet: boolean }) => {
      const today = todayString()
      const current = streaks ?? { ...DEFAULT_STREAK, user_id: userId!, id: '' }

      let newReplyStreak = current.current_reply_streak
      let newTweetStreak = current.current_tweet_streak
      let lastReplyDate = current.last_reply_date
      let lastTweetDate = current.last_tweet_date

      if (opts.replyGoalMet && lastReplyDate !== today) {
        newReplyStreak = calculateStreak(lastReplyDate, current.current_reply_streak, today)
        lastReplyDate = today
      }

      if (opts.tweetGoalMet && lastTweetDate !== today) {
        newTweetStreak = calculateStreak(lastTweetDate, current.current_tweet_streak, today)
        lastTweetDate = today
      }

      const newEngagementStreak =
        opts.replyGoalMet && opts.tweetGoalMet
          ? calculateStreak(
              current.last_reply_date ?? null,
              current.current_engagement_streak,
              today,
            )
          : current.current_engagement_streak

      // Calculate weekly score: count days in last 7 where both goals were met
      const { data: recentStats } = await supabase
        .from('daily_stats')
        .select('date, goal_replies_met, goal_tweets_met')
        .eq('user_id', userId!)
        .gte('date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10))

      let weeklyScore = 0
      if (recentStats) {
        for (const stat of recentStats) {
          if (stat.goal_replies_met && stat.goal_tweets_met) weeklyScore += 2
          else if (stat.goal_replies_met || stat.goal_tweets_met) weeklyScore += 1
        }
      }

      const updates = {
        user_id: userId!,
        current_reply_streak: newReplyStreak,
        current_tweet_streak: newTweetStreak,
        current_engagement_streak: newEngagementStreak,
        longest_reply_streak: Math.max(
          current.longest_reply_streak,
          newReplyStreak,
        ),
        longest_tweet_streak: Math.max(
          current.longest_tweet_streak,
          newTweetStreak,
        ),
        longest_engagement_streak: Math.max(
          current.longest_engagement_streak,
          newEngagementStreak,
        ),
        weekly_streak_score: weeklyScore,
        last_reply_date: lastReplyDate,
        last_tweet_date: lastTweetDate,
        updated_at: new Date().toISOString(),
      }

      const { data, error } = await supabase
        .from('streaks')
        .upsert(updates, { onConflict: 'user_id' })
        .select()
        .single()

      if (error) throw error

      // Check and award badges
      await checkAndAwardBadges(userId!, updates.current_reply_streak, updates.current_tweet_streak)

      return data as Streak
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['streaks', userId] })
      qc.invalidateQueries({ queryKey: ['user-badges', userId] })
    },
  })

  return { streaks, isLoading, updateStreaks }
}

async function checkAndAwardBadges(
  userId: string,
  replyStreak: number,
  tweetStreak: number,
) {
  const badgesToCheck: Array<{ id: string; value: number }> = [
    { id: 'reply_streak_7', value: replyStreak >= 7 ? 1 : 0 },
    { id: 'reply_streak_30', value: replyStreak >= 30 ? 1 : 0 },
    { id: 'reply_streak_100', value: replyStreak >= 100 ? 1 : 0 },
    { id: 'tweet_streak_7', value: tweetStreak >= 7 ? 1 : 0 },
    { id: 'tweet_streak_30', value: tweetStreak >= 30 ? 1 : 0 },
    { id: 'tweet_streak_100', value: tweetStreak >= 100 ? 1 : 0 },
  ]

  for (const badge of badgesToCheck) {
    if (badge.value > 0) {
      await supabase
        .from('user_badges')
        .upsert({ user_id: userId, badge_id: badge.id }, { onConflict: 'user_id,badge_id' })
    }
  }
}
