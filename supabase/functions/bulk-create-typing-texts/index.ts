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
    const textsToUpload = await req.json()
    if (!Array.isArray(textsToUpload)) {
      throw new Error("Request body must be an array of texts.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const textsToInsert = textsToUpload.map(text => {
      if (!text.header || !text.code) {
        throw new Error("Each text object must have 'header' and 'code' properties.");
      }
      return {
        title: text.header,
        content: text.code,
      };
    });

    if (textsToInsert.length === 0) {
      return new Response(
        JSON.stringify({ message: "No texts to upload." }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Insert typing texts and get their IDs
    const { data: insertedTexts, error: insertTextsError } = await supabaseAdmin
      .from('typing_texts')
      .insert(textsToInsert)
      .select('id, title'); // Select ID and title for challenge creation

    if (insertTextsError) throw insertTextsError;

    // Create corresponding challenges for each new typing text
    const challengesToInsert = insertedTexts.map(text => ({
      title: `Typer Challenge: ${text.title}`,
      description: `Complete this typing test to earn rewards.`,
      xp_reward: 0, // Default XP
      game_points_reward: 0, // Default Game Points
      type: 'one-time', // Default type
      is_active: true, // Active by default
      challenge_type: 'typer_goal',
      typing_text_id: text.id, // Link to the newly created typing text
      typer_wpm_goal: null, // Admin can set this later
      typer_accuracy_goal: null, // Admin can set this later
      time_limit_seconds: null, // Admin can set this later
    }));

    const { error: insertChallengesError } = await supabaseAdmin
      .from('challenges')
      .insert(challengesToInsert);

    if (insertChallengesError) throw insertChallengesError;

    return new Response(
      JSON.stringify({ message: `${textsToInsert.length} typing texts and corresponding challenges uploaded successfully.` }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})