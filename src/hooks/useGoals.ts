import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { differenceInDays, parseISO } from 'date-fns'
import { supabase } from '@/lib/supabase'
import type { Goal, DailyStat } from '@/types'

export interface GoalCompletionInfo {
  isComplete: boolean
  daysCompleted: number
  totalDays: number
  isPerfect: boolean
}

/** Calculate goal completion stats */
export function calculateGoalCompletion(
  goals: Goal | null | undefined,
  recentStats: DailyStat[] | null | undefined
): GoalCompletionInfo {
  if (!goals?.goal_duration_days || !goals.goal_started_at) {
    return { isComplete: false, daysCompleted: 0, totalDays: 0, isPerfect: false }
  }

  const duration = goals.goal_duration_days
  const startDate = parseISO(goals.goal_started_at.slice(0, 10))
  const daysElapsed = differenceInDays(new Date(), startDate)
  const isComplete = daysElapsed >= duration

  const trackReplies = goals.track_replies ?? true
  const trackTweets = goals.track_tweets ?? true

  let daysCompleted = 0
  for (const stat of recentStats ?? []) {
    let met = false
    if (trackReplies && trackTweets) {
      met = (stat.goal_replies_met ?? false) && (stat.goal_tweets_met ?? false)
    } else if (trackReplies) {
      met = stat.goal_replies_met ?? false
    } else if (trackTweets) {
      met = stat.goal_tweets_met ?? false
    }
    if (met) daysCompleted++
  }

  const isPerfect = daysCompleted >= duration

  return { isComplete, daysCompleted, totalDays: duration, isPerfect }
}

/** Archive current goal to goal_history */
async function archiveGoalToHistory(
  currentGoal: Goal, 
  reason: 'completed' | 'replaced' | 'abandoned',
  daysCompleted: number
) {
  if (!currentGoal.id || !currentGoal.goal_duration_days) return

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

  // Award goal badges
  await awardGoalBadges(currentGoal.user_id, daysCompleted, currentGoal.goal_duration_days)
}

/** Award badges for completing goals */
async function awardGoalBadges(userId: string, daysCompleted: number, totalDays: number) {
  const isPerfect = daysCompleted >= totalDays

  // Count total completed challenges
  const { count } = await supabase
    .from('goal_history')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('ended_reason', 'completed')

  const totalCompleted = (count ?? 0) + 1

  const badgesToAward: string[] = []

  // First Victory
  if (totalCompleted >= 1) badgesToAward.push('goal_first')
  // Triple Threat
  if (totalCompleted >= 3) badgesToAward.push('goal_3')
  // Goal Crusher
  if (totalCompleted >= 10) badgesToAward.push('goal_10')
  // Perfect Week
  if (isPerfect) badgesToAward.push('goal_perfect')

  for (const badgeId of badgesToAward) {
    await supabase
      .from('user_badges')
      .upsert({ user_id: userId, badge_id: badgeId }, { onConflict: 'user_id,badge_id' })
  }
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
      qc.invalidateQueries({ queryKey: ['user-badges', userId] })
    },
  })

  /** Complete the current goal challenge and archive it */
  const completeGoal = useMutation({
    mutationFn: async (daysCompleted: number) => {
      if (!goals?.id || !goals.goal_duration_days) return

      // Archive to history
      await archiveGoalToHistory(goals, 'completed', daysCompleted)

      // Clear the goal duration (keeps daily targets but removes challenge)
      const { error } = await supabase
        .from('goals')
        .update({
          goal_duration_days: null,
          goal_started_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId!)

      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals', userId] })
      qc.invalidateQueries({ queryKey: ['goal_history', userId] })
      qc.invalidateQueries({ queryKey: ['user-badges', userId] })
    },
  })

  return { goals, isLoading, saveGoals, completeGoal }
}
