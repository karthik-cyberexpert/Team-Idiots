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
    const { recipientId, requestType, amount, powerUpType, message } = await req.json();
    if (!recipientId || !requestType || !message) {
      throw new Error("Missing required fields.");
    }

    const supabase = await getAuthenticatedClient(req);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const isGlobal = recipientId === 'global';
    
    const requestData = {
      requester_id: user.id,
      recipient_id: isGlobal ? null : recipientId,
      is_global: isGlobal,
      request_type: requestType,
      amount: amount || null,
      power_up_type: powerUpType || null,
      message: message,
      status: 'pending',
    };

    const { error } = await supabase.from('requests').insert(requestData);
    if (error) throw error;

    return new Response(JSON.stringify({ message: "Request created." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})