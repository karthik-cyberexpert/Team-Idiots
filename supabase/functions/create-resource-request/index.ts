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
    if (!recipientId || !requestType || !message) {
      throw new Error("Missing required fields.");
    }

    const supabase = await getAuthenticatedClient(req);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: requesterProfile, error: profileError } = await supabaseAdmin.from('profiles').select('full_name').eq('id', user.id).single();
    if (profileError) throw profileError;

    const request_payload = {
      type: 'resource_request',
      requester_id: user.id,
      requester_name: requesterProfile.full_name,
      request_type: requestType,
      amount: amount,
      status: 'pending',
    };

    let notificationMessage = `${requesterProfile.full_name} is requesting ${amount} ${requestType.toUpperCase()}.`;

    if (recipientId === 'global') {
      const { data: users, error: usersError } = await supabaseAdmin.from('profiles').select('id').neq('id', user.id).neq('role', 'admin');
      if (usersError) throw usersError;

      if (users.length > 0) {
        const notifications = users.map(u => ({
          user_id: u.id,
          message: notificationMessage,
          gift_payload: request_payload,
          link_to: '/dashboard/requests?tab=incoming',
        }));
        const { error: insertError } = await supabaseAdmin.from('notifications').insert(notifications);
        if (insertError) throw insertError;
      }
    } else {
      const { error: insertError } = await supabaseAdmin.from('notifications').insert({
        user_id: recipientId,
        message: notificationMessage,
        gift_payload: request_payload,
        link_to: '/dashboard/requests?tab=incoming',
      });
      if (insertError) throw insertError;
    }

    return new Response(JSON.stringify({ message: "Request sent!" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})