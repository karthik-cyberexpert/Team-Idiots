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

    // 4. Calculate points and update profile
    const pointsAwarded = correctCount * quizSet.points_per_question;
    if (pointsAwarded > 0) {
      const { data: profile, error: profileError } = await supabaseAdmin.from('profiles').select(quizSet.reward_type).eq('id', user.id).single();
      if (profileError) throw profileError;

      const currentPoints = profile[quizSet.reward_type] || 0;
      const newPoints = currentPoints + pointsAwarded;

      const { error: updateError } = await supabaseAdmin.from('profiles').update({ [quizSet.reward_type]: newPoints }).eq('id', user.id);
      if (updateError) throw updateError;

      if (quizSet.reward_type === 'xp') {
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

    return new Response(JSON.stringify({ correctCount, pointsAwarded }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})