/**
 * Renders a shareable badge card as a PNG using HTML Canvas.
 * Downloads the image and opens X compose with pre-filled text.
 */

interface ShareCardData {
  badgeIcon: string
  badgeName: string
  badgeDescription: string
  earnedDate: string
  userName: string // @handle
}

const CARD_W = 600
const CARD_H = 400

export async function shareBadgeOnX(data: ShareCardData) {
  const canvas = document.createElement('canvas')
  canvas.width = CARD_W
  canvas.height = CARD_H
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // ── Background ──────────────────────────────────────────────────────────
  // Dark gradient background
  const bg = ctx.createLinearGradient(0, 0, CARD_W, CARD_H)
  bg.addColorStop(0, '#0a0a0a')
  bg.addColorStop(1, '#111827')
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, CARD_W, CARD_H)

  // Blue accent border (top)
  const borderGrad = ctx.createLinearGradient(0, 0, CARD_W, 0)
  borderGrad.addColorStop(0, '#1d9bf0')
  borderGrad.addColorStop(1, '#8b5cf6')
  ctx.fillStyle = borderGrad
  ctx.fillRect(0, 0, CARD_W, 4)

  // Subtle glow circle behind icon
  const glowGrad = ctx.createRadialGradient(CARD_W / 2, 140, 20, CARD_W / 2, 140, 120)
  glowGrad.addColorStop(0, 'rgba(29, 155, 240, 0.15)')
  glowGrad.addColorStop(1, 'rgba(29, 155, 240, 0)')
  ctx.fillStyle = glowGrad
  ctx.fillRect(0, 40, CARD_W, 200)

  // ── Badge Icon ──────────────────────────────────────────────────────────
  ctx.font = '64px serif'
  ctx.textAlign = 'center'
  ctx.fillText(data.badgeIcon, CARD_W / 2, 155)

  // ── Badge Name ──────────────────────────────────────────────────────────
  ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.fillStyle = '#e7e9ea'
  ctx.fillText(data.badgeName, CARD_W / 2, 210)

  // ── Description ─────────────────────────────────────────────────────────
  ctx.font = '16px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.fillStyle = '#71767b'
  ctx.fillText(data.badgeDescription, CARD_W / 2, 245)

  // ── Earned date ─────────────────────────────────────────────────────────
  ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.fillStyle = '#00ba7c'
  ctx.fillText(`Earned on ${data.earnedDate}`, CARD_W / 2, 280)

  // ── User handle ─────────────────────────────────────────────────────────
  ctx.font = '15px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.fillStyle = '#1d9bf0'
  ctx.fillText(`@${data.userName}`, CARD_W / 2, 310)

  // ── Branding ────────────────────────────────────────────────────────────
  ctx.font = 'bold 13px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif'
  ctx.fillStyle = '#3f4347'
  ctx.fillText('XG Tracker', CARD_W / 2, 370)

  // ── Download PNG ────────────────────────────────────────────────────────
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/png'),
  )
  if (!blob) return

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${data.badgeName.replace(/\s+/g, '-').toLowerCase()}-badge.png`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)

  // ── Open X compose ──────────────────────────────────────────────────────
  const text = encodeURIComponent(
    `I just earned the ${data.badgeIcon} ${data.badgeName} badge on XG Tracker! ${data.badgeDescription} #XGrowth`,
  )
  window.open(`https://x.com/intent/tweet?text=${text}`, '_blank')
}
