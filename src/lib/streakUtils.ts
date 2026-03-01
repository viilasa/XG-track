import { differenceInCalendarDays, parseISO, format } from 'date-fns'

/**
 * Calculate new streak value given the previous last-met date and current streak.
 * - If never met before: streak = 1
 * - If last met was yesterday: streak + 1
 * - If last met was today: streak unchanged (already counted)
 * - If last met was 2+ days ago: streak resets to 1
 */
export function calculateStreak(
  lastDate: string | null,
  currentStreak: number,
  today: string = format(new Date(), 'yyyy-MM-dd'),
): number {
  if (!lastDate) return 1

  const diff = differenceInCalendarDays(parseISO(today), parseISO(lastDate))

  if (diff === 0) return currentStreak // already counted today
  if (diff === 1) return currentStreak + 1 // consecutive day
  return 1 // streak broken, reset to 1
}

/**
 * Check if a date is today
 */
export function isToday(dateStr: string): boolean {
  const today = format(new Date(), 'yyyy-MM-dd')
  return dateStr === today
}

/**
 * Calculate the weekly streak score: number of days in the last 7
 * where both goals were met.
 */
export function calculateWeeklyScore(
  replyDates: string[],
  tweetDates: string[],
): number {
  const today = new Date()
  let score = 0

  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - i)
    const dateStr = format(d, 'yyyy-MM-dd')
    const replyMet = replyDates.includes(dateStr)
    const tweetMet = tweetDates.includes(dateStr)
    if (replyMet && tweetMet) score++
    else if (replyMet || tweetMet) score += 0.5
  }

  return Math.round(score)
}

/**
 * Get today's date string in yyyy-MM-dd format (local timezone)
 */
export function todayString(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

/**
 * Get start and end of today in the user's local timezone, as ISO strings (UTC).
 * Use these for filtering tweets so evening tweets in user's timezone are included.
 */
export function todayBoundsUTC(): { start: string; end: string } {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
  return {
    start: startOfDay.toISOString(),
    end: endOfDay.toISOString(),
  }
}

/**
 * Given an array of DailyStat dates with goal_replies_met=true,
 * compute the streak up to today.
 */
export function computeStreakFromDates(metDates: string[]): number {
  if (metDates.length === 0) return 0

  const sorted = [...metDates].sort().reverse() // most recent first
  const today = todayString()

  // If today or yesterday not in list, check if streak is active
  const yesterday = format(
    new Date(new Date().setDate(new Date().getDate() - 1)),
    'yyyy-MM-dd',
  )

  if (sorted[0] !== today && sorted[0] !== yesterday) return 0

  let streak = 0
  let expected = sorted[0] === today ? today : yesterday

  for (const date of sorted) {
    if (date === expected) {
      streak++
      // Move expected to the day before
      const prev = new Date(expected)
      prev.setDate(prev.getDate() - 1)
      expected = format(prev, 'yyyy-MM-dd')
    } else {
      break
    }
  }

  return streak
}
