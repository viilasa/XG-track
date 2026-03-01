import { useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { useAuth } from '@/hooks/useAuth'
import { useTwitterData } from '@/hooks/useTwitterData'
import { useSync } from '@/hooks/useSync'
import { CachedTweetCard } from '@/components/ui/TweetCard'
import type { TodayTab } from '@/types'

export function TodayPage() {
  const { profile, refreshProfile } = useAuth()
  const { todayTweets, todayReplies, recentTweets, recentReplies, dataAge, isLoading } = useTwitterData(profile?.id)
  const { forceSync, isSyncing } = useSync()
  const [activeTab, setActiveTab] = useState<TodayTab>('tweets')

  const todayItems = activeTab === 'tweets' ? todayTweets : todayReplies
  const recentItems = activeTab === 'tweets' ? recentTweets : recentReplies
  const showingRecent = todayItems.length === 0 && recentItems.length > 0
  const items = showingRecent ? recentItems : todayItems
  const counts = { tweets: todayTweets.length, replies: todayReplies.length }

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
        <h1 className="text-x-text font-bold text-xl">Today</h1>
        <div className="flex items-center gap-2">
          <span className="text-x-muted text-xs hidden sm:block">
            Synced {lastSynced}
          </span>
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-x-surface text-x-text text-sm font-semibold hover:bg-x-border transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
            {isSyncing ? 'Syncing...' : 'Sync'}
          </button>
        </div>
      </header>

      {/* Date banner */}
      <div className="px-4 py-3 border-b border-x-border">
        <div className="flex items-center justify-between">
          <p className="text-x-muted text-sm">
            {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
          {dataAge !== null && (
            <span className="text-x-muted text-xs">
              Latest data: {dataAge < 60 ? `${dataAge}m` : `${Math.round(dataAge / 60)}h`} ago
            </span>
          )}
        </div>
        <p className="text-x-text text-sm mt-0.5">
          <span className="text-x-blue font-semibold">{counts.tweets}</span> tweet{counts.tweets !== 1 ? 's' : ''} ·{' '}
          <span className="text-x-blue font-semibold">{counts.replies}</span> repl{counts.replies !== 1 ? 'ies' : 'y'} sent today
        </p>
      </div>

      {/* Recent activity banner */}
      {showingRecent && (
        <div className="px-4 py-2 bg-x-blue/5 border-b border-x-border">
          <p className="text-x-muted text-xs">
            No activity today yet — showing recent posts
          </p>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex border-b border-x-border">
        {(['tweets', 'replies'] as TodayTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-4 text-sm font-semibold transition-colors relative ${
              activeTab === tab ? 'text-x-text' : 'text-x-muted hover:text-x-text hover:bg-x-surface'
            }`}
          >
            {tab === 'tweets' ? 'Tweets' : 'Replies'}{' '}
            <span className="ml-1.5 text-xs bg-x-surface px-1.5 py-0.5 rounded-full">
              {counts[tab]}
            </span>
            {activeTab === tab && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-16 h-1 bg-x-blue rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      {(isLoading || isSyncing) && items.length === 0 ? (
        <LoadingState />
      ) : items.length === 0 ? (
        <EmptyState tab={activeTab} />
      ) : (
        <div>
          {items.map((tweet) => (
            <CachedTweetCard
              key={tweet.id}
              tweet={tweet}
              variant={activeTab === 'replies' ? 'reply' : 'default'}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function EmptyState({ tab }: { tab: TodayTab }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
      <span className="text-6xl mb-4">{tab === 'tweets' ? '📝' : '💬'}</span>
      <h3 className="text-x-text font-bold text-xl mb-2">
        No {tab === 'tweets' ? 'tweets' : 'replies'} yet today
      </h3>
      <p className="text-x-muted text-[15px]">
        {tab === 'tweets'
          ? 'Post on X, then hit Sync to see them here.'
          : 'Reply to tweets on X, then hit Sync to track them.'}
      </p>
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
            <div className="h-3 bg-x-surface rounded w-3/4" />
          </div>
        </div>
      ))}
    </div>
  )
}
