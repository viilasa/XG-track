import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

interface FollowerSnapshot {
  user_id: string
  followers_count: number
  date: string
}

/**
 * Fetches follower snapshots for a date range and computes followers gained.
 * @param periodStartDate - 'yyyy-MM-dd' start of the period (challenge start or 7 days ago)
 */
export function useFollowerSnapshots(
  userId: string | undefined,
  periodStartDate: string,
) {
  const { data: snapshots = [] } = useQuery({
    queryKey: ['follower-snapshots', userId, periodStartDate],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('follower_snapshots')
        .select('user_id, followers_count, date')
        .eq('user_id', userId!)
        .gte('date', periodStartDate)
        .order('date', { ascending: true })

      if (error) {
        console.warn('[XG] follower_snapshots query failed:', error.message)
        return []
      }
      return (data ?? []) as FollowerSnapshot[]
    },
  })

  if (snapshots.length === 0) {
    return { startCount: null, currentCount: null, gained: null }
  }

  const startCount = snapshots[0].followers_count
  const currentCount = snapshots[snapshots.length - 1].followers_count
  const gained = currentCount - startCount

  return { startCount, currentCount, gained }
}
