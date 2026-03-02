import type { TwitterTweet } from '@/types'

// Use proxy in dev to avoid CORS (browser blocks direct API calls)
const API_KEY = import.meta.env.VITE_TWITTERAPI_IO_KEY as string

// Process the bearer token - handle URL encoding and validate format
function getValidBearerToken(): string {
  const rawToken = import.meta.env.VITE_X_BEARER_TOKEN as string || ''
  if (!rawToken) return ''
  
  // Decode URL encoding if present
  let token = rawToken
  try {
    if (token.includes('%')) {
      token = decodeURIComponent(token)
    }
  } catch {
    // If decode fails, use raw token
  }
  
  // Check if token looks malformed (= in middle suggests concatenated tokens)
  const equalSignIndex = token.indexOf('=')
  if (equalSignIndex > 0 && equalSignIndex < token.length - 2) {
    if (import.meta.env.DEV) {
      console.warn('[XG] ⚠️ Bearer token appears malformed (= at position', equalSignIndex, ')')
      console.warn('[XG] Token length:', token.length, 'chars')
      console.warn('[XG] This may be two tokens concatenated or corrupted.')
      console.warn('[XG] Please regenerate your Bearer token from: https://developer.x.com/en/portal/dashboard')
    }
    return token
  }
  
  return token
}

const X_BEARER_TOKEN = getValidBearerToken()

// ─── Official Twitter API v2 ──────────────────────────────────────────────────

interface OfficialTweet {
  id: string
  text: string
  created_at?: string
  in_reply_to_user_id?: string
  referenced_tweets?: Array<{ type: string; id: string }>
  public_metrics?: {
    retweet_count: number
    reply_count: number
    like_count: number
    quote_count: number
    impression_count?: number
  }
  author_id?: string
}

interface OfficialUser {
  id: string
  name: string
  username: string
  profile_image_url?: string
}

interface OfficialTweetResponse {
  data?: OfficialTweet[]
  includes?: { users?: OfficialUser[] }
  meta?: { next_token?: string; result_count: number }
  errors?: Array<{ message: string; type: string }>
}

