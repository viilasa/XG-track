import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { todayString, todayBoundsUTC } from '@/lib/streakUtils'
import type { CachedTweet, ReceivedTweet } from '@/types'

/**
 * Reads ALL data from Supabase DB only — no API calls.
 * Data is populated by useSync.
 *
 * Provides both "today" queries (for goal/streak counting) and
 * "recent" queries (last 48h, for UI display fallback when today is empty).
 */
export function useTwitterData(userId: string | undefined) {
  const today = todayString()
  const { start: todayStart, end: todayEnd } = todayBoundsUTC()
  const recent48hStart = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

  // Today's tweets (from tweets_cache, is_reply=false)
  const { data: todayTweets = [], isLoading: isLoadingTweets } = useQuery({
    queryKey: ['cached-tweets', userId, 'tweets', today],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tweets_cache')
        .select('*')
        .eq('user_id', userId!)
        .eq('is_reply', false)
        .gte('created_at_twitter', todayStart)
        .lte('created_at_twitter', todayEnd)
        .order('created_at_twitter', { ascending: false })

      if (error) {
        console.warn('[XG] tweets_cache query failed:', error.message)
        return []
      }
      return (data ?? []) as CachedTweet[]
    },
  })

  // Today's replies sent (from tweets_cache, is_reply=true)
  const { data: todayReplies = [], isLoading: isLoadingReplies } = useQuery({
    queryKey: ['cached-tweets', userId, 'replies', today],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tweets_cache')
        .select('*')
        .eq('user_id', userId!)
        .eq('is_reply', true)
        .gte('created_at_twitter', todayStart)
        .lte('created_at_twitter', todayEnd)
        .order('created_at_twitter', { ascending: false })

      if (error) {
        console.warn('[XG] tweets_cache replies query failed:', error.message)
        return []
      }
      return (data ?? []) as CachedTweet[]
    },
  })

  // Recent tweets — last 48h (UI display fallback when today is empty)
  const { data: recentTweets = [] } = useQuery({
    queryKey: ['cached-tweets', userId, 'recent-tweets'],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tweets_cache')
        .select('*')
        .eq('user_id', userId!)
        .eq('is_reply', false)
        .gte('created_at_twitter', recent48hStart)
        .order('created_at_twitter', { ascending: false })
        .limit(20)

      if (error) {
        console.warn('[XG] recent tweets query failed:', error.message)
        return []
      }
      return (data ?? []) as CachedTweet[]
    },
  })

  // Recent replies — last 48h (UI display fallback)
  const { data: recentReplies = [] } = useQuery({
    queryKey: ['cached-tweets', userId, 'recent-replies'],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tweets_cache')
        .select('*')
        .eq('user_id', userId!)
        .eq('is_reply', true)
        .gte('created_at_twitter', recent48hStart)
        .order('created_at_twitter', { ascending: false })
        .limit(20)

      if (error) {
        console.warn('[XG] recent replies query failed:', error.message)
        return []
      }
      return (data ?? []) as CachedTweet[]
    },
  })

  // Received tweets / inbox - TODAY ONLY (from received_tweets table)
  const { data: receivedTweets = [], isLoading: isLoadingReceived } = useQuery({
    queryKey: ['received-tweets', userId, today],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('received_tweets')
        .select('*')
        .eq('user_id', userId!)
        .gte('created_at_twitter', todayStart)
        .lte('created_at_twitter', todayEnd)
        .order('created_at_twitter', { ascending: false })
        .limit(100)

      if (error) {
        console.warn('[XG] received_tweets query failed:', error.message)
        return []
      }
      return (data ?? []) as ReceivedTweet[]
    },
  })

  // Data age: minutes since the most recent cached tweet
  const dataAge = useMemo(() => {
    const all = [...todayTweets, ...todayReplies, ...recentTweets, ...recentReplies]
    if (all.length === 0) return null
    const sorted = all.sort(
      (a, b) => new Date(b.created_at_twitter).getTime() - new Date(a.created_at_twitter).getTime()
    )
    return Math.round((Date.now() - new Date(sorted[0].created_at_twitter).getTime()) / 60000)
  }, [todayTweets, todayReplies, recentTweets, recentReplies])

  return {
    todayTweets,
    todayReplies,
    recentTweets,
    recentReplies,
    receivedTweets,
    dataAge,
    isLoading: isLoadingTweets || isLoadingReplies || isLoadingReceived,
  }
}

/**
 * Fetches received_tweets (inbox) for a full goal period instead of just today.
 * periodStartDate: 'yyyy-MM-dd' — start of the current challenge/goal window.
 * Falls back to last 7 days when no goal duration is active.
 */
export function useInboxTweets(userId: string | undefined, periodStartDate: string) {
  return useQuery({
    queryKey: ['received-tweets', userId, periodStartDate],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('received_tweets')
        .select('*')
        .eq('user_id', userId!)
        .gte('created_at_twitter', new Date(periodStartDate + 'T00:00:00').toISOString())
        .order('created_at_twitter', { ascending: false })
        .limit(500)

      if (error) {
        console.warn('[XG] received_tweets period query failed:', error.message)
        return []
      }
      return (data ?? []) as ReceivedTweet[]
    },
  })
}

export function useUserBadges(userId: string | undefined) {
  return useQuery({
    queryKey: ['user-badges', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_badges')
        .select('*, badges(*)')
        .eq('user_id', userId!)

      if (error) throw error
      return data ?? []
    },
  })
}

export function useAllBadges() {
  return useQuery({
    queryKey: ['badges'],
    staleTime: Infinity,
    queryFn: async () => {
      const { data, error } = await supabase.from('badges').select('*').order('threshold')
      if (error) throw error
      return data ?? []
    },
  })
}
