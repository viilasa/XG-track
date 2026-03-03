import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// In production, proxy all Supabase calls through our Vercel domain
// to bypass mobile carriers that block supabase.co
const proxyUrl = import.meta.env.PROD
  ? `${window.location.origin}/api/supabase`
  : supabaseUrl

// Use a fixed storage key so it matches what /api/auth/callback writes
const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
export const STORAGE_KEY = `sb-${projectRef}-auth-token`

export const supabase = createClient(proxyUrl, supabaseAnonKey, {
  auth: { storageKey: STORAGE_KEY },
})
