import clsx from 'clsx'

interface GoalProgressProps {
  label: string
  current: number
  goal: number
  icon: string
  color?: 'blue' | 'green' | 'orange'
}

export function GoalProgress({ label, current, goal, icon, color = 'blue' }: GoalProgressProps) {
  const pct = goal > 0 ? Math.min(100, Math.round((current / goal) * 100)) : 0
  const isComplete = current >= goal

  const colorStyles = {
    blue: {
      ring: 'text-x-blue',
      bg: 'text-x-border',
      badge: 'bg-x-blue/10 text-x-blue',
      glow: isComplete ? 'shadow-x-blue/30' : '',
    },
    green: {
      ring: 'text-x-green',
      bg: 'text-x-border',
      badge: 'bg-x-green/10 text-x-green',
      glow: isComplete ? 'shadow-x-green/30' : '',
    },
    orange: {
      ring: 'text-orange-400',
      bg: 'text-x-border',
      badge: 'bg-orange-500/10 text-orange-400',
      glow: isComplete ? 'shadow-orange-500/30' : '',
    },
  }[color]

  const radius = 36
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (pct / 100) * circumference

  return (
    <div
      className={clsx(
        'bg-x-card border border-x-border rounded-2xl p-5 flex items-center gap-5',
        'transition-all duration-200',
        isComplete && `shadow-lg ${colorStyles.glow}`,
      )}
    >
      {/* Circular progress */}
      <div className="relative flex-shrink-0">
        <svg width="88" height="88" className="-rotate-90">
          {/* Background ring */}
          <circle
            cx="44"
            cy="44"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            className={colorStyles.bg}
          />
          {/* Progress ring */}
          <circle
            cx="44"
            cy="44"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            className={clsx(colorStyles.ring, 'transition-all duration-700 ease-out')}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl">{icon}</span>
          <span className="text-x-text font-bold text-sm leading-none">{pct}%</span>
        </div>
      </div>

      {/* Text info */}
      <div className="flex-1">
        <p className="text-x-muted text-sm font-medium">{label}</p>
        <p className="text-x-text text-3xl font-black mt-1">
          {current}
          <span className="text-x-muted text-base font-normal">/{goal}</span>
        </p>
        <div className="mt-2">
          {isComplete ? (
            <span className={clsx('text-xs px-2 py-0.5 rounded-full font-semibold', colorStyles.badge)}>
              Goal achieved! 🎉
            </span>
          ) : (
            <span className="text-x-muted text-xs">
              {goal - current} more to reach goal
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
