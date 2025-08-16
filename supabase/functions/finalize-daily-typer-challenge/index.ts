import { serve } from "https://deno.land/std@0.200.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // This function is meant to be called by a cron job.
  // A simple secret in the header can prevent unauthorized calls.
  const authHeader = req.headers.get('Authorization')
  const functionSecret = Deno.env.get('FINALIZE_CHALLENGE_SECRET')

  if (!functionSecret || authHeader !== `Bearer ${functionSecret}`) {
    return new Response("Unauthorized: Incorrect or missing secret.", { status: 401 })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Get all users who have completed at least one daily typer task today.
    const today_start = new Date();
    today_start.setUTCHours(0, 0, 0, 0);
    const today_end = new Date();
    today_end.setUTCHours(23, 59, 59, 999);

    const { data: participants, error: participantsError } = await supabaseAdmin
      .from('typing_game_results')
      .select('user_id')
      .gte('created_at', today_start.toISOString())
      .lte('created_at', today_end.toISOString());

    if (participantsError) throw participantsError;

    // Get unique user IDs
    const userIds = [...new Set(participants.map(p => p.user_id))];

    if (userIds.length === 0) {
      return new Response(
        JSON.stringify({ message: "No participants found for today's typer challenge." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // For each participant, call the award_daily_typer_bonus function.
    // This function will calculate and award points if they have 5 completed tasks.
    const results = [];
    for (const userId of userIds) {
      const { error: rpcError } = await supabaseAdmin.rpc('award_daily_typer_bonus', {
        p_user_id: userId,
      });
      if (rpcError) {
        results.push({ userId, status: 'error', message: rpcError.message });
      } else {
        results.push({ userId, status: 'success' });
      }
    }

    return new Response(
      JSON.stringify({ message: "Daily typer challenge finalized.", results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})