import { serve } from "https://deno.land/std@0.200.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (_req) => {
  if (_req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Use admin client to update statuses first for consistency
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const now = new Date().toISOString();

    // Transition scheduled auctions to active
    await supabaseAdmin
      .from('auctions')
      .update({ status: 'active' })
      .eq('status', 'scheduled')
      .lte('start_time', now);

    // Transition active auctions to ended
    await supabaseAdmin
      .from('auctions')
      .update({ status: 'ended' })
      .eq('status', 'active')
      .lte('end_time', now);

    // Now, use the regular anon client to fetch data respecting RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Fetch auctions that are now active
    const { data: auctions, error: auctionsError } = await supabase
      .from('auctions')
      .select('*, auction_items(name, description, is_mystery_box)')
      .eq('status', 'active')
      .order('end_time', { ascending: true });

    if (auctionsError) throw auctionsError;

    const bidderIds = auctions
      .map(a => a.current_highest_bidder)
      .filter(id => id !== null);

    if (bidderIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
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
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})