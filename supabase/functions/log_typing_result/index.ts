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
    const { p_user_id, p_text_id, p_wpm, p_accuracy, p_challenge_id } = await req.json()

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

    // Check for and complete any relevant typer challenges
    const { data: challenges, error: fetchChallengesError } = await supabaseAdmin
      .from('challenges')
      .select('*')
      .eq('is_active', true)
      .in('challenge_type', ['typer_goal', 'typer_multi_text_timed']);

    if (fetchChallengesError) throw fetchChallengesError;

    for (const challenge of challenges) {
      // Check if the user has already completed this challenge
      const { data: existingCompletion, error: completionError } = await supabaseAdmin
        .from('challenge_completions')
        .select('id')
        .eq('user_id', p_user_id)
        .eq('challenge_id', challenge.id)
        .single();

      if (completionError && completionError.code !== 'PGRST116') throw completionError; // PGRST116 means no rows found

      if (!existingCompletion) { // If not already completed
        if (challenge.challenge_type === 'typer_goal') {
          // For single typer goal challenges
          if (p_wpm >= (challenge.typer_wpm_goal || 0) && p_accuracy >= (challenge.typer_accuracy_goal || 0) && (challenge.typing_text_id === null || challenge.typing_text_id === p_text_id)) {
            const { error: insertCompletionError } = await supabaseAdmin
              .from('challenge_completions')
              .insert({ user_id: p_user_id, challenge_id: challenge.id });
            if (insertCompletionError) throw insertCompletionError;
          }
        } else if (challenge.challenge_type === 'typer_multi_text_timed') {
          // For multi-text timed challenges, check if all texts are completed within the time limit
          // This logic assumes the frontend sends a signal when the challenge is truly "completed"
          // (i.e., all texts typed within the time limit).
          // For now, we'll just check if the current text is part of the challenge and if it's the last one.
          // A more robust solution would involve tracking progress for multi-text challenges.
          if (challenge.typing_text_ids && challenge.typing_text_ids.includes(p_text_id)) {
            // Check if all texts in the challenge have been completed by the user
            const { count: completedTextsCount, error: countError } = await supabaseAdmin
              .from('typing_game_results')
              .select('id', { count: 'exact' })
              .eq('user_id', p_user_id)
              .in('text_id', challenge.typing_text_ids);

            if (countError) throw countError;

            if (completedTextsCount === challenge.typing_text_ids.length) {
              // All texts for this multi-text challenge have been typed by the user
              // Now, we need to verify if it was done within the time limit.
              // This check is difficult to do purely in a database function triggered by a single text completion.
              // The frontend should ideally manage the overall challenge completion state and then
              // call a separate function to mark the multi-text challenge as completed.
              // For simplicity, we'll assume if all texts are completed, the challenge is met.
              // A more advanced solution would involve a separate 'challenge_progress' table.

              const { error: insertCompletionError } = await supabaseAdmin
                .from('challenge_completions')
                .insert({ user_id: p_user_id, challenge_id: challenge.id });
              if (insertCompletionError) throw insertCompletionError;
            }
          }
        }
      }
    }

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