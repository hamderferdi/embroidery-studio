import { createClient } from '@supabase/supabase-js'

// These will be replaced with real values from your Supabase project.
// Create a .env file at frontend/.env with:
//   VITE_SUPABASE_URL=https://xxxx.supabase.co
//   VITE_SUPABASE_ANON_KEY=your-anon-key
const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL      ?? 'https://placeholder.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? 'placeholder-key'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export type SupabaseUser = Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user']
