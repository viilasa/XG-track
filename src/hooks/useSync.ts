import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { fetchAllTweets, fetchMentions } from '@/lib/twitterApi'
import { format } from 'date-fns'
import { calculateStreak, todayString } from '@/lib/streakUtils'
import type { Profile } from '@/types'

const SYNC_COOLDOWN_MS = 5 * 60 * 1000 // 5 minutes

export function useSync() {
  const qc = useQueryClient()
  const [isSyncing, setSyncing] = useState(false)

  const sync = useCallback(
    async (profile: Profile, force = false) => {
      if (!profile.twitter_id) {
        console.warn('[XG] Cannot sync: twitter_id is null')
        return
      }
      if (!profile.twitter_username) {
        console.warn('[XG] Cannot sync: twitter_username is null (needed for mentions)')
      }

      // Cooldown check (skip if force)
      if (!force && profile.last_synced_at) {
        const elapsed = Date.now() - new Date(profile.last_synced_at).getTime()
        if (elapsed < SYNC_COOLDOWN_MS) {
          console.log('[XG] Sync skipped: last synced', Math.round(elapsed / 1000), 's ago')
          return
        }
      }

      setSyncing(true)
      try {
        // ── Step 1: Fetch from API ──────────────────────────────────────────
        const allTweets = await fetchAllTweets(
          profile.twitter_id,
          profile.twitter_username ?? undefined,
        )

        // Rate limit: wait 5s before second call
        await new Promise((r) => setTimeout(r, 5500))
        const mentions = profile.twitter_username
          ? await fetchMentions(profile.twitter_username, profile.twitter_id)
          : []

        // ── Step 2: Save user's tweets to tweets_cache ──────────────────────
        if (allTweets.length > 0) {
          const rows = allTweets.map((t) => ({
            user_id: profile.id,
            tweet_id: t.id,
            tweet_text: t.text ?? '',
            author_name: t.author?.name ?? '',
            author_username: t.author?.userName ?? '',
            author_avatar: t.author?.profilePicture ?? '',
            is_reply: !!(t.isReply || t.inReplyToStatusId || t.inReplyToId),
            in_reply_to_id: t.inReplyToStatusId ?? t.inReplyToId ?? null,
            reply_count: t.replyCount ?? 0,
            retweet_count: t.retweetCount ?? 0,
            like_count: t.likeCount ?? 0,
            view_count: t.viewCount ?? 0,
            is_blue_verified: t.author?.isBlueVerified ?? false,
            created_at_twitter: t.createdAt ? new Date(t.createdAt).toISOString() : null,
            fetched_at: new Date().toISOString(),
          }))

          const { error: upsertErr } = await supabase
            .from('tweets_cache')
            .upsert(rows, { onConflict: 'user_id,tweet_id', ignoreDuplicates: false })
          if (upsertErr) {
            console.error('[XG] tweets_cache upsert failed:', upsertErr)
          } else if (import.meta.env.DEV) {
            const replyCount = rows.filter((r) => r.is_reply).length
            console.log(`[XG] Saved ${rows.length} to tweets_cache (${replyCount} replies)`)
          }
        }

        // ── Step 3: Save mentions to received_tweets ────────────────────────
        if (mentions.length > 0) {
          const mentionRows = mentions.map((t) => ({
            user_id: profile.id,
            tweet_id: t.id,
            tweet_text: t.text,
            author_name: t.author.name,
            author_username: t.author.userName,
            author_avatar: t.author.profilePicture,
            created_at_twitter: t.createdAt ? new Date(t.createdAt).toISOString() : null,
            fetched_at: new Date().toISOString(),
          }))

          const { error: mentionsErr } = await supabase
            .from('received_tweets')
            .upsert(mentionRows, { onConflict: 'user_id,tweet_id', ignoreDuplicates: true })
          
          if (mentionsErr) {
            console.error('[XG] received_tweets upsert failed:', mentionsErr)
          } else if (import.meta.env.DEV) {
            console.log(`[XG] Saved ${mentionRows.length} to received_tweets`)
          }
        }

        // ── Step 3.5: Auto-clear received tweets that user has replied to ────
        // Get all tweet IDs that the user has replied to (from their own replies)
        const repliedToIds = allTweets
          .filter((t) => t.isReply || t.inReplyToStatusId || t.inReplyToId)
          .map((t) => t.inReplyToStatusId ?? t.inReplyToId)
          .filter((id): id is string => !!id)

        if (repliedToIds.length > 0) {
          // Mark received tweets as cleared if user has replied to them
          const { error: clearError } = await supabase
            .from('received_tweets')
            .update({ is_cleared: true, cleared_at: new Date().toISOString() })
            .eq('user_id', profile.id)
            .in('tweet_id', repliedToIds)
            .eq('is_cleared', false)

          if (clearError) {
            console.warn('[XG] Auto-clear received_tweets failed:', clearError.message)
          } else if (import.meta.env.DEV) {
            console.log(`[XG] Auto-cleared received tweets (replied to ${repliedToIds.length} tweet IDs)`)
          }
        }

        // ── Step 4: Recount stats for today AND recent past days ─────────────
        // This ensures that if you sync after midnight, yesterday's data
        // (tweeted before midnight) is still counted and streaks are preserved.
        const today = todayString()

        // Get goals (needed for all days)
        const { data: goals } = await supabase
          .from('goals')
          .select('replies_per_day, tweets_per_day, track_replies, track_tweets')
          .eq('user_id', profile.id)
          .maybeSingle()

        const trackReplies = goals?.track_replies ?? true
        const trackTweets = goals?.track_tweets ?? true
        const replyGoal = goals?.replies_per_day ?? 5
        const tweetGoal = goals?.tweets_per_day ?? 3

        // Build list of days to recount: past days first (oldest→newest), then today
        // Processing oldest first ensures streak calculations build correctly
        const daysToRecount: string[] = []
        for (let i = 2; i >= 0; i--) {
          const d = new Date()
          d.setDate(d.getDate() - i)
          daysToRecount.push(format(d, 'yyyy-MM-dd'))
        }

        let todayReplyGoalMet = false
        let todayTweetGoalMet = false

        for (const day of daysToRecount) {
          const dayDate = new Date(day + 'T00:00:00')
          const dayStart = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 0, 0, 0, 0).toISOString()
          const dayEnd = new Date(dayDate.getFullYear(), dayDate.getMonth(), dayDate.getDate(), 23, 59, 59, 999).toISOString()

          const { count: tweetsCount } = await supabase
            .from('tweets_cache')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', profile.id)
            .eq('is_reply', false)
            .gte('created_at_twitter', dayStart)
            .lte('created_at_twitter', dayEnd)

          const { count: repliesCount } = await supabase
            .from('tweets_cache')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', profile.id)
            .eq('is_reply', true)
            .gte('created_at_twitter', dayStart)
            .lte('created_at_twitter', dayEnd)

          const { count: receivedCount } = await supabase
            .from('received_tweets')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', profile.id)
            .gte('created_at_twitter', dayStart)
            .lte('created_at_twitter', dayEnd)

          const { count: clearedCount } = await supabase
            .from('received_tweets')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', profile.id)
            .eq('is_cleared', true)
            .gte('created_at_twitter', dayStart)
            .lte('created_at_twitter', dayEnd)

          const tweets = tweetsCount ?? 0
          const replies = repliesCount ?? 0
          const received = receivedCount ?? 0
          const cleared = clearedCount ?? 0

          // Skip past days that have zero activity (no tweets in cache)
          if (day !== today && tweets === 0 && replies === 0 && received === 0) {
            continue
          }

          const replyGoalMet = trackReplies ? replies >= replyGoal : false
          const tweetGoalMet = trackTweets ? tweets >= tweetGoal : false

          if (day === today) {
            todayReplyGoalMet = replyGoalMet
            todayTweetGoalMet = tweetGoalMet
          }

          const statsRow = {
            user_id: profile.id,
            date: day,
            replies_sent: replies,
            tweets_posted: tweets,
            replies_received: received,
            replies_cleared: cleared,
            goal_replies_met: replyGoalMet,
            goal_tweets_met: tweetGoalMet,
            updated_at: new Date().toISOString(),
          }

          const { error: upsertError } = await supabase
            .from('daily_stats')
            .upsert(statsRow, { onConflict: 'user_id,date' })

          if (upsertError) {
            console.error(`[XG] daily_stats upsert failed for ${day}:`, upsertError.message)
          } else if (import.meta.env.DEV) {
            console.log(`[XG] daily_stats upserted for ${day}: ${replies} replies, ${tweets} tweets`)
          }

          // Update streaks for past days too (so yesterday's goal counts)
          if (day !== today && (replyGoalMet || tweetGoalMet)) {
            await updateStreaksForDate(profile.id, replyGoalMet, tweetGoalMet, day)
          }
        }

        // ── Step 6: Update streaks for today ────────────────────────────────
        await updateStreaksIfNeeded(profile.id, todayReplyGoalMet, todayTweetGoalMet)

        // ── Step 7: Update last_synced_at ───────────────────────────────────
        await supabase
          .from('profiles')
          .update({ last_synced_at: new Date().toISOString() })
          .eq('id', profile.id)

        // ── Step 8: Invalidate all React Query caches ───────────────────────
        qc.invalidateQueries({ queryKey: ['cached-tweets'] })
        qc.invalidateQueries({ queryKey: ['received-tweets'] })
        qc.invalidateQueries({ queryKey: ['daily-stats'] })
        qc.invalidateQueries({ queryKey: ['recent-stats'] })
        qc.invalidateQueries({ queryKey: ['streaks'] })
        qc.invalidateQueries({ queryKey: ['user-badges'] })
      } catch (err) {
        console.error('[XG] Sync failed:', err)
      } finally {
        setSyncing(false)
      }
    },
    [qc],
  )

  const forceSync = useCallback(
    (profile: Profile) => sync(profile, true),
    [sync],
  )

  return { sync, forceSync, isSyncing }
}

