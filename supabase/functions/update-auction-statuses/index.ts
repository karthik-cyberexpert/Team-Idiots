import { serve } from "https://deno.land/std@0.200.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // This function should be called by a cron job.
  const authHeader = req.headers.get('Authorization')
  const functionSecret = Deno.env.get('FINALIZE_CHALLENGE_SECRET') // Re-using an existing secret

  if (!functionSecret || authHeader !== `Bearer ${functionSecret}`) {
    return new Response("Unauthorized", { status: 401 })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const now = new Date().toISOString();

    // Transition scheduled auctions to active
    const { data: toActive, error: toActiveError } = await supabaseAdmin
      .from('auctions')
      .update({ status: 'active' })
      .eq('status', 'scheduled')
      .lte('start_time', now)
      .select('id');

    if (toActiveError) throw toActiveError;

    // Transition active auctions to ended
    const { data: toEnded, error: toEndedError } = await supabaseAdmin
      .from('auctions')
      .update({ status: 'ended' })
      .eq('status', 'active')
      .lte('end_time', now)
      .select('id');

    if (toEndedError) throw toEndedError;

    const message = `Updated auction statuses. Activated: ${toActive.length}. Ended: ${toEnded.length}.`;
    console.log(message);

    return new Response(
      JSON.stringify({ message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error updating auction statuses:', error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})