async function officialApiFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  if (!X_BEARER_TOKEN && import.meta.env.DEV) {
    throw new Error('X_BEARER_TOKEN is not configured in .env file')
  }

  // In both dev and prod, use the /api/x proxy (Vite proxy in dev, Vercel function in prod)
  const url = new URL('/api/x' + path, window.location.origin)

  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  console.log(`[XG] Official API request: ${url.pathname}${url.search.slice(0, 50)}...`)

  let res: Response
  try {
    res = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${X_BEARER_TOKEN}`,
        'Content-Type': 'application/json',
      },
    })
  } catch (networkErr) {
    console.error(`[XG] Official API network error:`, networkErr)
    throw new Error(`Official API network error: ${(networkErr as Error).message || 'fetch failed'}`)
  }

  console.log(`[XG] Official API response status: ${res.status}`)

  if (!res.ok) {
    let text = ''
    try {
      text = await res.text()
    } catch {
      text = '(could not read response body)'
    }
    console.error(`[XG] Official API error ${res.status}:`, text.slice(0, 500))
    throw new Error(`Official X API ${res.status}: ${text.slice(0, 200)}`)
  }

  const json = await res.json()
  console.log(`[XG] Official API success: ${(json as OfficialTweetResponse).data?.length ?? 0} items`)

  return json as T
}

function normalizeOfficialTweet(tweet: OfficialTweet, users: OfficialUser[]): TwitterTweet {
  const author = users.find((u) => u.id === tweet.author_id) ?? {
    id: tweet.author_id ?? '',
    name: '',
    username: '',
  }

  const isReply =
    !!tweet.in_reply_to_user_id ||
    tweet.referenced_tweets?.some((r) => r.type === 'replied_to') === true

  const inReplyToId = tweet.referenced_tweets?.find((r) => r.type === 'replied_to')?.id ?? null

  return {
    id: tweet.id,
    text: tweet.text,
    author: {
      id: author.id,
      name: author.name,
      userName: author.username,
      profilePicture: author.profile_image_url ?? '',
      isBlueVerified: undefined,
    },
    createdAt: tweet.created_at ? new Date(tweet.created_at).toISOString() : new Date().toISOString(),
    isReply,
    inReplyToStatusId: inReplyToId,
    inReplyToId,
    retweetCount: tweet.public_metrics?.retweet_count ?? 0,
    replyCount: tweet.public_metrics?.reply_count ?? 0,
    likeCount: tweet.public_metrics?.like_count ?? 0,
    quoteCount: tweet.public_metrics?.quote_count ?? 0,
    viewCount: tweet.public_metrics?.impression_count ?? 0,
  }
}

/**
 * Search for tweets using Twitter API v2 Search (works with App-Only Bearer token)
 * This endpoint searches the last 7 days of tweets
 */
async function searchTweetsOfficial(query: string): Promise<TwitterTweet[]> {
  if (import.meta.env.DEV) {
    console.log(`[XG] ══════════════════════════════════════════════════`)
    console.log(`[XG] Official API: GET /2/tweets/search/recent`)
    console.log(`[XG] Query: "${query}"`)
  }

  const tweets: TwitterTweet[] = []
  let nextToken: string | undefined

  for (let page = 0; page < 3; page++) {
    const params: Record<string, string> = {
      query,
      'tweet.fields': 'created_at,public_metrics,in_reply_to_user_id,referenced_tweets,author_id',
      'user.fields': 'id,name,username,profile_image_url',
      expansions: 'author_id,referenced_tweets.id',
      max_results: '100',
    }
    if (nextToken) params.next_token = nextToken

    const response = await officialApiFetch<OfficialTweetResponse>('/2/tweets/search/recent', params)

    // Twitter API can return partial errors (e.g., some referenced tweets unavailable)
    // Only fail if there's no data at all
    if (response.errors?.length) {
      console.warn(`[XG] Official API partial errors:`, response.errors.map(e => e.message || e.type).join(', '))
      // Only throw if there's no data - partial errors are OK
      if (!response.data?.length) {
        const errMsg = response.errors[0]?.message || response.errors[0]?.type || 'Unknown error'
        throw new Error(`Official API error: ${errMsg}`)
      }
    }

    const users = response.includes?.users ?? []
    const pageTweets = (response.data ?? []).map((t) => normalizeOfficialTweet(t, users))
    tweets.push(...pageTweets)

    if (import.meta.env.DEV) {
      console.log(`[XG] Official API search page ${page + 1}: ${pageTweets.length} tweets`)
      if (pageTweets.length > 0) {
        const mostRecent = pageTweets[0]
        console.log(`[XG] Most recent: "${mostRecent.text?.slice(0, 40)}..." at ${mostRecent.createdAt}`)
      }
    }

    nextToken = response.meta?.next_token
    if (!nextToken || pageTweets.length < 100) break
  }

  if (import.meta.env.DEV) {
    console.log(`[XG] Official API search total: ${tweets.length} tweets fetched`)
  }

  return tweets
}

// ─── twitterapi.io (fallback) ─────────────────────────────────────────────────

async function apiFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  // In both dev and prod, use the /api/twitter proxy (Vite proxy in dev, Vercel function in prod)
  const url = new URL('/api/twitter' + path, window.location.origin)

  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const res = await fetch(url.toString(), {
    headers: {
      'X-API-Key': API_KEY,
      'Content-Type': 'application/json',
    },
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Twitter API ${res.status}: ${text}`)
  }

  return res.json() as Promise<T>
}

// ─── Response shapes (twitterapi.io can return different structures) ──────────

interface ApiResponse {
  status?: string
  tweets?: RawTweet[]
  mentions?: RawTweet[]
  data?: RawTweet[] | { tweets?: RawTweet[]; unavailable?: boolean }
  has_next_page?: boolean
  next_cursor?: string
}

// Raw API response - handles snake_case and camelCase
interface RawTweet {
  id: string
  text?: string
  full_text?: string
  author?: {
    id?: string
    name?: string
    userName?: string
    user_name?: string
    profilePicture?: string
    profile_picture?: string
    isBlueVerified?: boolean
  }
  createdAt?: string
  created_at?: string
  isReply?: boolean
  is_reply?: boolean
  inReplyToStatusId?: string | null
  inReplyToId?: string | null
  in_reply_to_id?: string | null
  replyCount?: number
  retweetCount?: number
  likeCount?: number
  viewCount?: number
}

function extractTweets(raw: ApiResponse): RawTweet[] {
  if (Array.isArray(raw.tweets)) return raw.tweets
  if (raw.data && !Array.isArray(raw.data) && 'tweets' in raw.data && Array.isArray(raw.data.tweets)) {
    return raw.data.tweets
  }
  if (Array.isArray(raw.data)) return raw.data
  if (Array.isArray(raw.mentions)) return raw.mentions
  // Handle more API response shapes
  const any = raw as Record<string, unknown>
  if (Array.isArray(any.result)) return any.result as RawTweet[]
  if (any.result && typeof any.result === 'object' && Array.isArray((any.result as { tweets?: RawTweet[] }).tweets)) {
    return (any.result as { tweets: RawTweet[] }).tweets
  }
  if (Array.isArray(any.response)) return any.response as RawTweet[]
  return []
}

