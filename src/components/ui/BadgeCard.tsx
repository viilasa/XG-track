import { format } from 'date-fns'
import { Share2 } from 'lucide-react'
import clsx from 'clsx'
import { shareBadgeOnX } from '@/lib/shareCard'
import type { Badge, UserBadge } from '@/types'

interface BadgeCardProps {
  badge: Badge
  userBadge?: UserBadge
  streakProgress?: number // current streak for this category
  userName?: string // @handle for share card
}

export function BadgeCard({ badge, userBadge, streakProgress = 0, userName }: BadgeCardProps) {
  const earned = !!userBadge
  const pct = badge.threshold > 0 ? Math.min(100, (streakProgress / badge.threshold) * 100) : 0
  const remaining = badge.threshold - streakProgress

  const handleShare = () => {
    if (!userBadge) return
    shareBadgeOnX({
      badgeIcon: badge.icon,
      badgeName: badge.name,
      badgeDescription: badge.description,
      earnedDate: format(new Date(userBadge.earned_at), 'MMM d, yyyy'),
      userName: userName ?? '',
    })
  }

  return (
    <div
      className={clsx(
        'bg-x-card border rounded-2xl p-5 flex flex-col items-center gap-3 text-center transition-all duration-200',
        earned
          ? 'border-x-blue/40 shadow-lg shadow-x-blue/10'
          : 'border-x-border opacity-60',
      )}
    >
      {/* Icon */}
      <div
        className={clsx(
          'w-16 h-16 rounded-full flex items-center justify-center text-3xl',
          earned ? 'bg-x-blue/10' : 'bg-x-border/30',
        )}
      >
        {earned ? badge.icon : '🔒'}
      </div>

      {/* Name */}
      <div>
        <p
          className={clsx(
            'font-bold text-[15px]',
            earned ? 'text-x-text' : 'text-x-muted',
          )}
        >
          {badge.name}
        </p>
        <p className="text-x-muted text-xs mt-0.5">{badge.description}</p>
      </div>

      {/* Status */}
      {earned && userBadge ? (
        <div className="flex flex-col items-center gap-2">
          <span className="text-x-green text-xs font-medium flex items-center gap-1">
            ✓ Earned {format(new Date(userBadge.earned_at), 'MMM d, yyyy')}
          </span>
          <button
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-x-blue/10 text-x-blue text-xs font-semibold hover:bg-x-blue/20 transition-colors"
          >
            <Share2 size={12} />
            Share
          </button>
        </div>
      ) : (
        <div className="w-full space-y-1">
          <div className="h-1.5 bg-x-border rounded-full overflow-hidden">
            <div
              className="h-full bg-x-blue/50 rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-x-muted text-xs">
            {remaining > 0 ? `${remaining} days to go` : 'Almost there!'}
          </p>
        </div>
      )}
    </div>
  )
}
