import { serve } from "https://deno.land/std@0.200.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const payload = await req.json();
    const newRecord = payload.new_record; // This is the new challenge_completion record

    // Create a Supabase client with the service role key to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Fetch the challenge details to get the rewards
    const { data: challenge, error: fetchChallengeError } = await supabaseAdmin
      .from('challenges')
      .select('xp_reward, game_points_reward, title')
      .eq('id', newRecord.challenge_id)
      .single();

    if (fetchChallengeError) throw fetchChallengeError;
    if (!challenge) throw new Error("Challenge not found.");

    const xp_to_award = challenge.xp_reward;
    const game_points_to_award = challenge.game_points_reward;
    const challenge_title = challenge.title;

    // Fetch current profile to update game_points
    const { data: profile, error: fetchProfileError } = await supabaseAdmin
      .from('profiles')
      .select('game_points')
      .eq('id', newRecord.user_id)
      .single();

    if (fetchProfileError) throw fetchProfileError;
    if (!profile) throw new Error("User profile not found.");

    // Update only game_points for challenge completion
    const { error: updateProfileError } = await supabaseAdmin
      .from('profiles')
      .update({
        game_points: profile.game_points + game_points_to_award,
      })
      .eq('id', newRecord.user_id);

    if (updateProfileError) throw updateProfileError;

    // Log XP change if XP was awarded (though for challenges, it's now only game points)
    // This part is kept for consistency with the xp_history table, but xp_to_award will be 0 for challenges
    // if the intent is truly "no xp for challenges".
    // If you want to completely remove XP from challenges, you might set xp_reward to 0 in the challenges table.
    if (xp_to_award > 0) {
      const { error: logXpError } = await supabaseAdmin
        .from('xp_history')
        .insert({ user_id: newRecord.user_id, xp_change: xp_to_award, reason: 'Challenge completed: ' + challenge_title, related_task_id: null });
      if (logXpError) throw logXpError;
    }


    return new Response(
      JSON.stringify({ message: "Challenge rewards awarded successfully" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})