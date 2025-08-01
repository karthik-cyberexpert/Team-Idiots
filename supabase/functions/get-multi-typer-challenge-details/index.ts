import { serve } from "https://deno.land/std@0.200.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { challenge_id } = await req.json();

    if (!challenge_id) {
      throw new Error("Challenge ID is required.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // 1. Fetch the multi-text challenge details
    const { data: challenge, error: challengeError } = await supabaseAdmin
      .from('challenges')
      .select('title, description, xp_reward, game_points_reward, time_limit_seconds, typing_text_ids')
      .eq('id', challenge_id)
      .eq('challenge_type', 'typer_multi_text_timed')
      .single();

    if (challengeError) throw challengeError;
    if (!challenge) throw new Error("Multi-text typer challenge not found or is not of the correct type.");

    // 2. Fetch the associated typing texts
    const { data: typingTexts, error: textsError } = await supabaseAdmin
      .from('typing_texts')
      .select('title, content')
      .in('id', challenge.typing_text_ids || []);

    if (textsError) throw textsError;

    const formattedTexts = typingTexts.map(text => ({
      header: text.title,
      code: text.content,
    }));

    const responseData = {
      challenge_title: challenge.title,
      challenge_description: challenge.description,
      xp_reward: challenge.xp_reward,
      game_points_reward: challenge.game_points_reward,
      max_time_seconds: challenge.time_limit_seconds,
      texts: formattedTexts,
    };

    return new Response(
      JSON.stringify(responseData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});