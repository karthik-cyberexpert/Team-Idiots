import { serve } from "https://deno.land/std@0.200.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { item_id, start_time, end_time, starting_price } = await req.json();
    if (!item_id || !start_time || !end_time || starting_price === undefined) {
      throw new Error("Item ID, start time, end time, and starting price are required.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { error } = await supabaseAdmin.from('auctions').insert({
      item_id,
      start_time,
      end_time,
      current_price: starting_price,
      status: 'scheduled',
    });

    if (error) throw error;

    return new Response(JSON.stringify({ message: "Auction created" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})