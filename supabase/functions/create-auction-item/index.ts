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
    const supabase = await getAuthenticatedClient(req);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const { name, description, starting_price, is_mystery_box, mystery_box_contents, is_power_box, power_box_contents } = await req.json();
    if (!name || starting_price === undefined) {
      throw new Error("Name and starting price are required.");
    }

    const itemToInsert: any = {
      name,
      description,
      starting_price,
      created_by: user.id,
      is_mystery_box: is_mystery_box || false,
      mystery_box_contents: null,
      is_power_box: is_power_box || false,
      power_box_contents: null,
    };

    if (is_mystery_box) {
      if (!Array.isArray(mystery_box_contents) || mystery_box_contents.length !== 3) {
        throw new Error("Mystery box must have exactly 3 prize options.");
      }
      mystery_box_contents.forEach(item => {
        if (!['gp', 'xp', 'nothing'].includes(item.type) || (item.type !== 'nothing' && typeof item.amount !== 'number')) {
          throw new Error("Invalid mystery box content.");
        }
        if (item.type === 'nothing') item.amount = 0;
      });
      itemToInsert.mystery_box_contents = mystery_box_contents;
    }

    if (is_power_box) {
      if (!Array.isArray(power_box_contents) || power_box_contents.length !== 3) {
        throw new Error("Power box must have exactly 3 power options.");
      }
      itemToInsert.power_box_contents = power_box_contents;
    }

    const { error } = await supabase.from('auction_items').insert(itemToInsert);

    if (error) throw error;

    return new Response(JSON.stringify({ message: "Item created" }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})