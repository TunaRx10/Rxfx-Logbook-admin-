import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
// Accept the standard VITE_SUPABASE_ANON_KEY and fall back to the legacy
// VITE_SUPABASE_PUBLISHABLE_KEY used by earlier versions of this admin app.
// Clé anon (publique) du projet Supabase partagé. Utilisée en fallback si
// VITE_SUPABASE_ANON_KEY / VITE_SUPABASE_PUBLISHABLE_KEY ne sont pas définies
// côté Vercel (sinon le client reçoit « Invalid API key »).
const DEFAULT_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93dGZ1bWtpamRhc29rb2tmbXNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxNTQ2MTAsImV4cCI6MjA5OTczMDYxMH0.2B0Q1nvsMxmC6miB0y7hqScVkE7ZcMZvK9GNgjNiZSk";

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || DEFAULT_ANON_KEY

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
