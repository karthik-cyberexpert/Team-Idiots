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
    const { requestId, response } = await req.json();
    if (!requestId || !response || !['approved', 'denied'].includes(response)) {
      throw new Error("Request ID and a valid response ('approved' or 'denied') are required.");
    }

    const supabase = await getAuthenticatedClient(req);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: request, error: fetchError } = await supabaseAdmin.from('requests').select('*').eq('id', requestId).single();
    if (fetchError || !request) throw new Error("Request not found.");
    if (request.status !== 'pending') throw new Error("This request has already been actioned.");
    if (request.requester_id === user.id) throw new Error("You cannot respond to your own request.");

    if (response === 'denied') {
      if (!request.is_global) {
        await supabaseAdmin.from('requests').update({ status: 'denied' }).eq('id', requestId);
      }
      return new Response(JSON.stringify({ message: "Request denied." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: senderProfile, error: senderError } = await supabaseAdmin.from('profiles').select('*').eq('id', user.id).single();
    if (senderError || !senderProfile) throw new Error("Your profile could not be found.");

    if (request.request_type === 'gp' || request.request_type === 'xp') {
      const amount = request.amount;
      const balance = request.request_type === 'gp' ? senderProfile.game_points : senderProfile.xp;
      if (balance < amount) throw new Error(`Insufficient ${request.request_type.toUpperCase()} to approve this request.`);
      
      const columnToUpdate = request.request_type === 'gp' ? 'game_points' : 'xp';
      await supabaseAdmin.from('profiles').update({ [columnToUpdate]: balance - amount }).eq('id', user.id);
      
      await supabaseAdmin.rpc('increment_profile_column', { p_user_id: request.requester_id, p_column_name: columnToUpdate, p_increment_value: amount });
    } else if (request.request_type === 'power_up') {
      const powerUpPayload = { user_id: request.requester_id, power_type: request.power_up_type, uses_left: 1, is_used: false };
      await supabaseAdmin.from('user_power_ups').insert(powerUpPayload);
    }

    await supabaseAdmin.from('requests').update({ status: 'approved', recipient_id: user.id }).eq('id', requestId);

    return new Response(JSON.stringify({ message: "Request approved and resources sent." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})