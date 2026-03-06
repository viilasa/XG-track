import { useState } from 'react'
import { differenceInDays, format, addDays, parseISO } from 'date-fns'
import clsx from 'clsx'
import type { Goal, DailyStat } from '@/types'

interface ChallengeCardProps {
  goals: Goal
  recentStats: DailyStat[]
}

interface DayInfo {
  dateStr: string
  label: string
  dayLabel: string
  isPast: boolean
  isToday: boolean
  isFuture: boolean
  goalMet: boolean
  dayNum: number
  stat: DailyStat | undefined
}

export function ChallengeCard({ goals, recentStats }: ChallengeCardProps) {
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  if (!goals.goal_duration_days) return null

  const duration = goals.goal_duration_days
  const todayStr = format(new Date(), 'yyyy-MM-dd')

  const startStr = goals.goal_started_at
    ? goals.goal_started_at.slice(0, 10)
    : goals.updated_at.slice(0, 10)
  const startDate = parseISO(startStr)

  const daysElapsed = differenceInDays(new Date(), startDate)

  if (daysElapsed < 0 || daysElapsed > duration * 3) return null

  const displayDays = Math.min(duration, 30)
  const daysRemaining = Math.max(0, duration - daysElapsed - 1)
  const isOver = daysElapsed >= duration

  const trackReplies = goals.track_replies ?? true
  const trackTweets = goals.track_tweets ?? true

  const days: DayInfo[] = Array.from({ length: displayDays }, (_, i) => {
    const date = addDays(startDate, i)
    const dateStr = format(date, 'yyyy-MM-dd')
    const stat = recentStats.find((s) => s.date === dateStr)
    const isPast = dateStr < todayStr
    const isToday = dateStr === todayStr
    const isFuture = dateStr > todayStr

    let goalMet = false
    if (stat) {
      if (trackReplies && trackTweets) {
        goalMet = (stat.goal_replies_met ?? false) && (stat.goal_tweets_met ?? false)
      } else if (trackReplies) {
        goalMet = stat.goal_replies_met ?? false
      } else if (trackTweets) {
        goalMet = stat.goal_tweets_met ?? false
      }
    }

    return {
      dateStr,
      label: format(date, 'EEE'),
      dayLabel: format(date, 'MMM d'),
      isPast,
      isToday,
      isFuture,
      goalMet,
      dayNum: i + 1,
      stat,
    }
  })

  const completedDays = days.filter((d) => d.goalMet).length
  const progressPct = Math.round((completedDays / duration) * 100)

  const selected = selectedDay ? days.find((d) => d.dateStr === selectedDay) : null

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
          <button
            key={day.dateStr}
            onClick={() => setSelectedDay(selectedDay === day.dateStr ? null : day.dateStr)}
            className="flex flex-col items-center gap-0.5 group"
          >
            <div
              title={`${day.dateStr}${day.goalMet ? ' — goal met' : day.isPast ? ' — missed' : ''}`}
              className={clsx(
                'w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold border transition-all',
                'group-hover:scale-110 group-active:scale-95 cursor-pointer',
                day.goalMet
                  ? 'bg-x-green/20 text-x-green border-x-green/40'
                  : day.isToday
                    ? 'bg-x-blue/10 text-x-blue border-x-blue/50 ring-1 ring-x-blue/50'
                    : day.isPast
                      ? 'bg-x-red/10 text-x-red/60 border-x-red/20'
                      : 'bg-x-surface text-x-muted border-x-border',
                selectedDay === day.dateStr && 'ring-2 ring-x-blue scale-110',
              )}
            >
              {day.goalMet ? '✓' : day.isToday ? '·' : day.isPast ? '✗' : day.dayNum}
            </div>
            <span className="text-x-muted text-[9px]">{day.label}</span>
          </button>
        ))}
      </div>

      {/* Selected day detail panel */}
      {selected && (
        <DayDetailPanel
          day={selected}
          goals={goals}
          trackReplies={trackReplies}
          trackTweets={trackTweets}
          onClose={() => setSelectedDay(null)}
        />
      )}

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

