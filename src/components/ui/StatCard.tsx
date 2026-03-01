import clsx from 'clsx'

interface StatCardProps {
  label: string
  value: number | string
  sub?: string
  icon?: string
  trend?: 'up' | 'down' | 'neutral'
  color?: 'blue' | 'green' | 'orange' | 'muted'
}

export function StatCard({
  label,
  value,
  sub,
  icon,
  trend,
  color = 'muted',
}: StatCardProps) {
  const colorMap = {
    blue: 'text-x-blue',
    green: 'text-x-green',
    orange: 'text-orange-400',
    muted: 'text-x-text',
  }

  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : ''
  const trendColor =
    trend === 'up' ? 'text-x-green' : trend === 'down' ? 'text-x-red' : 'text-x-muted'

  return (
    <div className="bg-x-card border border-x-border rounded-2xl p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-x-muted text-xs font-medium uppercase tracking-wide">{label}</span>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <div className="flex items-end gap-2 mt-1">
        <span className={clsx('text-3xl font-black', colorMap[color])}>{value}</span>
        {trend && trendIcon && (
          <span className={clsx('text-sm font-bold mb-0.5', trendColor)}>{trendIcon}</span>
        )}
      </div>
      {sub && <span className="text-x-muted text-xs">{sub}</span>}
    </div>
  )
}
