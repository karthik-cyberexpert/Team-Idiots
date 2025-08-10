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

function selectPrize(contents: any[]) {
  const totalWeight = contents.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  for (const item of contents) {
    if (random < item.weight) {
      return item;
    }
    random -= item.weight;
  }
  return contents[contents.length - 1]; // Fallback
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { itemId } = await req.json();
    if (!itemId) throw new Error("Item ID is required.");

    const supabase = await getAuthenticatedClient(req);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: item, error: itemError } = await supabaseAdmin.from('store_items').select('*').eq('id', itemId).single();
    if (itemError) throw new Error("Item not found.");

    const { data: profile, error: profileError } = await supabaseAdmin.from('profiles').select('game_points, xp').eq('id', user.id).single();
    if (profileError) throw new Error("User profile not found.");

    if (!item.is_active) throw new Error("This item is not available for purchase.");
    if (profile.game_points < item.price) throw new Error("Insufficient game points.");

    const newGamePoints = profile.game_points - item.price;
    const { error: gpUpdateError } = await supabaseAdmin.from('profiles').update({ game_points: newGamePoints }).eq('id', user.id);
    if (gpUpdateError) throw new Error("Failed to process payment.");

    let awardedPrize = null;
    let message = "Purchase successful!";

    switch (item.item_type) {
      case 'xp_pack':
        const newXp = profile.xp + item.xp_amount;
        await supabaseAdmin.from('profiles').update({ xp: newXp }).eq('id', user.id);
        await supabaseAdmin.from('xp_history').insert({ user_id: user.id, xp_change: item.xp_amount, reason: `Purchased: ${item.name}` });
        message = `Successfully purchased ${item.xp_amount} XP!`;
        break;
      case 'power_up':
        const powerUpPayload: any = { user_id: user.id, power_type: item.power_up_type };
        if (item.power_up_type === '2x_boost' || item.power_up_type === '4x_boost') {
          const expires = new Date();
          expires.setHours(expires.getHours() + 24);
          powerUpPayload.expires_at = expires.toISOString();
        }
        await supabaseAdmin.from('user_power_ups').insert(powerUpPayload);
        message = `Successfully purchased ${item.name}!`;
        break;
      case 'mystery_box':
      case 'power_box':
        awardedPrize = selectPrize(item.box_contents);
        message = `You opened the box and received: `;
        switch (awardedPrize.type) {
          case 'gp':
            await supabaseAdmin.from('profiles').update({ game_points: newGamePoints + awardedPrize.amount }).eq('id', user.id);
            message += `${awardedPrize.amount} GP!`;
            break;
          case 'xp':
            const currentXp = (await supabaseAdmin.from('profiles').select('xp').eq('id', user.id).single()).data!.xp;
            await supabaseAdmin.from('profiles').update({ xp: currentXp + awardedPrize.amount }).eq('id', user.id);
            await supabaseAdmin.from('xp_history').insert({ user_id: user.id, xp_change: awardedPrize.amount, reason: `Prize from ${item.name}` });
            message += `${awardedPrize.amount} XP!`;
            break;
          case 'power_up':
            const prizePowerUpPayload: any = { user_id: user.id, power_type: awardedPrize.power };
            if (awardedPrize.power === '2x_boost' || awardedPrize.power === '4x_boost') {
              const expires = new Date();
              expires.setHours(expires.getHours() + 24);
              prizePowerUpPayload.expires_at = expires.toISOString();
            }
            await supabaseAdmin.from('user_power_ups').insert(prizePowerUpPayload);
            message += `a ${awardedPrize.power.replace(/_/g, ' ')} power-up!`;
            break;
          case 'nothing':
            message += `nothing. Better luck next time!`;
            break;
        }
        break;
    }

    return new Response(JSON.stringify({ message, prize: awardedPrize }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})