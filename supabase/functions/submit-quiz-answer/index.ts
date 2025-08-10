import { serve } from "https://deno.land/std@0.200.0/http/server.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getAuthenticatedClient(req: Request): Promise<SupabaseClient> {
  const authHeader = req.headers.get('Authorization')!
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
    const { questionId, selectedIndex } = await req.json();
    if (!questionId || selectedIndex === undefined) {
      throw new Error("Question ID and selected index are required.");
    }

    const supabase = await getAuthenticatedClient(req);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: question, error: qError } = await supabaseAdmin
      .from('quiz_questions')
      .select('correct_option_index, set_id')
      .eq('id', questionId)
      .single();
    if (qError) throw qError;

    const { data: set, error: sError } = await supabaseAdmin
      .from('quiz_sets')
      .select('reward_type, points_per_question')
      .eq('id', question.set_id)
      .single();
    if (sError) throw sError;

    const isCorrect = question.correct_option_index === selectedIndex;
    let pointsAwarded = 0;

    if (isCorrect) {
      pointsAwarded = set.points_per_question;
      
      // Map reward_type to the actual column name in the profiles table
      const rewardColumn = set.reward_type === 'gp' ? 'game_points' : 'xp';

      const { data: profile, error: pError } = await supabaseAdmin.from('profiles').select(rewardColumn).eq('id', user.id).single();
      if (pError) throw pError;

      const currentPoints = profile[rewardColumn] || 0;
      await supabaseAdmin.from('profiles').update({ [rewardColumn]: currentPoints + pointsAwarded }).eq('id', user.id);

      if (set.reward_type === 'xp') {
        await supabaseAdmin.from('xp_history').insert({ user_id: user.id, xp_change: pointsAwarded, reason: `Quiz question correct` });
      }
    }

    await supabaseAdmin.from('quiz_results').insert({
      user_id: user.id,
      question_id: questionId,
      points_awarded: pointsAwarded
    });

    return new Response(JSON.stringify({ correct: isCorrect, pointsAwarded }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})