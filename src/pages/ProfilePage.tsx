import { useState } from 'react'
import { format } from 'date-fns'
import { LogOut, Target, ExternalLink } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { useGoals } from '@/hooks/useGoals'
import { GoalModal } from '@/components/modals/GoalModal'

export function ProfilePage() {
  const { profile, signOut } = useAuth()
  const { goals, saveGoals } = useGoals(profile?.id)
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
