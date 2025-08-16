// @ts-nocheck
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
    const { receiverId, giftType, amount, powerUpId, message } = await req.json();
    if (!receiverId || !giftType || !message) {
      throw new Error("Missing required fields.");
    }

    const supabase = await getAuthenticatedClient(req);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");
    if (user.id === receiverId) throw new Error("You cannot send a gift to yourself.");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: senderProfile, error: senderError } = await supabaseAdmin.from('profiles').select('*').eq('id', user.id).single();
    if (senderError || !senderProfile) throw new Error("Sender profile not found.");

    let gift_payload: any = {
      sender_name: senderProfile.full_name,
      message: message,
      type: giftType,
      is_claimed: false,
    };

    if (giftType === 'gp' || giftType === 'xp') {
      if (!amount || amount <= 0) throw new Error("Invalid amount.");
      const balance = giftType === 'gp' ? senderProfile.game_points : senderProfile.xp;
      if (balance < amount) throw new Error(`Insufficient ${giftType.toUpperCase()}.`);
      
      const columnToUpdate = giftType === 'gp' ? 'game_points' : 'xp';
      await supabaseAdmin.from('profiles').update({ [columnToUpdate]: balance - amount }).eq('id', user.id);
      gift_payload.amount = amount;
    } else if (giftType === 'power_up') {
      if (!powerUpId) throw new Error("Power-up ID is required.");
      const { data: powerUp, error: powerUpError } = await supabaseAdmin.from('user_power_ups').select('*').eq('id', powerUpId).single();
      if (powerUpError || !powerUp) throw new Error("Power-up not found.");
      if (powerUp.user_id !== user.id) throw new Error("You do not own this power-up.");
      if (powerUp.is_used) throw new Error("This power-up has already been used.");

      // Mark the sender's power-up as used to take it out of their inventory
      await supabaseAdmin.from('user_power_ups').update({ is_used: true }).eq('id', powerUpId);

      // Store the details of the power-up in the payload for the receiver to claim later
      gift_payload.power_up = {
        power: powerUp.power_type,
        effect_value: powerUp.effect_value,
        uses_left: powerUp.uses_left,
      };
    } else {
      throw new Error("Invalid gift type.");
    }

    await supabaseAdmin.from('notifications').insert({
      user_id: receiverId,
      message: `${senderProfile.full_name} sent you a gift!`,
      gift_payload: gift_payload,
    });

    return new Response(JSON.stringify({ message: "Gift sent!" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})