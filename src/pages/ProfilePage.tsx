import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { LogOut, Target, ExternalLink, Trophy } from 'lucide-react'
import clsx from 'clsx'
import { useAuth } from '@/hooks/useAuth'
import { useGoals } from '@/hooks/useGoals'
import { useGoalHistory } from '@/hooks/useGoalHistory'
import { GoalModal } from '@/components/modals/GoalModal'
import type { GoalHistory } from '@/types'

export function ProfilePage() {
  const { profile, signOut } = useAuth()
  const { goals, saveGoals } = useGoals(profile?.id)
  const { history } = useGoalHistory(profile?.id)
  const [goalModalOpen, setGoalModalOpen] = useState(false)

  if (!profile) return null

  const memberSince = profile.created_at
    ? format(new Date(profile.created_at), 'MMMM yyyy')
    : null

  const lastSynced = profile.last_synced_at
    ? format(new Date(profile.last_synced_at), 'MMM d, h:mm a')
    : 'Never'

  return (
    <div>
      <header className="sticky top-0 z-10 bg-x-bg/80 backdrop-blur-md border-b border-x-border px-4 py-3">
        <h1 className="text-x-text font-bold text-xl">Profile</h1>
      </header>

      <div className="px-4 py-6 space-y-6">
        {/* Avatar + name */}
        <div className="flex flex-col items-center text-center">
          <img
            src={
              profile.twitter_avatar ||
              `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.twitter_name ?? 'U')}&background=1d9bf0&color=fff&size=96`
            }
            alt={profile.twitter_name ?? 'User'}
            className="w-24 h-24 rounded-full object-cover border-2 border-x-border"
          />
          <h2 className="text-x-text font-bold text-xl mt-3">
            {profile.twitter_name}
          </h2>
          <p className="text-x-muted text-sm">@{profile.twitter_username}</p>
        </div>

        {/* Info cards */}
        <div className="bg-x-card border border-x-border rounded-2xl divide-y divide-x-border">
          {memberSince && (
            <div className="px-4 py-3 flex justify-between items-center">
              <span className="text-x-muted text-sm">Member since</span>
              <span className="text-x-text text-sm font-medium">{memberSince}</span>
            </div>
          )}
          <div className="px-4 py-3 flex justify-between items-center">
            <span className="text-x-muted text-sm">Last synced</span>
            <span className="text-x-text text-sm font-medium">{lastSynced}</span>
          </div>
          <a
            href={`https://x.com/${profile.twitter_username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-3 flex justify-between items-center hover:bg-x-surface transition-colors"
          >
            <span className="text-x-muted text-sm">View on X</span>
            <ExternalLink size={16} className="text-x-muted" />
          </a>
        </div>

        {/* Actions */}
        <div className="space-y-3">
          <button
            onClick={() => setGoalModalOpen(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-full bg-x-blue text-white font-bold hover:bg-x-blue/90 transition-colors"
          >
            <Target size={18} />
            Set Goals
          </button>

          <button
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-full border border-x-border text-x-red font-bold hover:bg-x-red/10 transition-colors"
          >
            <LogOut size={18} />
            Sign Out
          </button>
        </div>
      </div>

      {/* Goal History */}
      {history.length > 0 && (
        <div className="px-4 pb-6 space-y-3">
          <h2 className="text-x-text font-bold flex items-center gap-2">
            <Trophy size={18} className="text-x-blue" />
            Goal History
          </h2>
          <div className="space-y-2">
            {history.map((h) => (
              <GoalHistoryItem key={h.id} item={h} />
            ))}
          </div>
        </div>
      )}

      <GoalModal
        open={goalModalOpen}
        onClose={() => setGoalModalOpen(false)}
        current={goals}
        onSave={(data) => {
          saveGoals.mutate(data)
          setGoalModalOpen(false)
        }}
        isSaving={saveGoals.isPending}
      />
    </div>
  )
}

function GoalHistoryItem({ item }: { item: GoalHistory }) {
  const pct = item.total_days > 0 ? Math.round((item.days_completed / item.total_days) * 100) : 0
  const startLabel = item.goal_started_at
    ? format(parseISO(item.goal_started_at.slice(0, 10)), 'MMM d')
    : '—'
  const endLabel = format(new Date(item.ended_at), 'MMM d')

  const reasonLabel = item.ended_reason === 'completed' ? 'Completed'
    : item.ended_reason === 'replaced' ? 'Replaced'
    : 'Abandoned'

  const reasonColor = item.ended_reason === 'completed' ? 'text-x-green bg-x-green/10'
    : item.ended_reason === 'replaced' ? 'text-orange-400 bg-orange-500/10'
    : 'text-x-red bg-x-red/10'

  return (
    <div className="bg-x-card border border-x-border rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-x-text font-bold text-sm">
            {item.goal_duration_days}-Day Challenge
          </span>
          <span className={clsx('text-[10px] font-semibold px-2 py-0.5 rounded-full', reasonColor)}>
            {reasonLabel}
          </span>
        </div>
        <span className="text-x-muted text-xs">{startLabel} — {endLabel}</span>
      </div>
      <div className="flex items-center gap-3 text-xs text-x-muted">
        {item.track_replies && <span>💬 {item.replies_per_day}/day</span>}
        {item.track_tweets && <span>📝 {item.tweets_per_day}/day</span>}
        <span className="ml-auto text-x-text font-semibold">
          {item.days_completed}/{item.total_days} days ({pct}%)
        </span>
      </div>
      <div className="w-full bg-x-surface rounded-full h-1 overflow-hidden">
        <div
          className={clsx(
            'h-1 rounded-full transition-all',
            item.ended_reason === 'completed' ? 'bg-x-green' : 'bg-x-blue',
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
