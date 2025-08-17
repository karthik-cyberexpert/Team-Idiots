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

    // Fetch incoming requests (global or direct)
    const { data: incoming, error: incomingError } = await supabase
      .from('requests')
      .select('*, requester:requester_id(id, full_name)')
      .or(`recipient_id.eq.${user.id},is_global.eq.true`)
      .eq('status', 'pending')
      .neq('requester_id', user.id); // Don't show your own global requests as incoming
    if (incomingError) throw incomingError;

    // Fetch outgoing requests
    const { data: outgoing, error: outgoingError } = await supabase
      .from('requests')
      .select('*, recipient:recipient_id(id, full_name)')
      .eq('requester_id', user.id)
      .order('created_at', { ascending: false });
    if (outgoingError) throw outgoingError;

    return new Response(JSON.stringify({ incoming, outgoing }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})