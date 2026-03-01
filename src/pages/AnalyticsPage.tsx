import { useState } from 'react'
import { format, parseISO, subDays } from 'date-fns'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { useAuth } from '@/hooks/useAuth'
import { useGoals } from '@/hooks/useGoals'
import { useStreaks } from '@/hooks/useStreaks'
import { useDailyStats } from '@/hooks/useDailyStats'
import { StatCard } from '@/components/ui/StatCard'
import type { AnalyticsPeriod, DailyStat } from '@/types'

export function AnalyticsPage() {
  const { profile } = useAuth()
  const { goals } = useGoals(profile?.id)
  const { streaks } = useStreaks(profile?.id)
  const { recentStats } = useDailyStats(profile?.id)
  const [period, setPeriod] = useState<AnalyticsPeriod>('7d')

  const days = period === '7d' ? 7 : 30
  const chartData = buildChartData(recentStats ?? [], days)

  const totalReplies = (recentStats ?? []).reduce((s, r) => s + r.replies_sent, 0)
  const totalTweets = (recentStats ?? []).reduce((s, r) => s + r.tweets_posted, 0)
  const avgReplies =
    (recentStats ?? []).length > 0 ? Math.round(totalReplies / (recentStats ?? []).length) : 0
  const avgTweets =
    (recentStats ?? []).length > 0 ? Math.round(totalTweets / (recentStats ?? []).length) : 0
  const bestDay = getBestDay(recentStats ?? [])

  // Last 7 days grid
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = format(subDays(new Date(), 6 - i), 'yyyy-MM-dd')
    const stat = (recentStats ?? []).find((s) => s.date === d)
    return {
      date: d,
      label: format(parseISO(d), 'EEE'),
      replyMet: stat?.goal_replies_met ?? false,
      tweetMet: stat?.goal_tweets_met ?? false,
    }
  })

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-x-bg/80 backdrop-blur-md border-b border-x-border px-4 py-3 flex items-center justify-between">
        <h1 className="text-x-text font-bold text-xl">Analytics</h1>
        {/* Period toggle */}
        <div className="flex bg-x-surface rounded-full p-0.5 gap-0.5">
          {(['7d', '30d'] as AnalyticsPeriod[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1 rounded-full text-sm font-semibold transition-colors ${
                period === p ? 'bg-x-blue text-white' : 'text-x-muted hover:text-x-text'
              }`}
            >
              {p === '7d' ? '7 days' : '30 days'}
            </button>
          ))}
        </div>
      </header>

      <div className="px-4 py-4 space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <StatCard
            label="Total Replies (30d)"
            value={totalReplies}
            icon="💬"
            color="blue"
            sub={`avg ${avgReplies}/day`}
          />
          <StatCard
            label="Total Tweets (30d)"
            value={totalTweets}
            icon="📝"
            color="orange"
            sub={`avg ${avgTweets}/day`}
          />
          <StatCard
            label="Best Reply Streak"
            value={streaks?.longest_reply_streak ?? 0}
            icon="🔥"
            color="orange"
            sub="days in a row"
          />
          <StatCard
            label="Weekly Score"
            value={streaks?.weekly_streak_score ?? 0}
            icon="📊"
            color="green"
            sub={`of 14 possible pts`}
          />
        </div>

        {bestDay && (
          <div className="bg-x-card border border-x-border rounded-2xl p-4 flex items-center gap-3">
            <span className="text-3xl">🏆</span>
            <div>
              <p className="text-x-muted text-xs uppercase tracking-wide font-medium">Best Day</p>
              <p className="text-x-text font-bold">
                {format(parseISO(bestDay.date), 'EEEE, MMM d')}
              </p>
              <p className="text-x-muted text-sm">
                {bestDay.replies_sent} replies · {bestDay.tweets_posted} tweets
              </p>
            </div>
          </div>
        )}

        {/* Activity Chart */}
        <section>
          <h2 className="text-x-text font-bold mb-4">Daily Activity</h2>
          {chartData.length > 0 ? (
            <div className="bg-x-card border border-x-border rounded-2xl p-4">
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2f3336" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#71767b', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#71767b', fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: '#16181c',
                      border: '1px solid #2f3336',
                      borderRadius: '12px',
                      color: '#e7e9ea',
                    }}
                    labelStyle={{ color: '#71767b', fontSize: 12 }}
                    cursor={{ fill: '#2f3336', radius: 4 }}
                  />
                  <Legend
                    wrapperStyle={{ color: '#71767b', fontSize: 12, paddingTop: '8px' }}
                  />
                  <Bar
                    dataKey="replies"
                    name="Replies"
                    fill="#1d9bf0"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                  />
                  <Bar
                    dataKey="tweets"
                    name="Tweets"
                    fill="#f97316"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={32}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="bg-x-card border border-x-border rounded-2xl p-8 text-center text-x-muted">
              No activity data yet. Start tracking to see your progress!
            </div>
          )}
        </section>

        {/* Last 7 days goal grid */}
        <section>
          <h2 className="text-x-text font-bold mb-3">Last 7 Days</h2>
          <div className="bg-x-card border border-x-border rounded-2xl p-4">
            <div className="flex gap-2 justify-between">
              {last7.map((day) => (
                <div key={day.date} className="flex flex-col items-center gap-1.5 flex-1">
                  <span className="text-x-muted text-xs">{day.label}</span>
                  {/* Reply dot */}
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      day.replyMet ? 'bg-x-blue/20 text-x-blue' : 'bg-x-surface text-x-muted'
                    }`}
                    title="Replies"
                  >
                    💬
                  </div>
                  {/* Tweet dot */}
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                      day.tweetMet ? 'bg-orange-500/20 text-orange-400' : 'bg-x-surface text-x-muted'
                    }`}
                    title="Tweets"
                  >
                    📝
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-x-muted">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-x-blue/20 inline-block" /> Reply goal
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-orange-500/20 inline-block" /> Tweet goal
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 rounded-full bg-x-surface inline-block" /> Not met
              </span>
            </div>
          </div>
        </section>

        {/* Goals reference */}
        {goals && (
          <div className="bg-x-card border border-x-border rounded-2xl p-4 space-y-2">
            <h3 className="text-x-text font-bold text-sm">Your Current Goals</h3>
            <div className="flex gap-6 flex-wrap">
              {(goals.track_replies ?? true) && (
                <div>
                  <p className="text-x-muted text-xs">Daily Replies</p>
                  <p className="text-x-blue font-bold text-xl">{goals.replies_per_day}</p>
                </div>
              )}
              {(goals.track_tweets ?? true) && (
                <div>
                  <p className="text-x-muted text-xs">Daily Tweets</p>
                  <p className="text-orange-400 font-bold text-xl">{goals.tweets_per_day}</p>
                </div>
              )}
            </div>
            {goals.goal_duration_days != null && (
              <p className="text-x-muted text-xs pt-1">
                Duration: {goals.goal_duration_days} days
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function buildChartData(stats: DailyStat[], days: number) {
  return Array.from({ length: days }, (_, i) => {
    const d = format(subDays(new Date(), days - 1 - i), 'yyyy-MM-dd')
    const stat = stats.find((s) => s.date === d)
    return {
      label: format(parseISO(d), days <= 7 ? 'EEE' : 'MM/dd'),
      replies: stat?.replies_sent ?? 0,
      tweets: stat?.tweets_posted ?? 0,
    }
  })
}

function getBestDay(stats: DailyStat[]): DailyStat | null {
  if (stats.length === 0) return null
  return stats.reduce((best, s) =>
    s.replies_sent + s.tweets_posted > best.replies_sent + best.tweets_posted ? s : best,
  )
}
