import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { GoalModal } from '@/components/modals/GoalModal'
import { useAuth } from '@/hooks/useAuth'
import { useGoals } from '@/hooks/useGoals'

export function Layout() {
  const { profile, signOut } = useAuth()
  const { goals, saveGoals } = useGoals(profile?.id)
  const [goalModalOpen, setGoalModalOpen] = useState(false)

  return (
    <div className="min-h-screen bg-x-bg text-x-text flex flex-col lg:flex-row pb-16 lg:pb-0">
      {/* Left sidebar (desktop only) */}
      <div className="hidden lg:flex sticky top-0 h-screen flex-shrink-0 w-[68px] xl:w-[275px] border-r border-x-border flex-col overflow-y-auto">
        <Sidebar
          profile={profile}
          onSignOut={signOut}
          onSetGoals={() => setGoalModalOpen(true)}
          variant="desktop"
        />
      </div>

      {/* Main content */}
      <main className="flex-1 min-w-0 max-w-[600px] lg:border-r lg:border-x-border min-h-screen w-full">
        <Outlet />
      </main>

      {/* Right sidebar (desktop only) */}
      <div className="hidden lg:block flex-1 max-w-[350px] min-w-0">
        <div className="sticky top-0 p-4">
          <RightSidebar profile={profile} />
        </div>
      </div>

      {/* Bottom nav (mobile only) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-x-bg/95 backdrop-blur-md border-t border-x-border safe-area-pb">
        <Sidebar
          profile={profile}
          onSignOut={signOut}
          onSetGoals={() => setGoalModalOpen(true)}
          variant="mobile"
        />
      </div>

      {/* Goal Modal */}
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

function RightSidebar({ profile }: { profile: ReturnType<typeof useAuth>['profile'] }) {
  return (
    <div className="space-y-4">
      {/* Search-like box */}
      <div className="bg-x-surface rounded-full px-4 py-3 flex items-center gap-3">
        <svg className="w-5 h-5 text-x-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <span className="text-x-muted text-sm">Search your activity</span>
      </div>

      {/* Info card */}
      <div className="bg-x-surface rounded-2xl p-4 space-y-3 border border-x-border">
        <h3 className="text-x-text font-bold text-xl">XG Tracker</h3>
        <p className="text-x-muted text-sm leading-relaxed">
          Track your X growth goals, build streaks, and earn badges by staying consistent every day.
        </p>
        {profile && (
          <div className="flex items-center gap-2 pt-1">
            <img
              src={profile.twitter_avatar ?? ''}
              alt=""
              className="w-8 h-8 rounded-full"
            />
            <div>
              <p className="text-x-text text-sm font-semibold">{profile.twitter_name}</p>
              <p className="text-x-muted text-xs">@{profile.twitter_username}</p>
            </div>
          </div>
        )}
      </div>

      {/* Footer links */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 px-1">
        {['Terms', 'Privacy', 'About'].map((link) => (
          <span key={link} className="text-x-muted text-xs hover:underline cursor-pointer">
            {link}
          </span>
        ))}
        <span className="text-x-muted text-xs">© 2026 XG Tracker</span>
      </div>
    </div>
  )
}
