import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

// In production, proxy all Supabase calls through our Vercel domain
// to bypass mobile carriers that block supabase.co
const proxyUrl = import.meta.env.PROD
  ? `${window.location.origin}/api/supabase`
  : supabaseUrl

export const supabase = createClient(proxyUrl, supabaseAnonKey)
