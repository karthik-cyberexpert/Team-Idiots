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
    const { notificationId, response } = await req.json();
    if (!notificationId || !response || !['fulfilled', 'rejected'].includes(response)) {
      throw new Error("Notification ID and a valid response ('fulfilled' or 'rejected') are required.");
    }

    const supabase = await getAuthenticatedClient(req);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: notification, error: fetchError } = await supabaseAdmin.from('notifications').select('*').eq('id', notificationId).single();
    if (fetchError || !notification) throw new Error("Request notification not found.");
    if (notification.user_id !== user.id && notification.user_id !== null) throw new Error("You are not the recipient of this request.");
    
    const requestPayload = notification.gift_payload;
    if (!requestPayload || requestPayload.type !== 'resource_request' || requestPayload.status !== 'pending') {
      throw new Error("This is not a valid pending resource request.");
    }

    if (response === 'fulfilled') {
      const { data: fulfillerProfile, error: profileError } = await supabaseAdmin.from('profiles').select('*').eq('id', user.id).single();
      if (profileError) throw profileError;

      if (requestPayload.request_type === 'gp' || requestPayload.request_type === 'xp') {
        const column = requestPayload.request_type === 'gp' ? 'game_points' : 'xp';
        if (fulfillerProfile[column] < requestPayload.amount) {
          throw new Error(`Insufficient ${requestPayload.request_type.toUpperCase()} to fulfill request.`);
        }
        await supabaseAdmin.from('profiles').update({ [column]: fulfillerProfile[column] - requestPayload.amount }).eq('id', user.id);
        await supabaseAdmin.rpc('increment_profile_column', { p_user_id: requestPayload.requester_id, p_column_name: column, p_increment_value: requestPayload.amount });
      }
    }

    const updatedPayload = { ...requestPayload, status: response };
    await supabaseAdmin.from('notifications').update({ gift_payload: updatedPayload }).eq('id', notificationId);

    const { data: fulfillerNameData } = await supabaseAdmin.from('profiles').select('full_name').eq('id', user.id).single();
    const fulfillerName = fulfillerNameData?.full_name || 'A user';

    await supabaseAdmin.from('notifications').insert({
      user_id: requestPayload.requester_id,
      message: `${fulfillerName} has ${response} your request for ${requestPayload.amount || ''} ${requestPayload.request_type.toUpperCase()}.`,
      link_to: '/dashboard/requests?tab=outgoing',
    });

    return new Response(JSON.stringify({ message: "Response sent!" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})