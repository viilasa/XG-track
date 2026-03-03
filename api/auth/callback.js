import { createClient } from '@supabase/supabase-js'
import { randomBytes } from 'crypto'

export default async function handler(req, res) {
  const { code, state: stateParam, error: oauthError } = req.query

  if (oauthError) {
    return res.redirect(`/?auth_error=${encodeURIComponent(oauthError)}`)
  }

  if (!code || !stateParam) {
    return res.redirect('/?auth_error=missing_params')
  }

  let codeVerifier
  try {
    const state = JSON.parse(Buffer.from(stateParam, 'base64').toString())
    codeVerifier = state.cv
  } catch {
    return res.redirect('/?auth_error=invalid_state')
  }

  if (!codeVerifier) {
    return res.redirect('/?auth_error=missing_verifier')
  }

  try {
    const appUrl = process.env.APP_URL || 'https://xg-track.vercel.app'
    const clientId = process.env.TWITTER_CLIENT_ID
    const clientSecret = process.env.TWITTER_CLIENT_SECRET

    // 1. Exchange Twitter code for access token
    const tokenBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${appUrl}/api/auth/callback`,
      code_verifier: codeVerifier,
    })

    const tokenHeaders = { 'Content-Type': 'application/x-www-form-urlencoded' }
    if (clientSecret) {
      tokenHeaders['Authorization'] = `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
    } else {
      tokenBody.append('client_id', clientId)
    }

    const tokenRes = await fetch('https://api.twitter.com/2/oauth2/token', {
      method: 'POST',
      headers: tokenHeaders,
      body: tokenBody.toString(),
    })
    const tokenData = await tokenRes.json()

    if (!tokenData.access_token) {
      console.error('[Auth] Twitter token exchange failed:', JSON.stringify(tokenData))
      return res.redirect('/?auth_error=token_failed')
    }

    // 2. Get Twitter user info
    const userRes = await fetch(
      'https://api.twitter.com/2/users/me?user.fields=profile_image_url,name,username',
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    )
    const { data: twitterUser } = await userRes.json()

    if (!twitterUser?.id) {
      return res.redirect('/?auth_error=user_fetch_failed')
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const userMeta = {
      provider_id: twitterUser.id,
      user_name: twitterUser.username,
      full_name: twitterUser.name,
      avatar_url: twitterUser.profile_image_url?.replace('_normal', '_400x400') ?? null,
    }

    // 3. Find or create the Supabase user
    const derivedEmail = `${twitterUser.id}@xgtrack.twitter`

    // Check if user already has a profile (returning user)
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('twitter_id', twitterUser.id)
      .single()

    let userId
    let userEmail

    if (existingProfile?.id) {
      userId = existingProfile.id
      const { data: authUserData } = await supabase.auth.admin.getUserById(existingProfile.id)
      userEmail = authUserData?.user?.email || derivedEmail
      await supabase.auth.admin.updateUserById(existingProfile.id, { user_metadata: userMeta })
    } else {
      userEmail = derivedEmail
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: userEmail,
        email_confirm: true,
        password: randomBytes(32).toString('hex'), // initial random password
        user_metadata: userMeta,
      })
      if (createError) {
        if (createError.message?.includes('already been registered')) {
          // User exists with this email but no profile yet — find them
          const { data: users } = await supabase.auth.admin.listUsers({ perPage: 1000 })
          const found = users?.users?.find(u => u.email === userEmail)
          userId = found?.id
        } else {
          console.error('[Auth] Create user failed:', createError)
          return res.redirect('/?auth_error=create_user_failed')
        }
      } else {
        userId = newUser?.user?.id
      }
    }

    if (!userId) {
      console.error('[Auth] Could not resolve user ID')
      return res.redirect('/?auth_error=no_user_id')
    }

    // 4. Set a one-time password and pass credentials to client
    //    signInWithPassword is the most reliable Supabase auth method
    const oneTimePass = randomBytes(32).toString('hex')
    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password: oneTimePass,
      user_metadata: userMeta,
    })

    if (updateError) {
      console.error('[Auth] Update password failed:', updateError)
      return res.redirect('/?auth_error=update_failed')
    }

    // 5. Redirect to app with credentials — client calls signInWithPassword (a fetch, not redirect)
    const payload = Buffer.from(JSON.stringify({ e: userEmail, p: oneTimePass })).toString('base64')
    res.redirect(`/?auth_cred=${encodeURIComponent(payload)}`)
  } catch (err) {
    console.error('[Auth] Unexpected error:', err.message)
    res.redirect('/?auth_error=server_error')
  }
}
