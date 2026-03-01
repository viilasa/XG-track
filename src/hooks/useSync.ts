import { useState, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { fetchAllTweets, fetchMentions } from '@/lib/twitterApi'
import { calculateStreak, todayString, todayBoundsUTC } from '@/lib/streakUtils'
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
        // ── Step 1: Fetch from API (2 calls total) ──────────────────────────
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

        // ── Step 4: Recount today's stats from DB ───────────────────────────
        const today = todayString()
        const { start: todayStart, end: todayEnd } = todayBoundsUTC()

        if (import.meta.env.DEV) {
          console.log('[XG] Today bounds:', { today, todayStart, todayEnd })
          console.log('[XG] Current time:', new Date().toISOString())
          // Log the dates of fetched tweets to debug filtering
          const replyDates = allTweets
            .filter((t) => t.isReply || t.inReplyToStatusId || t.inReplyToId)
            .map((t) => ({ id: t.id, createdAt: t.createdAt, text: t.text?.slice(0, 30) }))
          console.log('[XG] All fetched replies with dates:', replyDates)
          
          // Count how many are within today bounds
          const todayReplies = replyDates.filter((r) => {
            const d = new Date(r.createdAt)
            return d >= new Date(todayStart) && d <= new Date(todayEnd)
          })
          console.log(`[XG] Replies within today bounds: ${todayReplies.length} of ${replyDates.length}`)
        }

        const { count: tweetsCount } = await supabase
          .from('tweets_cache')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', profile.id)
          .eq('is_reply', false)
          .gte('created_at_twitter', todayStart)
          .lte('created_at_twitter', todayEnd)

        const { count: repliesCount } = await supabase
          .from('tweets_cache')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', profile.id)
          .eq('is_reply', true)
          .gte('created_at_twitter', todayStart)
          .lte('created_at_twitter', todayEnd)

        const { count: receivedCount } = await supabase
          .from('received_tweets')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', profile.id)
          .gte('created_at_twitter', todayStart)
          .lte('created_at_twitter', todayEnd)

        // Count cleared received tweets (auto-cleared when user replied)
        const { count: clearedCount } = await supabase
          .from('received_tweets')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', profile.id)
          .eq('is_cleared', true)
          .gte('created_at_twitter', todayStart)
          .lte('created_at_twitter', todayEnd)

        const tweets = tweetsCount ?? 0
        const replies = repliesCount ?? 0
        const received = receivedCount ?? 0
        const cleared = clearedCount ?? 0

        // ── Step 5: Upsert daily_stats ──────────────────────────────────────
        // Get goals to check completion
        const { data: goals } = await supabase
          .from('goals')
          .select('replies_per_day, tweets_per_day, track_replies, track_tweets')
          .eq('user_id', profile.id)
          .maybeSingle()

        const trackReplies = goals?.track_replies ?? true
        const trackTweets = goals?.track_tweets ?? true
        const replyGoal = goals?.replies_per_day ?? 5
        const tweetGoal = goals?.tweets_per_day ?? 3
        const replyGoalMet = trackReplies ? replies >= replyGoal : false
        const tweetGoalMet = trackTweets ? tweets >= tweetGoal : false

        const statsRow = {
          user_id: profile.id,
          date: today, // Format: YYYY-MM-DD
          replies_sent: replies,
          tweets_posted: tweets,
          replies_received: received,
          replies_cleared: cleared,
          goal_replies_met: replyGoalMet,
          goal_tweets_met: tweetGoalMet,
          updated_at: new Date().toISOString(),
        }

        if (import.meta.env.DEV) {
          console.log('[XG] Upserting daily_stats:', statsRow)
        }

        const { error: upsertError } = await supabase
          .from('daily_stats')
          .upsert(statsRow, { onConflict: 'user_id,date' })

        if (upsertError) {
          console.error('[XG] daily_stats upsert failed:', {
            code: upsertError.code,
            message: upsertError.message,
            details: upsertError.details,
            hint: upsertError.hint,
          })
          console.error(
            '[XG] If you see PGRST204 (column not found), run the migration SQL in Supabase:\n' +
              '  supabase-migration-daily-stats.sql',
          )
        } else if (import.meta.env.DEV) {
          console.log('[XG] daily_stats upsert success')
        }

        // ── Step 6: Update streaks if goals met ─────────────────────────────
        await updateStreaksIfNeeded(profile.id, replyGoalMet, tweetGoalMet)

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

        if (import.meta.env.DEV) {
          console.log('[XG] ═══════════════════════════════════════════════════')
          console.log('[XG] SYNC SUMMARY:')
          console.log(`[XG]   API fetched: ${allTweets.length} tweets/replies, ${mentions.length} mentions`)
          console.log(`[XG]   Today's stats (from DB):`)
          console.log(`[XG]     - Tweets posted: ${tweets}`)
          console.log(`[XG]     - Replies sent: ${replies}`)
          console.log(`[XG]     - Mentions received: ${received}`)
          console.log(`[XG]     - Mentions cleared: ${cleared}`)
          console.log(`[XG]   Goals: reply=${replyGoalMet ? '✓' : '✗'} (${replies}/${replyGoal}), tweet=${tweetGoalMet ? '✓' : '✗'} (${tweets}/${tweetGoal})`)
          console.log('[XG] ═══════════════════════════════════════════════════')
        } else {
          console.log(
            `[XG] Sync complete: ${tweets} tweets, ${replies} replies, ${received} received`,
          )
        }
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
