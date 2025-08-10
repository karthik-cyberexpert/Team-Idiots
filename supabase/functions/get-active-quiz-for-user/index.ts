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

    const { data: sets, error: setError } = await supabase
      .from('quiz_sets')
      .select('*, quiz_questions(*)')
      .eq('status', 'published')
      .not('assign_date', 'is', null)
      .not('start_time', 'is', null)
      .not('end_time', 'is', null);

    if (setError) throw setError;
    if (!sets || sets.length === 0) {
      return new Response(JSON.stringify(null), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const now = new Date(); // Current UTC time

    const activeSet = sets.find(set => {
      const [startH, startM] = set.start_time.split(':').map(Number);
      const startDateTime = new Date(set.assign_date);
      startDateTime.setUTCHours(startH, startM, 0, 0);

      const [endH, endM] = set.end_time.split(':').map(Number);
      const endDateTime = new Date(set.assign_date);
      endDateTime.setUTCHours(endH, endM, 0, 0);

      return now >= startDateTime && now <= endDateTime;
    });

    if (!activeSet) {
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