import { NavLink, useNavigate } from 'react-router-dom'
import {
  Home,
  Calendar,
  Inbox,
  BarChart2,
  Trophy,
  LogOut,
  Target,
} from 'lucide-react'
import clsx from 'clsx'
import type { Profile } from '@/types'

interface SidebarProps {
  profile: Profile | null
  onSignOut: () => void
  onSetGoals: () => void
  variant?: 'desktop' | 'mobile'
}

const NAV_ITEMS = [
  { to: '/', icon: Home, label: 'Dashboard', labelShort: 'Home' },
  { to: '/today', icon: Calendar, label: 'Today', labelShort: 'Today' },
  { to: '/inbox', icon: Inbox, label: 'Inbox', labelShort: 'Inbox' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics', labelShort: 'Stats' },
  { to: '/achievements', icon: Trophy, label: 'Achievements', labelShort: 'Badges' },
]

export function Sidebar({ profile, onSignOut, onSetGoals, variant = 'desktop' }: SidebarProps) {
  const navigate = useNavigate()
  if (variant === 'mobile') {
    return (
      <nav className="flex items-center justify-around py-2 px-1 gap-0.5 overflow-x-auto safe-area-pb">
        {NAV_ITEMS.map(({ to, icon: Icon, labelShort }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={() => {}}
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center gap-1 py-2 px-3 rounded-xl min-w-[48px] transition-colors',
                isActive ? 'text-x-blue font-semibold' : 'text-x-muted',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium whitespace-nowrap">{labelShort}</span>
              </>
            )}
          </NavLink>
        ))}
        <button
          onClick={onSetGoals}
          className="flex flex-col items-center gap-1 py-2 px-3 rounded-xl min-w-[48px] text-x-muted hover:text-x-text transition-colors"
        >
          <Target size={22} strokeWidth={2} />
          <span className="text-[10px] font-medium">Goals</span>
        </button>
      </nav>
    )
  }

  return (
    <aside className="flex flex-col h-full py-2">
      {/* X Logo */}
      <div className="px-3 py-2 mb-2">
        <button
          onClick={() => navigate('/')}
          className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-x-surface transition-colors"
        >
          <svg viewBox="0 0 24 24" className="w-7 h-7 fill-x-text" aria-label="X">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-2">
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-4 px-3 py-3.5 rounded-full transition-colors group w-full',
                isActive
                  ? 'font-bold text-x-text'
                  : 'text-x-text hover:bg-x-surface font-normal',
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  size={26}
                  className={clsx(
                    'flex-shrink-0',
                    isActive ? 'text-x-text' : 'text-x-text group-hover:text-x-text',
                  )}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                <span className="text-[20px] hidden xl:block">{label}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* Set Goals button */}
        <button
          onClick={onSetGoals}
          className="flex items-center gap-4 px-3 py-3.5 rounded-full transition-colors group w-full text-x-text hover:bg-x-surface"
        >
          <Target size={26} className="flex-shrink-0" strokeWidth={2} />
          <span className="text-[20px] hidden xl:block">Set Goals</span>
        </button>
      </nav>

      {/* User profile at bottom */}
      {profile && (
        <div className="px-2 mt-2 space-y-1">
          <button
            onClick={onSignOut}
            className="flex items-center gap-4 px-3 py-3 rounded-full hover:bg-x-surface transition-colors w-full text-x-muted hover:text-x-red group"
          >
            <LogOut size={22} className="flex-shrink-0" strokeWidth={2} />
            <span className="text-base hidden xl:block">Sign out</span>
          </button>

          <div className="flex items-center gap-3 px-3 py-3 rounded-full hover:bg-x-surface transition-colors cursor-pointer">
            <img
              src={profile.twitter_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.twitter_name ?? 'U')}&background=1d9bf0&color=fff&size=40`}
              alt={profile.twitter_name ?? 'User'}
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            />
            <div className="hidden xl:block min-w-0">
              <p className="text-x-text font-bold text-sm truncate">{profile.twitter_name}</p>
              <p className="text-x-muted text-sm truncate">@{profile.twitter_username}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
