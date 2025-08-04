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
    const { p_user_id, p_text_id, p_wpm, p_accuracy } = await req.json()

    if (!p_user_id || !p_text_id || typeof p_wpm !== 'number' || typeof p_accuracy !== 'number') {
      throw new Error("User ID, text ID, WPM, and accuracy are required.")
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Calculate points with a new formula, capped at 25 points.
    // Formula: (WPM / 10) * (Accuracy / 100) * 2.5, rounded.
    let calculated_points = Math.min(25, Math.round((p_wpm / 10.0) * (p_accuracy / 100.0) * 2.5));

    // Ensure a minimum of 1 point is awarded for successful completion.
    if (calculated_points < 1) {
      calculated_points = 1;
    }

    // Insert the game result
    const { error: insertResultError } = await supabaseAdmin
      .from('typing_game_results')
      .insert({ user_id: p_user_id, text_id: p_text_id, wpm: p_wpm, accuracy: p_accuracy, points_awarded: calculated_points });

    if (insertResultError) throw insertResultError;

    // Update the user's total game points
    const { data: profile, error: fetchProfileError } = await supabaseAdmin
      .from('profiles')
      .select('game_points')
      .eq('id', p_user_id)
      .single();

    if (fetchProfileError) throw fetchProfileError;
    if (!profile) throw new Error("User profile not found.");

    const { error: updateProfileError } = await supabaseAdmin
      .from('profiles')
      .update({ game_points: profile.game_points + calculated_points })
      .eq('id', p_user_id);

    if (updateProfileError) throw updateProfileError;

    return new Response(
      JSON.stringify(calculated_points),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})