/** Normalize raw API tweet to TwitterTweet and ensure proper date + isReply */
function normalizeTweet(raw: RawTweet): TwitterTweet {
  const author = raw.author ?? {}
  const text = raw.text ?? raw.full_text ?? ''
  const createdAtRaw = raw.createdAt ?? raw.created_at ?? ''
  const createdAt = parseTweetDate(createdAtRaw)

  const isReply =
    raw.isReply === true ||
    raw.is_reply === true ||
    !!(raw.inReplyToStatusId ?? raw.inReplyToId ?? raw.in_reply_to_id)

  return {
    id: raw.id,
    text,
    author: {
      id: author.id ?? '',
      name: author.name ?? '',
      userName: author.userName ?? author.user_name ?? '',
      profilePicture: author.profilePicture ?? author.profile_picture ?? '',
      isBlueVerified: author.isBlueVerified,
    },
    createdAt,
    isReply,
    inReplyToStatusId: raw.inReplyToStatusId ?? null,
    inReplyToId: raw.inReplyToId ?? raw.in_reply_to_id ?? null,
    retweetCount: raw.retweetCount ?? 0,
    replyCount: raw.replyCount ?? 0,
    likeCount: raw.likeCount ?? 0,
    quoteCount: 0,
    viewCount: raw.viewCount ?? 0,
  }
}

/** Parse Twitter date formats: "Tue Dec 10 07:00:30 +0000 2024" or ISO */
function parseTweetDate(s: string): string {
  if (!s) return new Date().toISOString()
  const d = new Date(s)
  if (isNaN(d.getTime())) return new Date().toISOString()
  return d.toISOString()
}

// ─── Rate Limit Helper ────────────────────────────────────────────────────────

const RATE_LIMIT_DELAY_MS = 5500

/** Delay helper for rate limit compliance (free tier: 1 req/5s) */
const delayMs = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Fetch user tweets + replies.
 * PRIMARY: Official Twitter API v2 (real-time data)
 * FALLBACK: twitterapi.io (when rate limited or error)
 */
export async function fetchAllTweets(
  twitterUserId: string,
  twitterUserName?: string,
): Promise<TwitterTweet[]> {
  const seenIds = new Set<string>()
  const merged: TwitterTweet[] = []
  const addResults = (tweets: TwitterTweet[], source: string) => {
    let added = 0
    for (const t of tweets) {
      if (!seenIds.has(t.id)) {
        seenIds.add(t.id)
        merged.push(t)
        added++
      }
    }
    if (import.meta.env.DEV && added > 0) {
      console.log(`[XG] Added ${added} tweets from ${source}`)
    }
  }

  // ── Step 1: Try Official Twitter API v2 Search (works with App-Only token) ──
  let officialSuccess = false
  
  if (X_BEARER_TOKEN && twitterUserName) {
    try {
      console.log('[XG] Trying Official Twitter API v2 Search...')
      // Search for tweets from this user (last 7 days)
      const searchQuery = `from:${twitterUserName}`
      const officialTweets = await searchTweetsOfficial(searchQuery)
      addResults(officialTweets, 'Official API v2 Search')
      officialSuccess = officialTweets.length > 0

      if (officialTweets.length > 0) {
        const replies = officialTweets.filter((t) => t.isReply).length
        const sorted = [...officialTweets].sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        console.log(`[XG] Official API: ${officialTweets.length} tweets (${replies} replies)`)
        const ageMinutes = Math.round((Date.now() - new Date(sorted[0].createdAt).getTime()) / 60000)
        console.log(`[XG] Most recent tweet age: ${ageMinutes} minutes`)
      } else {
        console.log('[XG] Official API returned 0 tweets')
      }
    } catch (err) {
      const errMsg = (err as Error).message || String(err) || 'Unknown error'
      console.warn(`[XG] Official API failed: ${errMsg}`)
    }
  } else {
    console.log('[XG] Skipping Official API (no token or username)')
  }

  // ── Step 2: Fallback to twitterapi.io if Official API failed ────────────────
  if (!officialSuccess) {
    if (import.meta.env.DEV) {
      console.log('[XG] ═══ Falling back to twitterapi.io ═══')
    }
    await fetchTweetsFromTwitterApiIo(twitterUserId, twitterUserName, addResults)
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  if (import.meta.env.DEV) {
    if (merged.length > 0) {
      const replies = merged.filter((t) => t.isReply).length
      const sorted = [...merged].sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )
      const mostRecent = sorted[0]
      console.log(`[XG] ═══ FINAL RESULT ═══`)
      console.log(`[XG] Total: ${merged.length} tweets (${replies} replies)`)
      console.log(`[XG] Most recent: "${mostRecent.text?.slice(0, 50)}..." at ${mostRecent.createdAt}`)
      console.log(`[XG] Data age: ${Math.round((Date.now() - new Date(mostRecent.createdAt).getTime()) / 60000)} minutes old`)
    } else {
      console.warn('[XG] fetchAllTweets: all attempts returned 0 tweets.')
    }
  }

  return merged
}

