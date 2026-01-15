import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables. Check your .env file.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        // Persist session in localStorage to survive page refreshes and tab switches
        persistSession: true,
        // Storage key for the session
        storageKey: 'vall-strategy-auth',
        // Automatically refresh token before it expires
        autoRefreshToken: true,
        // Detect session from URL (for OAuth and magic links)
        detectSessionInUrl: true,
    },
})
