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
    const { quizSetId, answers } = await req.json();
    if (!quizSetId || !Array.isArray(answers)) {
      throw new Error("Quiz Set ID and answers array are required.");
    }

    const supabase = await getAuthenticatedClient(req);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Fetch quiz set and its questions
    const { data: quizSet, error: setError } = await supabaseAdmin
      .from('quiz_sets')
      .select('*, quiz_questions(id, correct_option_index)')
      .eq('id', quizSetId)
      .single();
    
    if (setError) throw setError;
    if (!quizSet) throw new Error("Quiz set not found.");

    // 2. Check if user already completed this quiz
    const { count: existingResult } = await supabaseAdmin
      .from('quiz_results')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('quiz_set_id', quizSetId);

    if (existingResult && existingResult > 0) {
      throw new Error("You have already completed this quiz.");
    }

    // 3. Calculate score
    const questionMap = new Map(quizSet.quiz_questions.map(q => [q.id, q.correct_option_index]));
    let correctCount = 0;
    for (const answer of answers) {
      if (questionMap.get(answer.questionId) === answer.selectedIndex) {
        correctCount++;
      }
    }

    // 4. Calculate points, apply boosts, and update profile
    let pointsAwarded = correctCount * quizSet.points_per_question;

    const { data: boosts, error: boostError } = await supabaseAdmin
      .from('user_power_ups')
      .select('power_type')
      .eq('user_id', user.id)
      .eq('is_used', false)
      .gt('expires_at', new Date().toISOString());
    
    if (boostError) throw boostError;

    let boost_multiplier = 1;
    if (boosts && boosts.some(b => b.power_type === '4x_boost')) {
      boost_multiplier = 4;
    } else if (boosts && boosts.some(b => b.power_type === '2x_boost')) {
      boost_multiplier = 2;
    }

    pointsAwarded = pointsAwarded * boost_multiplier;

    if (pointsAwarded > 0) {
      if (quizSet.reward_type === 'gp') {
        await supabaseAdmin.rpc('increment_profile_column', {
          p_user_id: user.id,
          p_column_name: 'game_points',
          p_increment_value: pointsAwarded
        });
      } else if (quizSet.reward_type === 'xp') {
        const { data: profile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('staged_xp')
          .eq('id', user.id)
          .single();
        
        if (profileError) throw profileError;

        const newStagedXp = (profile.staged_xp || 0) + pointsAwarded;

        await supabaseAdmin
          .from('profiles')
          .update({ staged_xp: newStagedXp })
          .eq('id', user.id);

        await supabaseAdmin.from('xp_history').insert({ user_id: user.id, xp_change: pointsAwarded, reason: `Quiz completed: ${quizSet.title}` });
      }
    }

    // 5. Log the result
    const { error: resultError } = await supabaseAdmin.from('quiz_results').insert({
      user_id: user.id,
      quiz_set_id: quizSetId,
      score: correctCount,
      points_awarded: pointsAwarded
    });
    if (resultError) throw resultError;

    // 6. Find the next available quiz for the user
    const now = new Date().toISOString();
    const { data: allSets, error: allSetsError } = await supabaseAdmin
      .from('quiz_sets')
      .select('*, quiz_questions(*)')
      .eq('status', 'published')
      .or(`enrollment_deadline.is.null,enrollment_deadline.gte.${now}`)
      .order('created_at', { ascending: false });
    if (allSetsError) throw allSetsError;

    const { data: allResults, error: allResultsError } = await supabaseAdmin
      .from('quiz_results')
      .select('quiz_set_id')
      .eq('user_id', user.id);
    if (allResultsError) throw allResultsError;
    const completedSetIds = new Set(allResults.map(r => r.quiz_set_id));

    const nextQuiz = allSets.find(set => !completedSetIds.has(set.id) && set.quiz_questions && set.quiz_questions.length > 0) || null;

    return new Response(JSON.stringify({ correctCount, pointsAwarded, nextQuiz }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})