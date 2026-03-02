import { differenceInDays, format, addDays, parseISO } from 'date-fns'
import type { Goal, DailyStat } from '@/types'

interface ChallengeCardProps {
  goals: Goal
  recentStats: DailyStat[]
}

export function ChallengeCard({ goals, recentStats }: ChallengeCardProps) {
  if (!goals.goal_duration_days) return null

  const duration = goals.goal_duration_days
  const todayStr = format(new Date(), 'yyyy-MM-dd')

  // Use goal_started_at if available, otherwise fall back to updated_at
  const startStr = goals.goal_started_at
    ? goals.goal_started_at.slice(0, 10)
    : goals.updated_at.slice(0, 10)
  const startDate = parseISO(startStr)

  const daysElapsed = differenceInDays(new Date(), startDate)

  // If challenge hasn't started yet or elapsed is way past (> 3x duration), don't show
  if (daysElapsed < 0 || daysElapsed > duration * 3) return null

  // clamp display to the duration window
  const displayDays = Math.min(duration, 30) // cap at 30 to avoid enormous grids
  const daysRemaining = Math.max(0, duration - daysElapsed - 1)
  const isOver = daysElapsed >= duration

  // Build per-day status
  const days = Array.from({ length: displayDays }, (_, i) => {
    const date = addDays(startDate, i)
    const dateStr = format(date, 'yyyy-MM-dd')
    const stat = recentStats.find((s) => s.date === dateStr)
    const isPast = dateStr < todayStr
    const isToday = dateStr === todayStr
    const isFuture = dateStr > todayStr

    let goalMet = false
    if (stat) {
      const trackReplies = goals.track_replies ?? true
      const trackTweets = goals.track_tweets ?? true
      if (trackReplies && trackTweets) {
        goalMet = (stat.goal_replies_met ?? false) && (stat.goal_tweets_met ?? false)
      } else if (trackReplies) {
        goalMet = stat.goal_replies_met ?? false
      } else if (trackTweets) {
        goalMet = stat.goal_tweets_met ?? false
      }
    }

    return { dateStr, label: format(date, 'EEE'), isPast, isToday, isFuture, goalMet, dayNum: i + 1 }
  })

  const completedDays = days.filter((d) => d.goalMet).length
  const progressPct = Math.round((completedDays / duration) * 100)

  return (
    <div className="bg-x-card border border-x-border rounded-2xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-x-muted text-xs uppercase tracking-wide font-medium">Challenge</p>
          <h3 className="text-x-text font-bold text-[15px]">{duration}-Day Goal Challenge</h3>
        </div>
        <span className="text-2xl">🎯</span>
      </div>

      {/* Day grid */}
      <div className="flex gap-1.5 flex-wrap">
        {days.map((day) => (
          <div key={day.dateStr} className="flex flex-col items-center gap-0.5">
            <div
              title={`${day.dateStr}${day.goalMet ? ' — goal met ✓' : day.isPast ? ' — missed' : ''}`}
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold border transition-colors ${
                day.goalMet
                  ? 'bg-x-green/20 text-x-green border-x-green/40'
                  : day.isToday
                    ? 'bg-x-blue/10 text-x-blue border-x-blue/50 ring-1 ring-x-blue/50'
                    : day.isPast
                      ? 'bg-x-red/10 text-x-red/60 border-x-red/20'
                      : 'bg-x-surface text-x-muted border-x-border'
              }`}
            >
              {day.goalMet ? '✓' : day.isToday ? '·' : day.isPast ? '✗' : day.dayNum}
            </div>
            <span className="text-x-muted text-[9px]">{day.label}</span>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="w-full bg-x-surface rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-x-green h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between text-sm">
        <span className="text-x-text">
          <span className="font-bold text-x-green">{completedDays}</span>
          <span className="text-x-muted"> / {duration} days done</span>
        </span>
        {isOver ? (
          <span className="text-x-green font-semibold text-xs">Challenge complete! 🎉</span>
        ) : daysRemaining === 0 ? (
          <span className="text-x-blue font-semibold text-xs">Last day — finish strong! 🔥</span>
        ) : (
          <span className="text-x-blue font-semibold text-xs">
            {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} to finish
          </span>
        )}
      </div>
    </div>
  )
}
