import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Goal } from '@/types'

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
    },
  })

  return { goals, isLoading, saveGoals }
}