async function fetchTweetsFromTwitterApiIo(
  _twitterUserId: string,
  twitterUserName: string | undefined,
  addResults: (tweets: TwitterTweet[], source: string) => void,
): Promise<void> {
  const tryFetch = async (path: string, params: Record<string, string>, maxPages = 3): Promise<TwitterTweet[]> => {
    const all: TwitterTweet[] = []
    let cursor = ''

    for (let i = 0; i < maxPages; i++) {
      if (i > 0) {
        if (import.meta.env.DEV) console.log(`[XG] Waiting ${RATE_LIMIT_DELAY_MS}ms before page ${i + 1}...`)
        await delayMs(RATE_LIMIT_DELAY_MS)
      }

      const p = { ...params }
      if (cursor) p.cursor = cursor

      const raw = await apiFetch<ApiResponse>(path, p)
      const page = extractTweets(raw).map(normalizeTweet)
      all.push(...page)

      if (page.length < 20 || !raw.has_next_page || !raw.next_cursor) break
      cursor = raw.next_cursor ?? ''
    }
    return all
  }

  try {
    if (twitterUserName) {
      try {
        const query = `from:${twitterUserName}`
        if (import.meta.env.DEV) {
          console.log(`[XG] twitterapi.io: GET /twitter/tweet/advanced_search → "${query}"`)
        }
        const searchResults = await tryFetch('/twitter/tweet/advanced_search', {
          query,
          queryType: 'Latest',
        }, 2)
        addResults(searchResults, 'twitterapi.io advanced_search')
      } catch (e) {
        if (import.meta.env.DEV) console.warn('[XG] Advanced Search failed:', (e as Error).message)
      }

      await delayMs(RATE_LIMIT_DELAY_MS)

      try {
        if (import.meta.env.DEV) console.log(`[XG] twitterapi.io: GET /twitter/user/last_tweets userName=${twitterUserName}`)
        const timeline = await tryFetch('/twitter/user/last_tweets', {
          userName: twitterUserName,
          includeReplies: 'true',
        }, 2)
        addResults(timeline, 'twitterapi.io last_tweets')
      } catch (e) {
        if (import.meta.env.DEV) console.warn('[XG] last_tweets (userName) failed:', (e as Error).message)
      }
    }
  } catch (err) {
    console.error('[XG] twitterapi.io fallback failed:', err)
  }
}

/**
 * Fetch mentions/replies received by user.
 * PRIMARY: Official Twitter API v2 (real-time data)
 * FALLBACK: twitterapi.io (when rate limited or error)
 */
export async function fetchMentions(
  twitterUserName: string,
  _twitterUserId?: string,
): Promise<TwitterTweet[]> {
  if (import.meta.env.DEV) {
    console.log(`[XG] Fetching mentions for @${twitterUserName}`)
  }

  // ── Step 1: Try Official Twitter API v2 Search for mentions ──────────────────
  if (X_BEARER_TOKEN) {
    try {
      if (import.meta.env.DEV) {
        console.log('[XG] ═══ Trying Official API v2 Search for mentions ═══')
      }
      // Search for tweets mentioning this user (last 7 days)
      const searchQuery = `@${twitterUserName} -from:${twitterUserName}`
      const officialMentions = await searchTweetsOfficial(searchQuery)

      if (officialMentions.length > 0) {
        if (import.meta.env.DEV) {
          const sorted = [...officialMentions].sort((a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          )
          console.log(`[XG] Official API Search mentions: ${officialMentions.length} received`)
          console.log(`[XG] Most recent: "${sorted[0].text?.slice(0, 50)}..." at ${sorted[0].createdAt}`)
        }
        return officialMentions
      }
    } catch (err) {
      if (import.meta.env.DEV) {
        console.warn(`[XG] Official API Search mentions failed: ${(err as Error).message}`)
      }
    }
  }

  // ── Step 2: Fallback to twitterapi.io for mentions ──────────────────────────
  if (import.meta.env.DEV) {
    console.log('[XG] ═══ Using twitterapi.io for mentions ═══')
  }

  try {
    const raw = await apiFetch<ApiResponse>('/twitter/user/mentions', {
      userName: twitterUserName,
    })
    const mentions = extractTweets(raw).map(normalizeTweet)
    if (import.meta.env.DEV) {
      console.log(`[XG] twitterapi.io mentions: ${mentions.length} received`)
      if (mentions.length > 0) {
        const sorted = [...mentions].sort((a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        console.log(`[XG] Most recent mention: "${sorted[0].text?.slice(0, 50)}..." at ${sorted[0].createdAt}`)
      }
    }
    return mentions
  } catch (err) {
    console.error('[XG] fetchMentions failed:', err)
    return []
  }
}
