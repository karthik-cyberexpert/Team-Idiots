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
    const challengesToCreate = await req.json()
    if (!Array.isArray(challengesToCreate)) {
      throw new Error("Request body must be an array of challenge definitions.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const createdChallenges = [];

    for (const challengeDef of challengesToCreate) {
      const { title, content, xp_reward, game_points_reward, wpm_goal, accuracy_goal, description } = challengeDef;

      if (!title || !content || typeof xp_reward !== 'number' || typeof game_points_reward !== 'number' || typeof wpm_goal !== 'number' || typeof accuracy_goal !== 'number') {
        throw new Error("Each challenge definition must have title, content, xp_reward, game_points_reward, wpm_goal, and accuracy_goal.");
      }

      // 1. Insert the typing text
      const { data: typingText, error: typingTextError } = await supabaseAdmin
        .from('typing_texts')
        .insert({ title, content })
        .select('id')
        .single();

      if (typingTextError) throw typingTextError;
      if (!typingText) throw new Error("Failed to create typing text for challenge.");

      // 2. Insert the challenge, linking it to the new typing text
      const { data: challenge, error: challengeError } = await supabaseAdmin
        .from('challenges')
        .insert({
          title,
          description: description || null,
          xp_reward,
          game_points_reward,
          type: 'one-time', // Default to one-time for typer challenges
          is_active: true,
          challenge_type: 'typer_goal',
          related_task_id: null, // Not related to a task
          typer_wpm_goal: wpm_goal,
          typer_accuracy_goal: accuracy_goal,
          typing_text_id: typingText.id, // Link to the newly created typing text
        })
        .select()
        .single();

      if (challengeError) throw challengeError;
      createdChallenges.push(challenge);
    }

    return new Response(
      JSON.stringify({ message: `${createdChallenges.length} typer challenges created successfully.`, data: createdChallenges }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})