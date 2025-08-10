import { serve } from "https://deno.land/std@0.200.0/http/server.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getAuthenticatedClient(req: Request): Promise<SupabaseClient> {
  const authHeader = req.headers.get('Authorization')!
  if (!authHeader) throw new Error("Missing Authorization header");
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  )
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { quizSetId, penaltyAmount } = await req.json();
    if (!quizSetId || typeof penaltyAmount !== 'number') {
      throw new Error("Quiz Set ID and penalty amount are required.");
    }

    const supabase = await getAuthenticatedClient(req);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Check if user already has a result for this quiz to prevent applying a penalty after completion.
    const { count: existingResult } = await supabaseAdmin
      .from('quiz_results')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('quiz_set_id', quizSetId);

    if (existingResult && existingResult > 0) {
      return new Response(JSON.stringify({ message: "Quiz already completed. No penalty applied." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2. Get user's current game points
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('game_points')
      .eq('id', user.id)
      .single();

    if (profileError) throw profileError;
    if (!profile) throw new Error("User profile not found.");

    // 3. Deduct points (ensure it doesn't go below zero)
    const newGamePoints = Math.max(0, profile.game_points - penaltyAmount);
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ game_points: newGamePoints })
      .eq('id', user.id);

    if (updateError) throw updateError;

    // NOTE: We no longer log a failed attempt, allowing the user to retry.
    // The penalty is the consequence for leaving early.

    return new Response(JSON.stringify({ message: `Quiz attempt ended. ${penaltyAmount} GP has been deducted.` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})