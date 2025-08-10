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
    const { auction_id } = await req.json();
    if (!auction_id) throw new Error("Auction ID is required.");

    const supabase = await getAuthenticatedClient(req);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: auction, error: auctionError } = await supabaseAdmin
      .from('auctions')
      .select('*, auction_items(*)')
      .eq('id', auction_id)
      .single();

    if (auctionError) throw auctionError;

    if (auction.status !== 'ended') throw new Error("Auction has not ended yet.");
    if (auction.current_highest_bidder !== user.id) throw new Error("You are not the winner of this auction.");
    if (auction.is_claimed) throw new Error("This prize has already been claimed.");

    let awardedPrize = null;
    let awardedMessage = "Prize claimed successfully!";

    if (auction.auction_items.is_mystery_box || auction.auction_items.is_power_box) {
      const contents = auction.auction_items.is_mystery_box ? auction.auction_items.mystery_box_contents : auction.auction_items.power_box_contents;
      if (!Array.isArray(contents) || contents.length === 0) throw new Error("Box contents are invalid.");
      
      awardedPrize = contents[Math.floor(Math.random() * contents.length)];
      
      // Check for active boosts
      const { count: boosts4x } = await supabaseAdmin.from('user_power_ups').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('power_type', '4x_boost').eq('is_used', false).gt('expires_at', new Date().toISOString());
      const { count: boosts2x } = await supabaseAdmin.from('user_power_ups').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('power_type', '2x_boost').eq('is_used', false).gt('expires_at', new Date().toISOString());
      
      let boostMultiplier = 1;
      if (boosts4x && boosts4x > 0) {
          boostMultiplier = 4;
      } else if (boosts2x && boosts2x > 0) {
          boostMultiplier = 2;
      }

      const { data: profile, error: profileError } = await supabaseAdmin.from('profiles').select('game_points, xp').eq('id', user.id).single();
      if (profileError) throw profileError;

      const updatePayload: { game_points?: number; xp?: number } = {};
      
      if (awardedPrize.type === 'gp') {
        const boostedAmount = awardedPrize.amount * boostMultiplier;
        updatePayload.game_points = Math.max(0, profile.game_points + boostedAmount);
        awardedMessage = `You won ${boostedAmount} GP!`;
      }
      if (awardedPrize.type === 'xp') {
        const boostedAmount = awardedPrize.amount * boostMultiplier;
        updatePayload.xp = Math.max(0, profile.xp + boostedAmount);
        awardedMessage = `You won ${boostedAmount} XP!`;
      }
      if (awardedPrize.type === 'power_up' && awardedPrize.power && awardedPrize.power !== 'nothing') {
        const powerUpPayload: any = { user_id: user.id, power_type: awardedPrize.power, uses_left: 1 };
        if (awardedPrize.power === '2x_boost' || awardedPrize.power === '4x_boost') {
          const expires = new Date();
          expires.setHours(expires.getHours() + 24);
          powerUpPayload.expires_at = expires.toISOString();
        }
        await supabaseAdmin.from('user_power_ups').insert(powerUpPayload);
        awardedMessage = `You received the power: ${awardedPrize.power.replace(/_/g, ' ')}!`;
      }
      
      if (Object.keys(updatePayload).length > 0) {
        await supabaseAdmin.from('profiles').update(updatePayload).eq('id', user.id);
      }

    } else {
      const xpBonus = 25;
      const { data: profile, error: profileError } = await supabaseAdmin.from('profiles').select('xp').eq('id', user.id).single();
      if (profileError) throw profileError;
      await supabaseAdmin.from('profiles').update({ xp: profile.xp + xpBonus }).eq('id', user.id);
      await supabaseAdmin.from('xp_history').insert({ user_id: user.id, xp_change: xpBonus, reason: `Claimed auction item: ${auction.auction_items.name}` });
      awardedMessage = `Item claimed! You received a bonus of ${xpBonus} XP.`;
    }

    await supabaseAdmin.from('auctions').update({ is_claimed: true, claimed_prize: awardedPrize }).eq('id', auction_id);

    return new Response(JSON.stringify({ message: awardedMessage, prize: awardedPrize }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})