import clsx from 'clsx'

interface StreakCardProps {
  label: string
  current: number
  longest: number
  icon: string
  color?: 'orange' | 'blue' | 'green'
  active?: boolean
}

export function StreakCard({
  label,
  current,
  longest,
  icon,
  color = 'orange',
  active = false,
}: StreakCardProps) {
  const colorStyles = {
    orange: {
      glow: 'shadow-orange-500/20',
      text: 'text-orange-400',
      badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
      bar: 'bg-orange-500',
    },
    blue: {
      glow: 'shadow-x-blue/20',
      text: 'text-x-blue',
      badge: 'bg-x-blue/10 text-x-blue border-x-blue/20',
      bar: 'bg-x-blue',
    },
    green: {
      glow: 'shadow-x-green/20',
      text: 'text-x-green',
      badge: 'bg-x-green/10 text-x-green border-x-green/20',
      bar: 'bg-x-green',
    },
  }[color]

  const isActive = current > 0 && active

  return (
    <div
      className={clsx(
        'bg-x-card border border-x-border rounded-2xl p-5 flex flex-col gap-3',
        'transition-all duration-200',
        isActive && `shadow-lg ${colorStyles.glow}`,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-x-muted text-sm font-medium">{label}</span>
        <span className="text-2xl">{icon}</span>
      </div>

      {/* Current streak */}
      <div className="flex items-end gap-2">
        <span
          className={clsx(
            'text-5xl font-black leading-none',
            current > 0 ? colorStyles.text : 'text-x-muted',
          )}
        >
          {current}
        </span>
        <span className="text-x-muted text-sm mb-1">days</span>
      </div>

      {/* Progress bar (relative to longest) */}
      {longest > 0 && (
        <div className="space-y-1">
          <div className="h-1.5 bg-x-border rounded-full overflow-hidden">
            <div
              className={clsx('h-full rounded-full transition-all duration-500', colorStyles.bar)}
              style={{ width: `${Math.min(100, (current / longest) * 100)}%` }}
            />
          </div>
        </div>
      )}

      {/* Best streak */}
      <div className="flex items-center justify-between">
        <span className="text-x-muted text-xs">Best</span>
        <span
          className={clsx(
            'text-xs px-2 py-0.5 rounded-full border font-medium',
            colorStyles.badge,
          )}
        >
          {longest} days
        </span>
      </div>
    </div>
  )
}