// ─── Streak update helper ────────────────────────────────────────────────────

/**
 * Update streaks for a past date (e.g. yesterday).
 * Processes dates in chronological order so streak calculation is correct.
 */
async function updateStreaksForDate(
  userId: string,
  replyGoalMet: boolean,
  tweetGoalMet: boolean,
  dateStr: string,
) {
  if (!replyGoalMet && !tweetGoalMet) return

  const { data: current } = await supabase
    .from('streaks')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  let replyStreak = current?.current_reply_streak ?? 0
  let tweetStreak = current?.current_tweet_streak ?? 0
  let engStreak = current?.current_engagement_streak ?? 0
  let lastReplyDate = current?.last_reply_date ?? null
  let lastTweetDate = current?.last_tweet_date ?? null

  // Only update if this date hasn't been processed yet
  // (avoid double-counting if last_*_date is already >= dateStr)
  if (replyGoalMet && (!lastReplyDate || lastReplyDate < dateStr)) {
    replyStreak = calculateStreak(lastReplyDate, replyStreak, dateStr)
    lastReplyDate = dateStr
  }

  if (tweetGoalMet && (!lastTweetDate || lastTweetDate < dateStr)) {
    tweetStreak = calculateStreak(lastTweetDate, tweetStreak, dateStr)
    lastTweetDate = dateStr
  }

  if (replyGoalMet && tweetGoalMet) {
    const lastEngDate = current?.last_reply_date ?? null
    if (!lastEngDate || lastEngDate < dateStr) {
      engStreak = calculateStreak(lastEngDate, engStreak, dateStr)
    }
  }

  await supabase.from('streaks').upsert(
    {
      user_id: userId,
      current_reply_streak: replyStreak,
      current_tweet_streak: tweetStreak,
      current_engagement_streak: engStreak,
      longest_reply_streak: Math.max(current?.longest_reply_streak ?? 0, replyStreak),
      longest_tweet_streak: Math.max(current?.longest_tweet_streak ?? 0, tweetStreak),
      longest_engagement_streak: Math.max(current?.longest_engagement_streak ?? 0, engStreak),
      last_reply_date: lastReplyDate,
      last_tweet_date: lastTweetDate,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
}

async function updateStreaksIfNeeded(
  userId: string,
  replyGoalMet: boolean,
  tweetGoalMet: boolean,
) {
  if (!replyGoalMet && !tweetGoalMet) return

  const today = todayString()

  const { data: current, error: streakError } = await supabase
    .from('streaks')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (streakError) {
    console.warn('[XG] streaks select failed:', streakError.message)
  }

  let replyStreak = current?.current_reply_streak ?? 0
  let tweetStreak = current?.current_tweet_streak ?? 0
  let engStreak = current?.current_engagement_streak ?? 0
  let lastReplyDate = current?.last_reply_date ?? null
  let lastTweetDate = current?.last_tweet_date ?? null

  if (replyGoalMet && lastReplyDate !== today) {
    replyStreak = calculateStreak(lastReplyDate, replyStreak, today)
    lastReplyDate = today
  }

  if (tweetGoalMet && lastTweetDate !== today) {
    tweetStreak = calculateStreak(lastTweetDate, tweetStreak, today)
    lastTweetDate = today
  }

  if (replyGoalMet && tweetGoalMet) {
    const lastEngDate = current?.last_reply_date ?? null
    engStreak = calculateStreak(lastEngDate, engStreak, today)
  }

  // Compute weekly score
  const { data: weekStats } = await supabase
    .from('daily_stats')
    .select('goal_replies_met, goal_tweets_met')
    .eq('user_id', userId)
    .gte('date', new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10))

  let weeklyScore = 0
  for (const s of weekStats ?? []) {
    if (s.goal_replies_met && s.goal_tweets_met) weeklyScore += 2
    else if (s.goal_replies_met || s.goal_tweets_met) weeklyScore += 1
  }

  await supabase.from('streaks').upsert(
    {
      user_id: userId,
      current_reply_streak: replyStreak,
      current_tweet_streak: tweetStreak,
      current_engagement_streak: engStreak,
      longest_reply_streak: Math.max(current?.longest_reply_streak ?? 0, replyStreak),
      longest_tweet_streak: Math.max(current?.longest_tweet_streak ?? 0, tweetStreak),
      longest_engagement_streak: Math.max(current?.longest_engagement_streak ?? 0, engStreak),
      weekly_streak_score: weeklyScore,
      last_reply_date: lastReplyDate,
      last_tweet_date: lastTweetDate,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )

  // Award badges
  const badges: Array<{ id: string; met: boolean }> = [
    { id: 'reply_streak_7', met: replyStreak >= 7 },
    { id: 'reply_streak_30', met: replyStreak >= 30 },
    { id: 'reply_streak_100', met: replyStreak >= 100 },
    { id: 'tweet_streak_7', met: tweetStreak >= 7 },
    { id: 'tweet_streak_30', met: tweetStreak >= 30 },
    { id: 'tweet_streak_100', met: tweetStreak >= 100 },
  ]

  for (const b of badges) {
    if (b.met) {
      await supabase
        .from('user_badges')
        .upsert({ user_id: userId, badge_id: b.id }, { onConflict: 'user_id,badge_id' })
    }
  }
}
