// ─── Auth / Profile ──────────────────────────────────────────────────────────

export interface Profile {
  id: string
  twitter_id: string | null
  twitter_username: string | null
  twitter_name: string | null
  twitter_avatar: string | null
  last_synced_at: string | null
  created_at: string
  updated_at: string
}

// ─── Goals ───────────────────────────────────────────────────────────────────

export interface Goal {
  id: string
  user_id: string
  replies_per_day: number
  tweets_per_day: number
  goal_duration_days: number | null
  goal_started_at: string | null
  track_replies: boolean
  track_tweets: boolean
  created_at: string
  updated_at: string
}

// ─── Daily Stats ─────────────────────────────────────────────────────────────

export interface DailyStat {
  id: string
  user_id: string
  date: string
  replies_sent: number
  tweets_posted: number
  replies_received: number
  replies_cleared: number
  goal_replies_met: boolean
  goal_tweets_met: boolean
  manual_replies: number
  manual_tweets: number
  created_at: string
  updated_at: string
}

// ─── Streaks ─────────────────────────────────────────────────────────────────

export interface Streak {
  id: string
  user_id: string
  current_reply_streak: number
  current_tweet_streak: number
  current_engagement_streak: number
  longest_reply_streak: number
  longest_tweet_streak: number
  longest_engagement_streak: number
  weekly_streak_score: number
  last_reply_date: string | null
  last_tweet_date: string | null
  created_at: string
  updated_at: string
}

// ─── Badges ───────────────────────────────────────────────────────────────────

export interface Badge {
  id: string
  name: string
  description: string
  icon: string
  category: 'reply_streak' | 'tweet_streak' | 'inbox'
  threshold: number
}

export interface UserBadge {
  id: string
  user_id: string
  badge_id: string
  earned_at: string
  badges?: Badge
}

// ─── Twitter / twitterapi.io ──────────────────────────────────────────────────

export interface TwitterUser {
  id: string
  name: string
  userName: string
  profilePicture: string
  followersCount: number
  followingCount: number
  statusesCount: number
  description: string
  verified: boolean
}

export interface TwitterTweet {
  id: string
  text: string
  author: {
    id: string
    name: string
    userName: string
    profilePicture: string
    isBlueVerified?: boolean
  }
  createdAt: string
  isReply: boolean
  inReplyToStatusId?: string | null
  inReplyToId?: string | null
  retweetCount: number
  replyCount: number
  likeCount: number
  quoteCount: number
  viewCount?: number
  entities?: {
    urls?: Array<{ url: string; expandedUrl: string; displayUrl: string }>
    hashtags?: Array<{ text: string }>
    userMentions?: Array<{ screenName: string; name: string; id: string }>
  }
}

// ─── Received Tweets (Inbox) ──────────────────────────────────────────────────

export interface ReceivedTweet {
  id: string
  user_id: string
  tweet_id: string
  tweet_text: string
  author_name: string
  author_username: string
  author_avatar: string
  created_at_twitter: string
  is_cleared: boolean
  cleared_at: string | null
  fetched_at: string
}

// ─── Cached Tweets (DB) ───────────────────────────────────────────────────────

export interface CachedTweet {
  id: string
  user_id: string
  tweet_id: string
  tweet_text: string
  author_name: string
  author_username: string
  author_avatar: string
  is_reply: boolean
  in_reply_to_id: string | null
  reply_count: number
  retweet_count: number
  like_count: number
  view_count: number
  is_blue_verified: boolean
  created_at_twitter: string
  fetched_at: string
}

// ─── UI State ─────────────────────────────────────────────────────────────────

export type InboxFilter = 'all' | 'pending' | 'cleared'
export type TodayTab = 'tweets' | 'replies'
export type AnalyticsPeriod = '7d' | '30d'
