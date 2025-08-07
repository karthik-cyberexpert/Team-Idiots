import { serve } from "https://deno.land/std@0.200.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  const authHeader = req.headers.get('Authorization')
  const functionSecret = Deno.env.get('FINALIZE_CHALLENGE_SECRET')

  if (!functionSecret || authHeader !== `Bearer ${functionSecret}`) {
    return new Response("Unauthorized", { status: 401 })
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const now = new Date().toISOString();

    // 1. Start auctions that are scheduled and whose start time has passed
    const { data: startedAuctions, error: startError } = await supabaseAdmin
      .from('auctions')
      .update({ status: 'active' })
      .eq('status', 'scheduled')
      .lte('start_time', now)
      .select('id');

    if (startError) {
      console.error("Error starting auctions:", startError);
    }

    // 2. Find active auctions that have ended
    const { data: auctionsToEnd, error: fetchError } = await supabaseAdmin
      .from('auctions')
      .select('*')
      .eq('status', 'active')
      .lte('end_time', now);

    if (fetchError) throw fetchError;

    let finalizedCount = 0;
    let failedCount = 0;

    for (const auction of auctionsToEnd) {
      if (auction.current_highest_bidder) {
        const winnerId = auction.current_highest_bidder;
        const finalPrice = auction.current_price;

        const { data: winnerProfile, error: profileError } = await supabaseAdmin
          .from('profiles')
          .select('game_points')
          .eq('id', winnerId)
          .single();

        if (profileError) {
          console.error(`Could not fetch profile for winner ${winnerId} of auction ${auction.id}.`, profileError);
          await supabaseAdmin.from('auctions').update({ status: 'ended', current_highest_bidder: null }).eq('id', auction.id);
          failedCount++;
          continue;
        }

        if (winnerProfile.game_points >= finalPrice) {
          const newBalance = winnerProfile.game_points - finalPrice;
          const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({ game_points: newBalance })
            .eq('id', winnerId);

          if (updateError) {
            console.error(`Failed to deduct points for winner ${winnerId} of auction ${auction.id}.`, updateError);
            await supabaseAdmin.from('auctions').update({ status: 'ended', current_highest_bidder: null }).eq('id', auction.id);
            failedCount++;
          } else {
            await supabaseAdmin.from('auctions').update({ status: 'ended' }).eq('id', auction.id);
            finalizedCount++;
          }
        } else {
          console.warn(`Winner ${winnerId} of auction ${auction.id} has insufficient funds.`);
          await supabaseAdmin.from('auctions').update({ status: 'ended', current_highest_bidder: null }).eq('id', auction.id);
          failedCount++;
        }
      } else {
        await supabaseAdmin.from('auctions').update({ status: 'ended' }).eq('id', auction.id);
        finalizedCount++;
      }
    }

    const message = `Auction status update complete. Started: ${startedAuctions?.length || 0}. Ended successfully: ${finalizedCount}. Failed payments: ${failedCount}.`;

    return new Response(
      JSON.stringify({ message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})