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

    const now = new Date().toISOString();

    // 1. Fetch all published quiz sets that haven't expired
    const { data: sets, error: setError } = await supabase
      .from('quiz_sets')
      .select('id, title, reward_type, points_per_question, time_limit_minutes, enrollment_deadline, quiz_questions(id)')
      .eq('status', 'published')
      .or(`enrollment_deadline.is.null,enrollment_deadline.gte.${now}`)
      .order('created_at', { ascending: false });

    if (setError) throw setError;
    if (!sets || sets.length === 0) {
      return new Response(JSON.stringify(null), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2. Fetch all of the user's completed quiz set IDs
    const { data: results, error: resultsError } = await supabase
      .from('quiz_results')
      .select('quiz_set_id')
      .eq('user_id', user.id);
    
    if (resultsError) throw resultsError;
    const completedSetIds = new Set(results.map(r => r.quiz_set_id));

    // 3. Find the first set that is not completed by the user
    const activeSetInfo = sets.find(set => !completedSetIds.has(set.id));

    if (!activeSetInfo) {
      return new Response(JSON.stringify(null), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 4. Fetch the full data for the active set, including questions and options
    const { data: fullSetData, error: fullSetError } = await supabase
      .from('quiz_sets')
      .select('*, quiz_questions(*)')
      .eq('id', activeSetInfo.id)
      .single();

    if (fullSetError) throw fullSetError;

    return new Response(JSON.stringify(fullSetData), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})