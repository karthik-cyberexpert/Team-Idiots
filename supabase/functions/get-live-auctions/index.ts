/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.200.0/http/server.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper function to create an authenticated Supabase client from the request
async function getAuthenticatedClient(req: Request): Promise<SupabaseClient> {
  const authHeader = req.headers.get('Authorization')!
  if (!authHeader) {
    throw new Error("Missing Authorization header");
  }
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authHeader } } }
  )
  return supabase
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Authenticate the user first
    const supabase = await getAuthenticatedClient(req);
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("User not authenticated or session expired.");
    }

    // Use service role key for fetching data and updating statuses
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const now = new Date().toISOString();

    // 1. Start auctions that are scheduled and whose start time has passed
    await supabaseAdmin
      .from('auctions')
      .update({ status: 'active' })
      .eq('status', 'scheduled')
      .lte('start_time', now);

    // 2. Find and process active auctions that have ended
    const { data: auctionsToEnd, error: fetchEndError } = await supabaseAdmin
      .from('auctions')
      .select('*')
      .eq('status', 'active')
      .lte('end_time', now);

    if (fetchEndError) throw fetchEndError;

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
          } else {
            await supabaseAdmin.from('auctions').update({ status: 'ended' }).eq('id', auction.id);
          }
        } else {
          console.warn(`Winner ${winnerId} of auction ${auction.id} has insufficient funds.`);
          await supabaseAdmin.from('auctions').update({ status: 'ended', current_highest_bidder: null }).eq('id', auction.id);
        }
      } else {
        await supabaseAdmin.from('auctions').update({ status: 'ended' }).eq('id', auction.id);
      }
    }

    // 3. Fetch auctions that are currently active or scheduled (after processing ended ones)
    const { data: auctions, error: auctionsError } = await supabaseAdmin
      .from('auctions')
      .select('*, auction_items(name, description, is_mystery_box, is_power_box)')
      .in('status', ['active', 'scheduled']) // Fetch both active and scheduled
      .order('start_time', { ascending: true }) // Order by start time
      .order('end_time', { ascending: true }); // Then by end time

    if (auctionsError) throw auctionsError;

    const bidderIds = auctions
      .map(a => a.current_highest_bidder)
      .filter(id => id !== null);

    if (bidderIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name')
        .in('id', bidderIds);

      if (profilesError) throw profilesError;

      const profilesMap = new Map(profiles.map(p => [p.id, p]));

      auctions.forEach(auction => {
        if (auction.current_highest_bidder) {
          (auction as any).profiles = profilesMap.get(auction.current_highest_bidder) || null;
        } else {
          (auction as any).profiles = null;
        }
      });
    } else {
      auctions.forEach(auction => (auction as any).profiles = null);
    }

    return new Response(JSON.stringify(auctions), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})