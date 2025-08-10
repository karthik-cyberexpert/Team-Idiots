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

    // 1. Fetch all published quiz sets with their question IDs
    const { data: sets, error: setError } = await supabase
      .from('quiz_sets')
      .select('*, quiz_questions(id)')
      .eq('status', 'published')
      .order('created_at', { ascending: false }); // Get newest first

    if (setError) throw setError;
    if (!sets || sets.length === 0) {
      return new Response(JSON.stringify(null), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2. Fetch all of the user's answered question IDs
    const { data: results, error: resultsError } = await supabase
      .from('quiz_results')
      .select('question_id')
      .eq('user_id', user.id);
    
    if (resultsError) throw resultsError;
    const answeredQuestionIds = new Set(results.map(r => r.question_id));

    // 3. Find the first set that is not fully completed by the user
    let activeSet = null;
    for (const set of sets) {
      const totalQuestions = set.quiz_questions.length;
      if (totalQuestions === 0) continue; // Skip empty sets

      const answeredInSet = set.quiz_questions.filter(q => answeredQuestionIds.has(q.id)).length;
      
      if (answeredInSet < totalQuestions) {
        activeSet = set;
        break; // Found the most recent, incomplete set
      }
    }

    if (!activeSet) {
      return new Response(JSON.stringify(null), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 4. Fetch the full data for the active set, including questions and options
    const { data: fullSetData, error: fullSetError } = await supabase
      .from('quiz_sets')
      .select('*, quiz_questions(*)')
      .eq('id', activeSet.id)
      .single();

    if (fullSetError) throw fullSetError;

    // 5. Filter out questions the user has already answered in this set
    const remainingQuestions = fullSetData.quiz_questions.filter(q => !answeredQuestionIds.has(q.id));
    
    // Shuffle the remaining questions
    for (let i = remainingQuestions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [remainingQuestions[i], remainingQuestions[j]] = [remainingQuestions[j], remainingQuestions[i]];
    }

    const response = {
      ...fullSetData,
      quiz_questions: remainingQuestions,
    };

    return new Response(JSON.stringify(response), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})