// ─── Day Detail Panel ──────────────────────────────────────────────────────────

function DayDetailPanel({
  day,
  goals,
  trackReplies,
  trackTweets,
  onClose,
}: {
  day: DayInfo
  goals: Goal
  trackReplies: boolean
  trackTweets: boolean
  onClose: () => void
}) {
  const stat = day.stat
  const repliesSent = stat?.replies_sent ?? 0
  const tweetsPosted = stat?.tweets_posted ?? 0
  const replyGoal = goals.replies_per_day ?? 5
  const tweetGoal = goals.tweets_per_day ?? 3

  const statusLabel = day.goalMet
    ? 'Goal Met'
    : day.isToday
      ? 'In Progress'
      : day.isPast
        ? 'Missed'
        : 'Upcoming'

  const statusColor = day.goalMet
    ? 'text-x-green'
    : day.isToday
      ? 'text-x-blue'
      : day.isPast
        ? 'text-x-red'
        : 'text-x-muted'

  return (
    <div className="bg-x-surface/50 border border-x-border rounded-xl p-3 space-y-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
      {/* Day header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-x-text font-bold text-sm">
            Day {day.dayNum} — {day.dayLabel}
          </span>
          <span className={clsx('text-xs font-semibold px-2 py-0.5 rounded-full', statusColor,
            day.goalMet ? 'bg-x-green/10' : day.isToday ? 'bg-x-blue/10' : day.isPast ? 'bg-x-red/10' : 'bg-x-surface',
          )}>
            {statusLabel}
          </span>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onClose() }}
          className="text-x-muted hover:text-x-text text-sm px-1.5 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Goal counters */}
      <div className="grid grid-cols-2 gap-2">
        {trackReplies && (
          <GoalCounter
            label="Replies"
            current={repliesSent}
            goal={replyGoal}
            met={stat?.goal_replies_met ?? false}
            icon="💬"
          />
        )}
        {trackTweets && (
          <GoalCounter
            label="Tweets"
            current={tweetsPosted}
            goal={tweetGoal}
            met={stat?.goal_tweets_met ?? false}
            icon="📝"
          />
        )}
      </div>

      {/* Extra stats if available */}
      {stat && (stat.replies_received > 0 || stat.replies_cleared > 0) && (
        <div className="flex gap-3 text-xs text-x-muted pt-1 border-t border-x-border/50">
          {stat.replies_received > 0 && (
            <span>📥 {stat.replies_received} received</span>
          )}
          {stat.replies_cleared > 0 && (
            <span>✅ {stat.replies_cleared} cleared</span>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Goal Counter ──────────────────────────────────────────────────────────────

function GoalCounter({
  label,
  current,
  goal,
  met,
  icon,
}: {
  label: string
  current: number
  goal: number
  met: boolean
  icon: string
}) {
  const pct = goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : 0

  return (
    <div className={clsx(
      'rounded-lg p-2.5 border transition-colors',
      met ? 'bg-x-green/5 border-x-green/30' : 'bg-x-card border-x-border',
    )}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-x-muted text-xs font-medium flex items-center gap-1">
          <span>{icon}</span> {label}
        </span>
        {met && <span className="text-x-green text-[10px] font-bold">✓ MET</span>}
      </div>
      <div className="flex items-baseline gap-1">
        <span className={clsx('text-xl font-black', met ? 'text-x-green' : 'text-x-text')}>
          {current}
        </span>
        <span className="text-x-muted text-sm">/ {goal}</span>
      </div>
      {/* Mini progress bar */}
      <div className="w-full bg-x-border rounded-full h-1 mt-1.5 overflow-hidden">
        <div
          className={clsx(
            'h-1 rounded-full transition-all duration-300',
            met ? 'bg-x-green' : 'bg-x-blue',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
