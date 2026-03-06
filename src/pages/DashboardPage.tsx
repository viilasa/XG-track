import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw, ChevronRight } from 'lucide-react'
import { formatDistanceToNow, format, subDays } from 'date-fns'
import { useAuth } from '@/hooks/useAuth'
import { useGoals } from '@/hooks/useGoals'
import { useStreaks } from '@/hooks/useStreaks'
import { useDailyStats } from '@/hooks/useDailyStats'
import { useTwitterData } from '@/hooks/useTwitterData'
import { useSync } from '@/hooks/useSync'
import { useFollowerSnapshots } from '@/hooks/useFollowerSnapshots'
// import { useManualCounter } from '@/hooks/useManualCounter'
import { StreakCard } from '@/components/ui/StreakCard'
import { GoalProgress } from '@/components/ui/GoalProgress'
import { StatCard } from '@/components/ui/StatCard'
import { CachedTweetCard } from '@/components/ui/TweetCard'
import { ChallengeCard } from '@/components/ui/ChallengeCard'
// import { ManualCounter } from '@/components/ui/ManualCounter'

export function DashboardPage() {
  const { profile, refreshProfile } = useAuth()
  const { goals } = useGoals(profile?.id)
  const { streaks } = useStreaks(profile?.id)
  const { todayStats, recentStats } = useDailyStats(profile?.id)
  const { todayTweets, todayReplies, recentTweets: recentTweetsFull, dataAge, isLoading } = useTwitterData(profile?.id)
  const { forceSync, isSyncing } = useSync()

  // Follower tracking period: challenge start or last 7 days
  const followerPeriodStart = useMemo(() => {
    if (goals?.goal_duration_days != null) {
      const raw = goals.goal_started_at ?? goals.updated_at
      return raw.slice(0, 10)
    }
    return format(subDays(new Date(), 6), 'yyyy-MM-dd')
  }, [goals])
  const { gained: followersGained, currentCount: followerCount } = useFollowerSnapshots(profile?.id, followerPeriodStart)
  // const { manualCount: manualReplies, incrementReply, incrementTweet } = useManualCounter(profile?.id)

  // Get manual tweets count from todayStats (commented out for now)
  // const manualTweets = todayStats?.manual_tweets ?? 0

  const handleSync = async () => {
    if (!profile) return
    await forceSync(profile)
    refreshProfile()
  }

  const lastSynced = profile?.last_synced_at
    ? formatDistanceToNow(new Date(profile.last_synced_at), { addSuffix: true })
    : 'never'

  // Show today's tweets, or fall back to recent cached tweets
  const displayTweets = todayTweets.length > 0 ? todayTweets.slice(0, 3) : recentTweetsFull.slice(0, 3)
  const dataAgeLabel = dataAge !== null
    ? dataAge < 60 ? `${dataAge}m ago` : `${Math.round(dataAge / 60)}h ago`
    : null

  return (
    <div>
      {/* Header */}
      <header className="sticky top-0 z-10 bg-x-bg/80 backdrop-blur-md border-b border-x-border px-4 py-3 flex items-center justify-between">
        <h1 className="text-x-text font-bold text-xl">Dashboard</h1>
        <div className="flex items-center gap-2">
          <span className="text-x-muted text-xs hidden sm:block">
            Synced {lastSynced}{dataAgeLabel && ` · Data: ${dataAgeLabel}`}
          </span>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-x-surface text-x-text text-sm font-semibold hover:bg-x-border transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Syncing...' : 'Sync'}
          </button>
        </div>
      </header>

      <div className="px-4 py-4 space-y-5">
        {/* Data freshness warning */}
        {dataAge !== null && dataAge > 60 && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl px-4 py-3">
            <p className="text-yellow-500 text-sm font-medium">
              ⚠️ Data is {Math.round(dataAge / 60)} hours old
            </p>
            <p className="text-x-muted text-xs mt-1">
              The Twitter API may be returning cached data. Try syncing again later.
            </p>
          </div>
        )}

        {/* Greeting */}
        <div className="pt-1">
          <p className="text-x-muted text-sm">
            {getGreeting()}, {profile?.twitter_name?.split(' ')[0] ?? 'there'} 👋
          </p>
          <p className="text-x-text text-[15px] mt-0.5">
            {getTodayMotivation(streaks?.current_reply_streak ?? 0)}
          </p>
        </div>

        {/* Streak cards */}
        <section>
          <h2 className="text-x-text font-bold mb-3">Your Streaks</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StreakCard
              label="Reply Streak"
              current={streaks?.current_reply_streak ?? 0}
              longest={streaks?.longest_reply_streak ?? 0}
              icon="🔥"
              color="orange"
              active={(streaks?.current_reply_streak ?? 0) > 0}
            />
            <StreakCard
              label="Tweet Streak"
              current={streaks?.current_tweet_streak ?? 0}
              longest={streaks?.longest_tweet_streak ?? 0}
              icon="⚡"
              color="blue"
              active={(streaks?.current_tweet_streak ?? 0) > 0}
            />
            {/* <StreakCard
              label="Engagement"
              current={streaks?.current_engagement_streak ?? 0}
              longest={streaks?.longest_engagement_streak ?? 0}
              icon="💪"
              color="green"
              active={(streaks?.current_engagement_streak ?? 0) > 0}
            /> */}
          </div>
        </section>

        {/* Manual Counter - Quick Add (commented out for later use)
        <section>
          <ManualCounter
            repliesCount={manualReplies}
            tweetsCount={manualTweets}
            onAddReply={incrementReply}
            onAddTweet={incrementTweet}
          />
        </section>
        */}

        {/* Today's goals */}
        <section>
          <h2 className="text-x-text font-bold mb-3">Today's Goals</h2>
          <div className="space-y-3">
            {(goals?.track_replies ?? true) && (
              <GoalProgress
                label="Replies Sent"
                current={Math.max(todayStats?.replies_sent ?? 0, todayReplies.length)}
                goal={goals?.replies_per_day ?? 5}
                icon="💬"
                color="blue"
              />
            )}
            {(goals?.track_tweets ?? true) && (
              <GoalProgress
                label="Tweets Posted"
                current={Math.max(todayStats?.tweets_posted ?? 0, todayTweets.length)}
                goal={goals?.tweets_per_day ?? 3}
                icon="📝"
                color="orange"
              />
            )}
          </div>
        </section>

        {/* 7-day (or N-day) challenge */}
        {goals && (goals.goal_duration_days != null) && (
          <ChallengeCard goals={goals} recentStats={recentStats ?? []} followersGained={followersGained} />
        )}

        {/* Weekly score + cleared + followers */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <StatCard
            label="Weekly Score"
            value={streaks?.weekly_streak_score ?? 0}
            sub="goals met this week"
            icon="📊"
            color="blue"
          />
          <StatCard
            label="Followers"
            value={followerCount != null ? followerCount.toLocaleString() : '—'}
            sub={followersGained != null ? `${followersGained >= 0 ? '+' : ''}${followersGained} this period` : 'sync to track'}
            icon="👥"
            color={followersGained != null && followersGained > 0 ? 'green' : 'muted'}
            trend={followersGained != null ? (followersGained > 0 ? 'up' : followersGained < 0 ? 'down' : 'neutral') : undefined}
          />
          <StatCard
            label="Replies Cleared"
            value={todayStats?.replies_cleared ?? 0}
            sub="inbox today"
            icon="✅"
            color="green"
          />
        </section>

        {/* Recent tweets */}
        {displayTweets.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-x-text font-bold">Recent Tweets</h2>
              <Link
                to="/today"
                className="flex items-center gap-1 text-x-blue text-sm hover:underline"
              >
                View all <ChevronRight size={14} />
              </Link>
            </div>
            <div className="bg-x-card border border-x-border rounded-2xl overflow-hidden">
              {displayTweets.map((tweet) => (
                <CachedTweetCard key={tweet.id} tweet={tweet} />
              ))}
            </div>
          </section>
        )}

        {(isLoading || isSyncing) && todayTweets.length === 0 && todayReplies.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <div className="flex items-center gap-2 text-x-muted">
              <RefreshCw size={16} className="animate-spin" />
              <span className="text-sm">
                {isSyncing ? 'Syncing with X...' : 'Loading...'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function getTodayMotivation(streak: number): string {
  if (streak === 0) return 'Start your streak today — post and reply to hit your goals!'
  if (streak === 1) return 'Day 1 complete. Keep going tomorrow to build your streak!'
  if (streak < 7) return `${streak} day streak! Keep the momentum going.`
  if (streak < 30) return `${streak} days strong! You\'re on a roll.`
  if (streak < 100) return `Incredible — ${streak} days! You\'re among the top creators.`
  return `${streak} days. Legendary.`
}
