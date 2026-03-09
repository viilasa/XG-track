import { X, Trophy, Star, Target } from 'lucide-react'
import clsx from 'clsx'

interface GoalCompletionModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateNew: () => void
  daysCompleted: number
  totalDays: number
  isPerfect: boolean
  followersGained?: number | null
}

export function GoalCompletionModal({
  isOpen,
  onClose,
  onCreateNew,
  daysCompleted,
  totalDays,
  isPerfect,
  followersGained,
}: GoalCompletionModalProps) {
  if (!isOpen) return null

  const completionRate = Math.round((daysCompleted / totalDays) * 100)
  const isGreat = completionRate >= 80
  const isGood = completionRate >= 50

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-x-card border border-x-border rounded-2xl p-6 max-w-sm w-full animate-in zoom-in-95 fade-in duration-300">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-x-muted hover:text-x-text transition-colors"
        >
          <X size={20} />
        </button>

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className={clsx(
            'w-20 h-20 rounded-full flex items-center justify-center',
            isPerfect ? 'bg-yellow-500/20' : isGreat ? 'bg-x-green/20' : 'bg-x-blue/20'
          )}>
            {isPerfect ? (
              <Star className="text-yellow-500" size={40} fill="currentColor" />
            ) : isGreat ? (
              <Trophy className="text-x-green" size={40} />
            ) : (
              <Target className="text-x-blue" size={40} />
            )}
          </div>
        </div>

        {/* Title */}
        <h2 className="text-x-text text-xl font-bold text-center mb-2">
          {isPerfect ? '🌟 Perfect Challenge!' : isGreat ? '🎉 Challenge Complete!' : '✅ Challenge Finished'}
        </h2>

        {/* Subtitle */}
        <p className="text-x-muted text-center text-sm mb-6">
          {isPerfect 
            ? 'You hit your goal every single day!' 
            : isGreat 
              ? 'Great job staying consistent!'
              : 'You gave it your best shot!'}
        </p>

        {/* Stats */}
        <div className="bg-x-surface rounded-xl p-4 space-y-3 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-x-muted text-sm">Days Completed</span>
            <span className="text-x-text font-bold">
              {daysCompleted} / {totalDays}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-x-muted text-sm">Completion Rate</span>
            <span className={clsx(
              'font-bold',
              isPerfect ? 'text-yellow-500' : isGreat ? 'text-x-green' : isGood ? 'text-x-blue' : 'text-x-muted'
            )}>
              {completionRate}%
            </span>
          </div>
          {followersGained != null && (
            <div className="flex justify-between items-center">
              <span className="text-x-muted text-sm">Followers Gained</span>
              <span className={clsx(
                'font-bold',
                followersGained > 0 ? 'text-x-green' : followersGained < 0 ? 'text-x-red' : 'text-x-muted'
              )}>
                {followersGained >= 0 ? '+' : ''}{followersGained}
              </span>
            </div>
          )}
        </div>

        {/* Badges earned */}
        {isPerfect && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 mb-6 text-center">
            <span className="text-yellow-500 text-sm font-medium">
              ⭐ Perfect Week badge unlocked!
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={onCreateNew}
            className="w-full py-3 rounded-full bg-x-blue text-white font-bold hover:bg-x-blue/90 transition-colors"
          >
            Start New Challenge
          </button>
          <button
            onClick={onClose}
            className="w-full py-3 rounded-full bg-x-surface text-x-text font-medium hover:bg-x-border transition-colors"
          >
            View History
          </button>
        </div>
      </div>
    </div>
  )
}
