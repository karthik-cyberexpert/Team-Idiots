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

    let awardedPrizes: any[] = [];
    let message = "Purchase successful!";
    let totalGpChange = -item.price;
    let totalXpChange = 0;
    let powerUpsToAdd: any[] = [];

    const quantity = item.quantity || 1;

    switch (item.item_type) {
      case 'xp_pack':
        totalXpChange = (item.xp_amount || 0) * quantity;
        message = `Successfully purchased ${totalXpChange} XP!`;
        break;
      case 'power_up':
        for (let i = 0; i < quantity; i++) {
          const powerUpPayload: any = { 
            user_id: user.id, 
            power_type: item.power_up_type,
            effect_value: item.effect_value,
            uses_left: item.uses,
          };
          if ((item.power_up_type === '2x_boost' || item.power_up_type === '4x_boost') && item.duration_hours) {
            const expires = new Date();
            expires.setHours(expires.getHours() + item.duration_hours);
            powerUpPayload.expires_at = expires.toISOString();
          }
          powerUpsToAdd.push(powerUpPayload);
        }
        message = `Successfully purchased ${quantity} x ${item.name}!`;
        break;
      case 'mystery_box':
      case 'power_box':
        for (let i = 0; i < quantity; i++) {
          const prize = selectPrize(item.box_contents);
          awardedPrizes.push(prize);
          switch (prize.type) {
            case 'gp': totalGpChange += prize.amount; break;
            case 'xp': totalXpChange += prize.amount; break;
            case 'power_up':
              if (prize.power && prize.power !== 'nothing') {
                const prizePowerUpPayload: any = { user_id: user.id, power_type: prize.power, uses_left: 1 };
                if (prize.power === '2x_boost' || prize.power === '4x_boost') {
                  const expires = new Date();
                  expires.setHours(expires.getHours() + 24);
                  prizePowerUpPayload.expires_at = expires.toISOString();
                }
                if (prize.power === 'attack') {
                  prizePowerUpPayload.effect_value = 10; // Default 10% attack
                }
                if (prize.power === 'gp_transfer') {
                  prizePowerUpPayload.effect_value = 10; // Default 10% siphon
                }
                powerUpsToAdd.push(prizePowerUpPayload);
              }
              break;
          }
        }
        message = `You opened ${quantity} box(es)!`;
        break;
    }

    // Apply all database changes
    const finalGp = Math.max(0, profile.game_points + totalGpChange);
    const finalXp = Math.max(0, profile.xp + totalXpChange);
    await supabaseAdmin.from('profiles').update({ game_points: finalGp, xp: finalXp }).eq('id', user.id);

    if (totalXpChange > 0) {
      await supabaseAdmin.from('xp_history').insert({ user_id: user.id, xp_change: totalXpChange, reason: `Purchased: ${item.name}` });
    }
    if (powerUpsToAdd.length > 0) {
      await supabaseAdmin.from('user_power_ups').insert(powerUpsToAdd);
    }

    return new Response(JSON.stringify({ message, prizes: awardedPrizes }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})