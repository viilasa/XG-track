import { useState, useEffect } from 'react'
import { X, Check } from 'lucide-react'
import type { Goal } from '@/types'

interface GoalModalProps {
  open: boolean
  onClose: () => void
  current: Goal | undefined
  onSave: (data: {
    replies_per_day: number
    tweets_per_day: number
    goal_duration_days?: number | null
    track_replies?: boolean
    track_tweets?: boolean
  }) => void
  isSaving?: boolean
}

const DURATION_PRESETS = [
  { value: 7, label: '7 days' },
  { value: 14, label: '14 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: null, label: 'No end date' },
]

export function GoalModal({ open, onClose, current, onSave, isSaving }: GoalModalProps) {
  const [replies, setReplies] = useState(current?.replies_per_day ?? 5)
  const [tweets, setTweets] = useState(current?.tweets_per_day ?? 3)
  const [durationDays, setDurationDays] = useState<number | null>(
    current?.goal_duration_days ?? null,
  )
  const [trackReplies, setTrackReplies] = useState(current?.track_replies ?? true)
  const [trackTweets, setTrackTweets] = useState(current?.track_tweets ?? true)

  useEffect(() => {
    if (open) {
      setReplies(current?.replies_per_day ?? 5)
      setTweets(current?.tweets_per_day ?? 3)
      setDurationDays(current?.goal_duration_days ?? null)
      setTrackReplies(current?.track_replies ?? true)
      setTrackTweets(current?.track_tweets ?? true)
    }
  }, [open, current])

  const handleSave = () => {
    onSave({
      replies_per_day: replies,
      tweets_per_day: tweets,
      goal_duration_days: durationDays,
      track_replies: trackReplies,
      track_tweets: trackTweets,
    })
  }

  const canSave = trackReplies || trackTweets

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-x-card border border-x-border rounded-2xl w-full max-w-md mx-4 shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-x-border">
          <h2 className="text-x-text font-bold text-xl">Set Daily Goals</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-x-surface text-x-muted hover:text-x-text transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-6">
          {/* Which goals to track — checkboxes */}
          <div className="space-y-3">
            <label className="text-x-text font-semibold block">
              Track these goals
            </label>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setTrackReplies(!trackReplies)}
                className="flex items-center gap-3 p-3 rounded-xl border border-x-border hover:bg-x-surface/50 cursor-pointer transition-colors text-left w-full"
              >
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                    trackReplies
                      ? 'bg-x-blue border-x-blue text-white'
                      : 'border-x-border'
                  }`}
                >
                  {trackReplies && <Check size={12} strokeWidth={3} />}
                </div>
                <span className="text-x-text">Daily Replies</span>
                <span className="text-x-muted text-sm ml-auto">💬</span>
              </button>
              <button
                type="button"
                onClick={() => setTrackTweets(!trackTweets)}
                className="flex items-center gap-3 p-3 rounded-xl border border-x-border hover:bg-x-surface/50 cursor-pointer transition-colors text-left w-full"
              >
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${
                    trackTweets
                      ? 'bg-orange-500 border-orange-500 text-white'
                      : 'border-x-border'
                  }`}
                >
                  {trackTweets && <Check size={12} strokeWidth={3} />}
                </div>
                <span className="text-x-text">Daily Tweets</span>
                <span className="text-x-muted text-sm ml-auto">📝</span>
              </button>
            </div>
            <p className="text-x-muted text-xs">
              Check one or both. Both = track replies and tweets.
            </p>
          </div>

          {/* Duration */}
          <div className="space-y-3">
            <label className="text-x-text font-semibold block">
              Continue for how many days?
            </label>
            <div className="flex gap-2 flex-wrap">
              {DURATION_PRESETS.map(({ value, label }) => (
                <button
                  key={label}
                  onClick={() => setDurationDays(value)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                    durationDays === value
                      ? 'bg-x-blue text-white border-x-blue'
                      : 'border-x-border text-x-muted hover:border-x-blue hover:text-x-blue'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Replies Goal — only if tracking replies */}
          {trackReplies && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-x-text font-semibold">
                  Daily Replies Goal 💬
                </label>
                <span className="text-x-blue font-bold text-lg">{replies}</span>
              </div>
              <input
                type="range"
                min={1}
                max={200}
                value={replies}
                onChange={(e) => setReplies(Number(e.target.value))}
                className="w-full h-1.5 bg-x-border rounded-full appearance-none cursor-pointer accent-x-blue"
              />
              <div className="flex gap-2 flex-wrap">
                {[5, 10, 25, 50, 100].map((v) => (
                  <button
                    key={v}
                    onClick={() => setReplies(v)}
                    className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                      replies === v
                        ? 'bg-x-blue text-white border-x-blue'
                        : 'border-x-border text-x-muted hover:border-x-blue hover:text-x-blue'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tweets Goal — only if tracking tweets */}
          {trackTweets && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-x-text font-semibold">
                  Daily Tweets Goal 📝
                </label>
                <span className="text-orange-400 font-bold text-lg">{tweets}</span>
              </div>
              <input
                type="range"
                min={1}
                max={50}
                value={tweets}
                onChange={(e) => setTweets(Number(e.target.value))}
                className="w-full h-1.5 bg-x-border rounded-full appearance-none cursor-pointer accent-orange-400"
              />
              <div className="flex gap-2 flex-wrap">
                {[1, 3, 6, 10, 20].map((v) => (
                  <button
                    key={v}
                    onClick={() => setTweets(v)}
                    className={`px-3 py-1 rounded-full text-sm border transition-colors ${
                      tweets === v
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'border-x-border text-x-muted hover:border-orange-400 hover:text-orange-400'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-x-border flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-full border border-x-border text-x-text font-semibold hover:bg-x-surface transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !canSave}
            className="flex-1 py-2.5 rounded-full bg-x-blue text-white font-bold hover:bg-x-blue/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save Goals'}
          </button>
        </div>
      </div>
    </div>
  )
}
