import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
// Accept the standard VITE_SUPABASE_ANON_KEY and fall back to the legacy
// VITE_SUPABASE_PUBLISHABLE_KEY used by earlier versions of this admin app.
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[RxFx Admin] Supabase env vars are missing. Auth will be unavailable until VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY) are set."
  );
}

/**
 * @type {import('../types/database.types').Database}
 */
export const supabase = createClient(supabaseUrl || "https://placeholder.supabase.co", supabaseAnonKey || "placeholder", {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})
