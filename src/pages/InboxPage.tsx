import { useState } from 'react'
import { RefreshCw, CheckCheck } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '@/hooks/useAuth'
import { useTwitterData } from '@/hooks/useTwitterData'
import { useSync } from '@/hooks/useSync'
import { ReceivedTweetCard } from '@/components/ui/TweetCard'
import type { InboxFilter } from '@/types'

export function InboxPage() {
  const { profile, refreshProfile } = useAuth()
  const { receivedTweets, isLoading } = useTwitterData(profile?.id)
  const { forceSync, isSyncing } = useSync()
  const [filter, setFilter] = useState<InboxFilter>('pending')

  const total = receivedTweets.length
  const cleared = receivedTweets.filter((t) => t.is_cleared).length
  const pending = total - cleared
  const clearPct = total > 0 ? Math.round((cleared / total) * 100) : 0

  const filtered = receivedTweets.filter((t) => {
    if (filter === 'pending') return !t.is_cleared
    if (filter === 'cleared') return t.is_cleared
    return true
  })

  const handleSync = async () => {
    if (!profile) return
    await forceSync(profile)
    await refreshProfile()
  }

  const lastSynced = profile?.last_synced_at
    ? formatDistanceToNow(new Date(profile.last_synced_at), { addSuffix: true })
    : 'never'

  return (
    <div>
      {/* Header */}
      <header className="sticky top-0 z-10 bg-x-bg/80 backdrop-blur-md border-b border-x-border px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-x-text font-bold text-xl">Today's Inbox</h1>
          <p className="text-x-muted text-xs mt-0.5">
            {cleared} of {total} replied · Synced {lastSynced}
          </p>
        </div>
        <button
          onClick={handleSync}
          disabled={isSyncing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-x-surface text-x-text text-sm font-semibold hover:bg-x-border transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
          {isSyncing ? 'Syncing...' : 'Sync'}
        </button>
      </header>

      {/* Progress bar */}
      {total > 0 && (
        <div className="px-4 py-3 border-b border-x-border space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-x-muted">Inbox cleared</span>
            <span className={clearPct === 100 ? 'text-x-green font-bold' : 'text-x-text font-semibold'}>
              {clearPct}%
            </span>
          </div>
          <div className="h-2 bg-x-border rounded-full overflow-hidden">
            <div
              className="h-full bg-x-green rounded-full transition-all duration-500"
              style={{ width: `${clearPct}%` }}
            />
          </div>
          <div className="flex gap-4 text-xs text-x-muted">
            <span>
              <span className="text-x-red font-semibold">{pending}</span> pending
            </span>
            <span>
              <span className="text-x-green font-semibold">{cleared}</span> cleared
            </span>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex border-b border-x-border">
        {(['all', 'pending', 'cleared'] as InboxFilter[]).map((f) => {
          const count = f === 'all' ? total : f === 'pending' ? pending : cleared
          return (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-3.5 text-sm font-semibold capitalize transition-colors relative ${
                filter === f ? 'text-x-text' : 'text-x-muted hover:text-x-text hover:bg-x-surface'
              }`}
            >
              {f}
              <span className="ml-1.5 text-xs bg-x-surface px-1.5 py-0.5 rounded-full">
                {count}
              </span>
              {filter === f && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-x-blue rounded-full" />
              )}
            </button>
          )
        })}
      </div>

      {/* Tweet list */}
      {(isLoading || isSyncing) && filtered.length === 0 ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <EmptyState filter={filter} />
      ) : (
        <div>
          {filtered.map((tweet) => (
            <ReceivedTweetCard key={tweet.id} tweet={tweet} />
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState({ filter }: { filter: InboxFilter }) {
  const messages = {
    all: { icon: '📬', title: 'No replies received yet', sub: 'Hit Sync to fetch mentions from X.' },
    pending: { icon: <CheckCheck size={40} className="text-x-green" />, title: 'All caught up!', sub: 'You\'ve replied to all received mentions.' },
    cleared: { icon: '📭', title: 'No replies yet', sub: 'Reply to mentions and they\'ll appear here after syncing.' },
  }[filter]

  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
      <div className="text-5xl mb-4">
        {typeof messages.icon === 'string' ? messages.icon : messages.icon}
      </div>
      <h3 className="text-x-text font-bold text-xl mb-2">{messages.title}</h3>
      <p className="text-x-muted text-[15px]">{messages.sub}</p>
    </div>
  )
}

function LoadingState() {
  return (
    <div>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="border-b border-x-border p-4 flex gap-3 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-x-surface flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex gap-2">
              <div className="h-3 bg-x-surface rounded w-24" />
              <div className="h-3 bg-x-surface rounded w-20" />
            </div>
            <div className="h-3 bg-x-surface rounded w-full" />
            <div className="h-3 bg-x-surface rounded w-2/3" />
          </div>
        </div>
      ))}
    </div>
  )
}
