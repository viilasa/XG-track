import { useEffect, useState, useCallback } from 'react'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'
import type { Profile } from '@/types'

interface AuthState {
  user: User | null
  session: Session | null
  profile: Profile | null
  loading: boolean
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    profile: null,
    loading: true,
  })

  const syncProfile = useCallback(async (user: User) => {
    const meta = user.user_metadata as Record<string, string | undefined>

    // Extract twitter_id from all possible metadata keys
    let twitterId: string | null =
      meta.provider_id ??
      meta.sub ??
      meta.user_id ??
      meta.id ??
      null

    // Ultimate fallback: Supabase stores provider ID in identities array
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
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setState((prev) => ({ ...prev, user: session.user, session, loading: false }))
        syncProfile(session.user)
      } else {
        setState((prev) => ({ ...prev, loading: false }))
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setState((prev) => ({ ...prev, user: session.user, session, loading: false }))
        syncProfile(session.user)
      } else {
        setState({ user: null, session: null, profile: null, loading: false })
      }
    })

    return () => subscription.unsubscribe()
  }, [syncProfile])

  const signIn = useCallback(async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'x' as any,
      options: { redirectTo: window.location.origin },
    })
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
