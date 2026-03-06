import { useAuth } from '@/hooks/useAuth'
import { useStreaks } from '@/hooks/useStreaks'
import { useUserBadges, useAllBadges } from '@/hooks/useTwitterData'
import { useDailyStats } from '@/hooks/useDailyStats'
import { useGoalHistory } from '@/hooks/useGoalHistory'
import { BadgeCard } from '@/components/ui/BadgeCard'
import type { Badge, UserBadge } from '@/types'

export function AchievementsPage() {
  const { profile } = useAuth()
  const { streaks } = useStreaks(profile?.id)
  const { data: userBadges = [] } = useUserBadges(profile?.id)
  const { data: allBadges = [] } = useAllBadges()
  const { recentStats } = useDailyStats(profile?.id)
  const { history } = useGoalHistory(profile?.id)

  const totalCleared = (recentStats ?? []).reduce((s, r) => s + r.replies_cleared, 0)
  const completedGoals = history.filter((h) => h.ended_reason === 'completed').length

  const earnedMap = new Map<string, UserBadge>(
    (userBadges as UserBadge[]).map((ub) => [ub.badge_id, ub]),
  )

  const replyBadges = (allBadges as Badge[]).filter((b) => b.category === 'reply_streak')
  const tweetBadges = (allBadges as Badge[]).filter((b) => b.category === 'tweet_streak')
  const inboxBadges = (allBadges as Badge[]).filter((b) => b.category === 'inbox')
  const goalBadges = (allBadges as Badge[]).filter((b) => b.category === 'goal')

  const earnedCount = (userBadges as UserBadge[]).length
  const totalBadges = (allBadges as Badge[]).length
  const userName = profile?.twitter_username ?? ''

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-x-bg/80 backdrop-blur-md border-b border-x-border px-4 py-3">
        <h1 className="text-x-text font-bold text-xl">Achievements</h1>
        <p className="text-x-muted text-xs mt-0.5">
          {earnedCount} of {totalBadges} badges earned
        </p>
      </header>

      {/* Progress bar */}
      {totalBadges > 0 && (
        <div className="px-4 py-3 border-b border-x-border">
          <div className="h-2 bg-x-border rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-x-blue to-purple-500 rounded-full transition-all duration-700"
              style={{ width: `${(earnedCount / totalBadges) * 100}%` }}
            />
          </div>
        </div>
      )}

      <div className="px-4 py-4 space-y-8">
        {/* Goal Challenge Badges */}
        {goalBadges.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">🏆</span>
              <h2 className="text-x-text font-bold text-lg">Goal Challenge Badges</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {goalBadges.map((badge) => (
                <BadgeCard
                  key={badge.id}
                  badge={badge}
                  userBadge={earnedMap.get(badge.id)}
                  streakProgress={badge.id === 'goal_perfect' ? 0 : completedGoals}
                  userName={userName}
                />
              ))}
            </div>
          </section>
        )}

        {/* Reply Streak Badges */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">🔥</span>
            <h2 className="text-x-text font-bold text-lg">Reply Streak Badges</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {replyBadges.map((badge) => (
              <BadgeCard
                key={badge.id}
                badge={badge}
                userBadge={earnedMap.get(badge.id)}
                streakProgress={streaks?.current_reply_streak ?? 0}
                userName={userName}
              />
            ))}
          </div>
        </section>

        {/* Tweet Streak Badges */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">⚡</span>
            <h2 className="text-x-text font-bold text-lg">Tweet Streak Badges</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {tweetBadges.map((badge) => (
              <BadgeCard
                key={badge.id}
                badge={badge}
                userBadge={earnedMap.get(badge.id)}
                streakProgress={streaks?.current_tweet_streak ?? 0}
                userName={userName}
              />
            ))}
          </div>
        </section>

        {/* Inbox Badges */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">✅</span>
            <h2 className="text-x-text font-bold text-lg">Inbox Mastery</h2>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {inboxBadges.map((badge) => (
              <BadgeCard
                key={badge.id}
                badge={badge}
                userBadge={earnedMap.get(badge.id)}
                streakProgress={totalCleared}
                userName={userName}
              />
            ))}
          </div>
        </section>

        {/* Summary card */}
        <div className="bg-x-card border border-x-border rounded-2xl p-5 space-y-3">
          <h3 className="text-x-text font-bold">Your Progress</h3>
          <div className="grid grid-cols-4 gap-3 text-center">
            <div>
              <p className="text-x-blue font-black text-2xl">{streaks?.current_reply_streak ?? 0}</p>
              <p className="text-x-muted text-xs">Reply Streak</p>
            </div>
            <div>
              <p className="text-orange-400 font-black text-2xl">{streaks?.current_tweet_streak ?? 0}</p>
              <p className="text-x-muted text-xs">Tweet Streak</p>
            </div>
            <div>
              <p className="text-x-green font-black text-2xl">{totalCleared}</p>
              <p className="text-x-muted text-xs">Replies Cleared</p>
            </div>
            <div>
              <p className="text-purple-400 font-black text-2xl">{completedGoals}</p>
              <p className="text-x-muted text-xs">Goals Done</p>
            </div>
          </div>
        </div>

        {earnedCount === 0 && (
          <div className="text-center py-8 text-x-muted">
            <p className="text-4xl mb-3">🏆</p>
            <p className="font-semibold text-x-text">No badges yet</p>
            <p className="text-sm mt-1">Complete your daily goals to earn your first badge!</p>
          </div>
        )}
      </div>
    </div>
  )
}
