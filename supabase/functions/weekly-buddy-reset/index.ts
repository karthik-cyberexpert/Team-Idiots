import { serve } from "https://deno.land/std@0.200.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // This function should be called by a cron job or an admin.
  const authHeader = req.headers.get('Authorization')
  const functionSecret = Deno.env.get('FINALIZE_CHALLENGE_SECRET')

  if (!functionSecret || authHeader !== `Bearer ${functionSecret}`) {
    return new Response("Unauthorized", { status: 401 })
  }

  try {
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