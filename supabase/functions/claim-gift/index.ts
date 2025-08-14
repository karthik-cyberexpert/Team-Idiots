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
    const { notificationId } = await req.json();
    if (!notificationId) throw new Error("Notification ID is required.");

    const supabase = await getAuthenticatedClient(req);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: notification, error: fetchError } = await supabaseAdmin.from('notifications').select('*').eq('id', notificationId).single();
    if (fetchError || !notification) throw new Error("Notification not found.");
    if (notification.user_id !== user.id) throw new Error("You are not the recipient of this gift.");
    if (!notification.gift_payload) throw new Error("This is not a gift notification.");
    if (notification.gift_payload.is_claimed) throw new Error("This gift has already been claimed.");

    const gift = notification.gift_payload;

    if (gift.type === 'gp' || gift.type === 'xp') {
      const { data: profile, error: profileError } = await supabaseAdmin.from('profiles').select('game_points, xp').eq('id', user.id).single();
      if (profileError) throw profileError;

      const columnToUpdate = gift.type === 'gp' ? 'game_points' : 'xp';
      const newBalance = profile[columnToUpdate] + gift.amount;
      await supabaseAdmin.from('profiles').update({ [columnToUpdate]: newBalance }).eq('id', user.id);
      
      if (gift.type === 'xp') {
        await supabaseAdmin.from('xp_history').insert({ user_id: user.id, xp_change: gift.amount, reason: `Gift from ${gift.sender_name}` });
      }
    }
    // For power-ups, the item is already transferred. This step just marks it as claimed.

    const updatedPayload = { ...gift, is_claimed: true };
    await supabaseAdmin.from('notifications').update({ gift_payload: updatedPayload }).eq('id', notificationId);

    return new Response(JSON.stringify({ message: "Gift claimed successfully!" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})