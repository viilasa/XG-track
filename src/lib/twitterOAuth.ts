function randomString(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~'
  const arr = new Uint8Array(length)
  crypto.getRandomValues(arr)
  return Array.from(arr, (b) => chars[b % chars.length]).join('')
}

async function sha256Base64Url(plain: string): Promise<string> {
  const data = new TextEncoder().encode(plain)
  const hash = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

export async function initiateTwitterOAuth(): Promise<void> {
  const codeVerifier = randomString(64)
  const codeChallenge = await sha256Base64Url(codeVerifier)

  // Encode code_verifier in state so the server-side callback can retrieve it
  // (state is echoed back by Twitter unchanged)
  const state = btoa(JSON.stringify({ cv: codeVerifier }))

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: import.meta.env.VITE_TWITTER_CLIENT_ID,
    redirect_uri: `${window.location.origin}/api/auth/callback`,
    scope: 'tweet.read users.read offline.access',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
  })

  window.location.href = `https://twitter.com/i/oauth2/authorize?${params}`
}
