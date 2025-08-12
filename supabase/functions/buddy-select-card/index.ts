import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

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
    const { pairId, cardChoice } = await req.json();
    if (!pairId || !cardChoice) {
      throw new Error("Buddy pair ID and card choice are required.");
    }

    const supabase = await getAuthenticatedClient(req);
    
    const { data, error } = await supabase.rpc('select_buddy_card', {
      p_pair_id: pairId,
      p_card_choice: cardChoice
    });

    if (error) throw error; // For network/postgres errors

    // Check for application-level errors returned from the function
    if (data && data.error) {
      throw new Error(data.error);
    }

    return new Response(JSON.stringify(data), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})