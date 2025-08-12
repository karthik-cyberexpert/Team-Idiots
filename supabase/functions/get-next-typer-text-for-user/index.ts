// @ts-nocheck
import { serve } from "https://deno.land/std@0.200.0/http/server.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getAuthenticatedClient(req: Request): Promise<SupabaseClient> {
  const authHeader = req.headers.get('Authorization')!
  if (!authHeader) {
    throw new Error("Missing Authorization header");
  }
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

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Get all published typer sets, ordered oldest to newest
    const { data: sets, error: setsError } = await supabaseAdmin
      .from('typer_sets')
      .select('id, title, typing_texts(id, created_at)')
      .eq('status', 'published')
      .order('created_at', { ascending: true });
    if (setsError) throw setsError;

    // 2. Get all completed text IDs for the user
    const { data: results, error: resultsError } = await supabaseAdmin
      .from('typing_game_results')
      .select('text_id')
      .eq('user_id', user.id);
    if (resultsError) throw resultsError;
    const completedTextIds = new Set(results.map(r => r.text_id));

    // 3. Find the next text to serve
    let nextTextId = null;
    for (const set of sets) {
      const sortedTextsInSet = set.typing_texts.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const textIdsInSet = sortedTextsInSet.map(t => t.id);
      
      const uncompletedTextsInSet = textIdsInSet.filter(id => !completedTextIds.has(id));

      if (uncompletedTextsInSet.length > 0) {
        nextTextId = uncompletedTextsInSet[0];
        break;
      }
    }

    // 4. If a text was found, fetch its full details
    if (nextTextId) {
      const { data: textData, error: textError } = await supabaseAdmin
        .from('typing_texts')
        .select('*, typer_sets(*)')
        .eq('id', nextTextId)
        .single();
      if (textError) throw textError;
      return new Response(JSON.stringify(textData), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } else {
      // User has completed everything
      return new Response(JSON.stringify(null), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})