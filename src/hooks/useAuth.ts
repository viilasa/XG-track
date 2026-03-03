import { useEffect, useState, useCallback } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import { initiateTwitterOAuth } from '@/lib/twitterOAuth'
import type { Profile } from '@/types'

interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
  authError: string | null
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    loading: true,
    authError: null,
  })

  const syncProfile = useCallback(async (user: User) => {
    const meta = user.user_metadata as Record<string, string | undefined>

    // Extract twitter_id — check all keys set by both old Supabase OAuth and our new flow
    let twitterId: string | null =
      meta.provider_id ??
      meta.twitter_id ??
      meta.sub ??
      meta.user_id ??
      meta.id ??
      null

    // Fallback: Supabase stores provider ID in identities array
    if (!twitterId && user.identities && user.identities.length > 0) {
      twitterId = user.identities[0].id ?? null
    }

    const twitterUsername =
      meta.user_name ?? meta.preferred_username ?? meta.screen_name ?? null

    const twitterName = meta.full_name ?? meta.name ?? null

    const twitterAvatar = meta.avatar_url ?? meta.picture ?? null

    if (import.meta.env.DEV) {
      console.log('[XG] Auth metadata:', JSON.stringify(meta, null, 2))
      console.log('[XG] Identities:', JSON.stringify(user.identities, null, 2))
      console.log('[XG] Resolved twitter_id:', twitterId, 'username:', twitterUsername)
    }

    const { data } = await supabase
      .from('profiles')
      .upsert(
        {
          id: user.id,
          twitter_id: twitterId,
          twitter_username: twitterUsername,
          twitter_name: twitterName,
          twitter_avatar: twitterAvatar,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      )
      .select()
      .single()

    if (data) {
      setState((prev) => ({ ...prev, profile: data as Profile }))
    }
  }, [])

  useEffect(() => {
    const handleOAuthCallback = async () => {
      // Check for auth error in query params
      const params = new URLSearchParams(window.location.search)
      const authError = params.get('auth_error')

      if (authError) {
        window.history.replaceState({}, '', '/')
        setState((prev) => ({ ...prev, loading: false, authError }))
        return
      }

      // Check for auth credentials in localStorage (set by /api/auth/callback HTML page)
      const authCred = localStorage.getItem('xg_auth_cred')
      if (authCred) {
        localStorage.removeItem('xg_auth_cred')
        try {
          const { e: email, p: password } = JSON.parse(atob(authCred))
          // signInWithPassword is a fetch call to supabase.co — not a browser redirect
          const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
          })
          if (error) {
            setState((prev) => ({ ...prev, loading: false, authError: error.message }))
          } else if (data?.user) {
            setState((prev) => ({
              ...prev,
              user: data.user,
              session: data.session,
              loading: false,
              authError: null,
            }))
            syncProfile(data.user)
          } else {
            setState((prev) => ({
              ...prev,
              loading: false,
              authError: 'Sign in failed — no user returned',
            }))
          }
        } catch (err) {
          setState((prev) => ({
            ...prev,
            loading: false,
            authError: `Auth parse error: ${err instanceof Error ? err.message : String(err)}`,
          }))
        }
        return
      }

      // Normal session restore
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setState((prev) => ({ ...prev, user: session.user, session, loading: false }))
          syncProfile(session.user)
        } else {
          setState((prev) => ({ ...prev, loading: false }))
        }
      })
    }

    handleOAuthCallback()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setState((prev) => ({
          ...prev,
          user: session.user,
          session,
          loading: false,
          authError: null,
        }))
        syncProfile(session.user)
      } else {
        setState({ user: null, session: null, profile: null, loading: false, authError: null })
      }
    })

    return () => subscription.unsubscribe()
  }, [syncProfile])

  const signIn = useCallback(async () => {
    await initiateTwitterOAuth()
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!state.user) return
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', state.user.id)
      .single()
    if (data) setState((prev) => ({ ...prev, profile: data as Profile }))
  }, [state.user])

  return { ...state, signIn, signOut, refreshProfile }
}
