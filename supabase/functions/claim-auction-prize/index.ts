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

    // Use service role key for admin-level operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Fetch the auction and item details
    const { data: auction, error: auctionError } = await supabaseAdmin
      .from('auctions')
      .select('*, auction_items(*)')
      .eq('id', auction_id)
      .single();

    if (auctionError) throw auctionError;

    // 2. Security checks
    if (auction.status !== 'ended') throw new Error("Auction has not ended yet.");
    if (auction.current_highest_bidder !== user.id) throw new Error("You are not the winner of this auction.");
    if (auction.is_claimed) throw new Error("This prize has already been claimed.");

    let awardedPrize = null;

    // 3. Handle prize logic
    if (auction.auction_items.is_mystery_box) {
      const contents = auction.auction_items.mystery_box_contents;
      if (!Array.isArray(contents) || contents.length === 0) {
        throw new Error("Mystery box contents are invalid.");
      }

      // Randomly select a prize
      awardedPrize = contents[Math.floor(Math.random() * contents.length)];

      // Fetch user's current profile to update points/xp
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('game_points, xp')
        .eq('id', user.id)
        .single();
      
      if (profileError) throw profileError;

      const updatePayload: { game_points?: number; xp?: number } = {};
      if (awardedPrize.type === 'gp') {
        updatePayload.game_points = Math.max(0, profile.game_points + awardedPrize.amount);
      } else if (awardedPrize.type === 'xp') {
        updatePayload.xp = Math.max(0, profile.xp + awardedPrize.amount);
      }

      const { error: updateProfileError } = await supabaseAdmin
        .from('profiles')
        .update(updatePayload)
        .eq('id', user.id);

      if (updateProfileError) throw updateProfileError;
    }

    // 4. Mark auction as claimed
    const { error: updateAuctionError } = await supabaseAdmin
      .from('auctions')
      .update({ is_claimed: true })
      .eq('id', auction_id);

    if (updateAuctionError) throw updateAuctionError;

    return new Response(JSON.stringify({ message: "Prize claimed successfully!", prize: awardedPrize }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})