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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data: items, error: itemsError } = await supabaseAdmin
      .from('auction_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (itemsError) throw itemsError;

    const { data: auctions, error: auctionsError } = await supabaseAdmin
      .from('auctions')
      .select('*, auction_items(name, description), profiles!current_highest_bidder(full_name)')
      .order('created_at', { ascending: false });

    if (auctionsError) throw auctionsError;

    return new Response(JSON.stringify({ items, auctions }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})