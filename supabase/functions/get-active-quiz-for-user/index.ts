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
    const supabase = await getAuthenticatedClient(req);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const currentTimeStr = `${String(today.getUTCHours()).padStart(2, '0')}:${String(today.getUTCMinutes()).padStart(2, '0')}`;

    const { data: activeSet, error: setError } = await supabase
      .from('quiz_sets')
      .select('*, quiz_questions(*)')
      .eq('status', 'published')
      .eq('assign_date', todayStr)
      .lte('start_time', currentTimeStr)
      .gte('end_time', currentTimeStr)
      .single();

    if (setError || !activeSet) {
      return new Response(JSON.stringify(null), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const questionIds = activeSet.quiz_questions.map(q => q.id);
    const { data: results, error: resultsError } = await supabase
      .from('quiz_results')
      .select('question_id')
      .eq('user_id', user.id)
      .in('question_id', questionIds);

    if (resultsError) throw resultsError;

    const answeredQuestionIds = new Set(results.map(r => r.question_id));
    const remainingQuestions = activeSet.quiz_questions.filter(q => !answeredQuestionIds.has(q.id));

    // Shuffle remaining questions
    for (let i = remainingQuestions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remainingQuestions[i], remainingQuestions[j]] = [remainingQuestions[j], remainingQuestions[i]];
    }

    const response = {
      ...activeSet,
      quiz_questions: remainingQuestions,
    };

    return new Response(JSON.stringify(response), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})