import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Goal } from '@/types'

/** Archive current goal to goal_history before replacing it */
async function archiveGoalToHistory(currentGoal: Goal, reason: 'completed' | 'replaced' | 'abandoned') {
  if (!currentGoal.id || !currentGoal.goal_duration_days) return

  // Count how many days the user met their goal during this challenge
  const startDate = currentGoal.goal_started_at?.slice(0, 10) ?? currentGoal.updated_at.slice(0, 10)
  const { data: stats } = await supabase
    .from('daily_stats')
    .select('goal_replies_met, goal_tweets_met')
    .eq('user_id', currentGoal.user_id)
    .gte('date', startDate)

  let daysCompleted = 0
  for (const s of stats ?? []) {
    const trackReplies = currentGoal.track_replies ?? true
    const trackTweets = currentGoal.track_tweets ?? true
    let met = false
    if (trackReplies && trackTweets) {
      met = (s.goal_replies_met ?? false) && (s.goal_tweets_met ?? false)
    } else if (trackReplies) {
      met = s.goal_replies_met ?? false
    } else if (trackTweets) {
      met = s.goal_tweets_met ?? false
    }
    if (met) daysCompleted++
  }

  // Silently skip if table doesn't exist yet
  await supabase.from('goal_history').insert({
    user_id: currentGoal.user_id,
    replies_per_day: currentGoal.replies_per_day,
    tweets_per_day: currentGoal.tweets_per_day,
    goal_duration_days: currentGoal.goal_duration_days,
    goal_started_at: currentGoal.goal_started_at,
    track_replies: currentGoal.track_replies,
    track_tweets: currentGoal.track_tweets,
    days_completed: daysCompleted,
    total_days: currentGoal.goal_duration_days,
    ended_reason: reason,
  })
}

export function useGoals(userId: string | undefined) {
  const qc = useQueryClient()

  const { data: goals, isLoading } = useQuery({
    queryKey: ['goals', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId!)
        .maybeSingle()

      if (error) throw error
      // Return defaults if no goal row yet
      return (
        data ??
        ({
          id: '',
          user_id: userId!,
          replies_per_day: 5,
          tweets_per_day: 3,
          goal_duration_days: null,
          track_replies: true,
          track_tweets: true,
          created_at: '',
          updated_at: '',
        } as Goal)
      )
    },
  })

  const saveGoals = useMutation({
    mutationFn: async (updates: {
      replies_per_day: number
      tweets_per_day: number
      goal_duration_days?: number | null
      track_replies?: boolean
      track_tweets?: boolean
    }) => {
      // Archive the current goal to history if it had a duration challenge
      // Wrapped in try-catch so it doesn't block saving if table doesn't exist
      if (goals?.id && goals.goal_duration_days) {
        try { await archiveGoalToHistory(goals, 'replaced') } catch { /* ignore */ }
      }

      // Set goal_started_at when a duration is chosen (starts the challenge clock)
      // Reset to null when duration is cleared
      const goal_started_at =
        updates.goal_duration_days != null ? new Date().toISOString() : null

      const { data, error } = await supabase
        .from('goals')
        .upsert(
          {
            user_id: userId!,
            ...updates,
            goal_started_at,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' },
        )
        .select()
        .single()

      if (error) throw error
      return data as Goal
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals', userId] })
      qc.invalidateQueries({ queryKey: ['goal_history', userId] })
    },
  })

  return { goals, isLoading, saveGoals }
}
