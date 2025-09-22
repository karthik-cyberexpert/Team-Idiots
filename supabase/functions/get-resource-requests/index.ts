import { serve } from "https://deno.land/std@0.200.0/http/server.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getAuthenticatedClient(req: Request): Promise<SupabaseClient> {
  const authHeader = req.headers.get('Authorization')!
  if (!authHeader) throw new Error("Missing Authorization header");
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

    // Fetch incoming requests (notifications sent to the user)
    const { data: incoming, error: incomingError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .eq('gift_payload->>type', 'resource_request')
      .order('created_at', { ascending: false });
    
    if (incomingError) throw incomingError;

    // Fetch outgoing requests (requests made by the user)
    const { data: outgoing, error: outgoingError } = await supabase
      .from('notifications')
      .select('*, recipient:profiles!notifications_user_id_fkey(full_name)')
      .eq('gift_payload->>requester_id', user.id)
      .eq('gift_payload->>type', 'resource_request')
      .order('created_at', { ascending: false });

    if (outgoingError) throw outgoingError;

    return new Response(JSON.stringify({ incoming, outgoing }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})