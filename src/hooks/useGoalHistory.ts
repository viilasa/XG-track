import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { GoalHistory } from '@/types'

export function useGoalHistory(userId: string | undefined) {
  const { data: history, isLoading } = useQuery({
    queryKey: ['goal_history', userId],
    enabled: !!userId,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('goal_history')
        .select('*')
        .eq('user_id', userId!)
        .order('ended_at', { ascending: false })

      // Table might not exist yet — return empty instead of crashing
      if (error) return []
      return (data ?? []) as GoalHistory[]
    },
  })

  return { history: history ?? [], isLoading }
}
