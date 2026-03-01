import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { todayString } from '@/lib/streakUtils'
import type { DailyStat } from '@/types'

export function useDailyStats(userId: string | undefined) {
  const qc = useQueryClient()
  const today = todayString()

  const { data: todayStats, isLoading } = useQuery({
    queryKey: ['daily-stats', userId, today],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_stats')
        .select('*')
        .eq('user_id', userId!)
        .eq('date', today)
        .maybeSingle()

      if (error) throw error
      return data as DailyStat | null
    },
  })

  const { data: recentStats } = useQuery({
    queryKey: ['recent-stats', userId],
    enabled: !!userId,
    queryFn: async () => {
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      const { data, error } = await supabase
        .from('daily_stats')
        .select('*')
        .eq('user_id', userId!)
        .gte('date', thirtyDaysAgo.toISOString().slice(0, 10))
        .order('date', { ascending: true })

      if (error) throw error
      return (data ?? []) as DailyStat[]
    },
  })

  const clearReply = useMutation({
    mutationFn: async (tweetDbId: string) => {
      // 1. Mark the received_tweet as cleared
      const { error: tweetError } = await supabase
        .from('received_tweets')
        .update({ is_cleared: true, cleared_at: new Date().toISOString() })
        .eq('id', tweetDbId)
        .eq('user_id', userId!)

      if (tweetError) throw tweetError

      // 2. Read current stats from DB (not from stale React state)
      const { data: currentRow } = await supabase
        .from('daily_stats')
        .select('*')
        .eq('user_id', userId!)
        .eq('date', today)
        .maybeSingle()

      // 3. Upsert with ALL fields preserved + increment cleared
      const { data, error } = await supabase
        .from('daily_stats')
        .upsert(
          {
            user_id: userId!,
            date: today,
            replies_sent: currentRow?.replies_sent ?? 0,
            tweets_posted: currentRow?.tweets_posted ?? 0,
            replies_received: currentRow?.replies_received ?? 0,
            replies_cleared: (currentRow?.replies_cleared ?? 0) + 1,
            goal_replies_met: currentRow?.goal_replies_met ?? false,
            goal_tweets_met: currentRow?.goal_tweets_met ?? false,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,date' },
        )
        .select()
        .single()

      if (error) throw error

      // 4. Check inbox badges
      const { count } = await supabase
        .from('received_tweets')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId!)
        .eq('is_cleared', true)

      if (count && count >= 50) {
        await supabase
          .from('user_badges')
          .upsert({ user_id: userId!, badge_id: 'cleared_50' }, { onConflict: 'user_id,badge_id' })
      }
      if (count && count >= 200) {
        await supabase
          .from('user_badges')
          .upsert({ user_id: userId!, badge_id: 'cleared_200' }, { onConflict: 'user_id,badge_id' })
      }

      return data as DailyStat
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['daily-stats', userId, today] })
      qc.invalidateQueries({ queryKey: ['recent-stats', userId] })
      qc.invalidateQueries({ queryKey: ['received-tweets', userId] })
      qc.invalidateQueries({ queryKey: ['user-badges', userId] })
    },
  })

  return { todayStats, recentStats, isLoading, clearReply }
}
