import { serve } from "https://deno.land/std@0.200.0/http/server.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Dual authorization check for cron job secret or admin JWT
    const authHeader = req.headers.get('Authorization')!
    const functionSecret = Deno.env.get('FINALIZE_CHALLENGE_SECRET')
    let isAuthorized = false;

    if (authHeader === `Bearer ${functionSecret}`) {
      isAuthorized = true;
    } else {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        { global: { headers: { Authorization: authHeader } } }
      )
      const { data: { user } } = await supabaseClient.auth.getUser()
      if (user) {
        const { data: profile } = await supabaseClient.from('profiles').select('role').eq('id', user.id).single()
        if (profile?.role === 'admin') {
          isAuthorized = true;
        }
      }
    }

    if (!isAuthorized) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders })
    }
    // End authorization check

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Deleting from the 'buddies' table will trigger the 'log_buddy_unpair' function
    // for each row, which updates the history table.
    const { error } = await supabaseAdmin
      .from('buddies')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000'); // A trick to delete all rows

    if (error) throw error;

    return new Response(
      JSON.stringify({ message: "All buddy pairs have been reset successfully." }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})