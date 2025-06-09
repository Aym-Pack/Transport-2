import { createClient } from '@supabase/supabase-js'

// Ensure environment variables are available
// These are typically set in the Supabase project settings for Edge Functions
const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

if (!supabaseUrl) {
  console.error('ERROR: SUPABASE_URL environment variable is not set.')
}
if (!supabaseServiceKey) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY environment variable is not set.')
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    // It's common to persist session for server-side clients if needed,
    // but for service_role key, it typically bypasses RLS directly.
    // For edge functions, ensure your RLS policies are appropriate if not using service_role.
    persistSession: false,
    autoRefreshToken: false,
    // detectSessionInUrl: false, // Only for client-side
  }
})
