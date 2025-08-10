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
    // Authenticate user to get their ID
    const supabaseUserClient = await getAuthenticatedClient(req);
    const { data: { user } } = await supabaseUserClient.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    // Use admin client for all data fetching to bypass RLS issues with joins
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const now = new Date().toISOString();

    // 1. Fetch all published quiz sets that haven't expired, with all their questions
    const { data: sets, error: setError } = await supabaseAdmin
      .from('quiz_sets')
      .select('*, quiz_questions(*)')
      .eq('status', 'published')
      .or(`enrollment_deadline.is.null,enrollment_deadline.gte.${now}`)
      .order('created_at', { ascending: false });

    if (setError) throw setError;
    if (!sets || sets.length === 0) {
      return new Response(JSON.stringify(null), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // 2. Fetch all of the user's completed quiz set IDs
    const { data: results, error: resultsError } = await supabaseAdmin
      .from('quiz_results')
      .select('quiz_set_id')
      .eq('user_id', user.id);
    
    if (resultsError) throw resultsError;
    const completedSetIds = new Set(results.map(r => r.quiz_set_id));

    // 3. Find the first set that is not completed by the user and has questions
    const activeSet = sets.find(set => !completedSetIds.has(set.id) && set.quiz_questions && set.quiz_questions.length > 0);

    if (!activeSet) {
      return new Response(JSON.stringify(null), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify(activeSet), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})