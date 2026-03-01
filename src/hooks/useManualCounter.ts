import { useCallback } from 'react'
import { useQueryClient, useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { todayString } from '@/lib/streakUtils'

export function useManualCounter(userId: string | undefined) {
  const qc = useQueryClient()
  const today = todayString()

  const { data: manualCount = 0 } = useQuery({
    queryKey: ['manual-count', userId, today],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_stats')
        .select('manual_replies')
        .eq('user_id', userId!)
        .eq('date', today)
        .maybeSingle()

      if (error) {
        console.warn('[XG] Failed to fetch manual count:', error.message)
        return 0
      }
      return data?.manual_replies ?? 0
    },
  })

  const incrementReply = useCallback(async () => {
    if (!userId) return

    const newCount = manualCount + 1

    const { error } = await supabase
      .from('daily_stats')
      .upsert(
        {
          user_id: userId,
          date: today,
          manual_replies: newCount,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,date' }
      )

    if (error) {
      console.error('[XG] Failed to increment manual reply:', error.message)
      return
    }

    qc.invalidateQueries({ queryKey: ['manual-count', userId, today] })
    qc.invalidateQueries({ queryKey: ['daily-stats'] })
  }, [userId, today, manualCount, qc])

  const incrementTweet = useCallback(async () => {
    if (!userId) return

    const { data: current } = await supabase
      .from('daily_stats')
      .select('manual_tweets')
      .eq('user_id', userId)
      .eq('date', today)
      .maybeSingle()

    const newCount = (current?.manual_tweets ?? 0) + 1

    const { error } = await supabase
      .from('daily_stats')
      .upsert(
        {
          user_id: userId,
          date: today,
          manual_tweets: newCount,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,date' }
      )

    if (error) {
      console.error('[XG] Failed to increment manual tweet:', error.message)
      return
    }

    qc.invalidateQueries({ queryKey: ['manual-count', userId, today] })
    qc.invalidateQueries({ queryKey: ['daily-stats'] })
  }, [userId, today, qc])

  return { manualCount, incrementReply, incrementTweet }
}
