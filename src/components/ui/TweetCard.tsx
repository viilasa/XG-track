import { formatDistanceToNow } from 'date-fns'
import { MessageCircle, Repeat2, Heart, BarChart2, CheckCircle2 } from 'lucide-react'
import clsx from 'clsx'
import type { TwitterTweet, ReceivedTweet, CachedTweet } from '@/types'

// ─── From Twitter API ─────────────────────────────────────────────────────────

interface TweetCardProps {
  tweet: TwitterTweet
  variant?: 'default' | 'reply' | 'received'
  onClear?: () => void
  isCleared?: boolean
}

export function TweetCard({ tweet, variant = 'default', onClear, isCleared }: TweetCardProps) {
  const timeAgo = formatDistanceToNow(new Date(tweet.createdAt), { addSuffix: true })

  return (
    <article
      className={clsx(
        'border-b border-x-border px-4 py-3 flex gap-3 transition-colors',
        isCleared ? 'opacity-50' : 'hover:bg-x-hover',
        variant === 'reply' && 'border-l-2 border-l-x-blue/40 pl-3',
      )}
    >
      {/* Avatar */}
      <div className="flex-shrink-0">
        <img
          src={tweet.author.profilePicture || `https://unavatar.io/twitter/${tweet.author.userName}`}
          alt={tweet.author.name}
          className="w-10 h-10 rounded-full bg-x-card object-cover"
          onError={(e) => {
            ;(e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(tweet.author.name)}&background=1d9bf0&color=fff&size=40`
          }}
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-1 flex-wrap">
          <span className="font-bold text-x-text text-[15px] leading-tight hover:underline cursor-pointer truncate max-w-[140px]">
            {tweet.author.name}
          </span>
          {tweet.author.isBlueVerified && (
            <span className="text-x-blue text-xs">✓</span>
          )}
          <span className="text-x-muted text-[15px]">@{tweet.author.userName}</span>
          <span className="text-x-muted text-[15px]">·</span>
          <span className="text-x-muted text-[15px] hover:underline cursor-pointer flex-shrink-0">{timeAgo}</span>
        </div>

        {/* Tweet text */}
        <p className="text-x-text text-[15px] mt-1 leading-relaxed whitespace-pre-wrap break-words">
          {tweet.text}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-5 mt-3">
          <button className="flex items-center gap-1.5 text-x-muted hover:text-x-blue group transition-colors text-sm">
            <span className="p-1.5 rounded-full group-hover:bg-x-blue/10 transition-colors">
              <MessageCircle size={16} />
            </span>
            {tweet.replyCount > 0 && <span>{formatCount(tweet.replyCount)}</span>}
          </button>

          <button className="flex items-center gap-1.5 text-x-muted hover:text-green-400 group transition-colors text-sm">
            <span className="p-1.5 rounded-full group-hover:bg-green-400/10 transition-colors">
              <Repeat2 size={16} />
            </span>
            {tweet.retweetCount > 0 && <span>{formatCount(tweet.retweetCount)}</span>}
          </button>

          <button className="flex items-center gap-1.5 text-x-muted hover:text-pink-500 group transition-colors text-sm">
            <span className="p-1.5 rounded-full group-hover:bg-pink-500/10 transition-colors">
              <Heart size={16} />
            </span>
            {tweet.likeCount > 0 && <span>{formatCount(tweet.likeCount)}</span>}
          </button>

          {tweet.viewCount !== undefined && tweet.viewCount > 0 && (
            <button className="flex items-center gap-1.5 text-x-muted hover:text-x-blue group transition-colors text-sm">
              <span className="p-1.5 rounded-full group-hover:bg-x-blue/10 transition-colors">
                <BarChart2 size={16} />
              </span>
              <span>{formatCount(tweet.viewCount)}</span>
            </button>
          )}

          {/* Clear button for inbox */}
          {onClear && !isCleared && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onClear()
              }}
              className="ml-auto flex items-center gap-1.5 text-x-muted hover:text-x-green text-sm px-3 py-1 rounded-full border border-x-border hover:border-x-green transition-colors"
            >
              <CheckCircle2 size={14} />
              Clear
            </button>
          )}

          {isCleared && (
            <span className="ml-auto flex items-center gap-1.5 text-x-green text-sm">
              <CheckCircle2 size={14} />
              Cleared
            </span>
          )}
        </div>
      </div>
    </article>
  )
}

// ─── From Supabase DB (ReceivedTweet) ────────────────────────────────────────

interface ReceivedTweetCardProps {
  tweet: ReceivedTweet
}

export function ReceivedTweetCard({ tweet }: ReceivedTweetCardProps) {
  const timeAgo = formatDistanceToNow(new Date(tweet.created_at_twitter), { addSuffix: true })

  return (
    <article
      className={clsx(
        'border-b border-x-border px-4 py-3 flex gap-3 transition-colors',
        tweet.is_cleared ? 'opacity-40 bg-x-surface/30' : 'hover:bg-x-hover',
      )}
    >
      <div className="flex-shrink-0">
        <img
          src={tweet.author_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(tweet.author_name)}&background=1d9bf0&color=fff&size=40`}
          alt={tweet.author_name}
          className="w-10 h-10 rounded-full bg-x-card object-cover"
          onError={(e) => {
            ;(e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(tweet.author_name)}&background=1d9bf0&color=fff&size=40`
          }}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="font-bold text-x-text text-[15px] truncate max-w-[140px]">
            {tweet.author_name}
          </span>
          <span className="text-x-muted text-[15px]">@{tweet.author_username}</span>
          <span className="text-x-muted text-[15px]">·</span>
          <span className="text-x-muted text-[15px]">{timeAgo}</span>
          {tweet.is_cleared && (
            <span className="ml-auto flex items-center gap-1 text-x-green text-xs bg-x-green/10 px-2 py-0.5 rounded-full">
              <CheckCircle2 size={12} />
              Replied
            </span>
          )}
        </div>

        <p className="text-x-text text-[15px] mt-1 leading-relaxed break-words">
          {tweet.tweet_text}
        </p>
      </div>
    </article>
  )
}

// ─── From Supabase tweets_cache (CachedTweet) ───────────────────────────────

interface CachedTweetCardProps {
  tweet: CachedTweet
  variant?: 'default' | 'reply'
}

export function CachedTweetCard({ tweet, variant = 'default' }: CachedTweetCardProps) {
  const timeAgo = formatDistanceToNow(new Date(tweet.created_at_twitter), { addSuffix: true })

  return (
    <article
      className={clsx(
        'border-b border-x-border px-4 py-3 flex gap-3 transition-colors hover:bg-x-hover',
        variant === 'reply' && 'border-l-2 border-l-x-blue/40 pl-3',
      )}
    >
      <div className="flex-shrink-0">
        <img
          src={tweet.author_avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(tweet.author_name)}&background=1d9bf0&color=fff&size=40`}
          alt={tweet.author_name}
          className="w-10 h-10 rounded-full bg-x-card object-cover"
          onError={(e) => {
            ;(e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(tweet.author_name)}&background=1d9bf0&color=fff&size=40`
          }}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="font-bold text-x-text text-[15px] leading-tight truncate max-w-[140px]">
            {tweet.author_name}
          </span>
          {tweet.is_blue_verified && (
            <span className="text-x-blue text-xs">✓</span>
          )}
          <span className="text-x-muted text-[15px]">@{tweet.author_username}</span>
          <span className="text-x-muted text-[15px]">·</span>
          <span className="text-x-muted text-[15px] flex-shrink-0">{timeAgo}</span>
        </div>

        <p className="text-x-text text-[15px] mt-1 leading-relaxed whitespace-pre-wrap break-words">
          {tweet.tweet_text}
        </p>

        <div className="flex items-center gap-5 mt-3">
          <span className="flex items-center gap-1.5 text-x-muted text-sm">
            <MessageCircle size={16} />
            {tweet.reply_count > 0 && formatCount(tweet.reply_count)}
          </span>
          <span className="flex items-center gap-1.5 text-x-muted text-sm">
            <Repeat2 size={16} />
            {tweet.retweet_count > 0 && formatCount(tweet.retweet_count)}
          </span>
          <span className="flex items-center gap-1.5 text-x-muted text-sm">
            <Heart size={16} />
            {tweet.like_count > 0 && formatCount(tweet.like_count)}
          </span>
          {tweet.view_count > 0 && (
            <span className="flex items-center gap-1.5 text-x-muted text-sm">
              <BarChart2 size={16} />
              {formatCount(tweet.view_count)}
            </span>
          )}
        </div>
      </div>
    </article>
  )
}

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}
