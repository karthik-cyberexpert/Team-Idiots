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
    const { recipientId, requestType, amount, message } = await req.json();
    if (!recipientId || !requestType || !amount || !message) {
      throw new Error("Missing required fields for request.");
    }

    const supabase = await getAuthenticatedClient(req);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");
    if (user.id === recipientId) throw new Error("You cannot send a request to yourself.");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: senderProfile, error: senderError } = await supabaseAdmin.from('profiles').select('full_name').eq('id', user.id).single();
    if (senderError || !senderProfile) throw new Error("Sender profile not found.");

    const request_payload = {
      is_request: true,
      status: 'pending',
      requester_id: user.id,
      sender_name: senderProfile.full_name, // Here, sender_name is the requester's name
      message: message,
      type: requestType,
      amount: amount,
    };

    await supabaseAdmin.from('notifications').insert({
      user_id: recipientId,
      message: `${senderProfile.full_name} is requesting ${amount} ${requestType.toUpperCase()}.`,
      gift_payload: request_payload,
      link_to: '/dashboard/request-center' // Or link to a page where they can see requests
    });

    return new Response(JSON.stringify({ message: "Request sent!" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})