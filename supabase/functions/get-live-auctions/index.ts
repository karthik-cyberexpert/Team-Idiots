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

    // Use service role key for updating statuses and fetching data
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const now = new Date().toISOString();

    // --- START: Update statuses on load ---
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
    // --- END: Update statuses on load ---

    // Fetch auctions that are currently active.
    const { data: auctions, error: auctionsError } = await supabaseAdmin
      .from('auctions')
      .select('*, auction_items(name, description, is_mystery_box)')
      .eq('status', 'active') // Now we can reliably filter by status
      .order('end_time', { ascending: true });

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
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})