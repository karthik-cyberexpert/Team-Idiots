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
    const { powerUpId } = await req.json();
    if (!powerUpId) throw new Error("Power-up ID is required.");

    const supabase = await getAuthenticatedClient(req);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    // Use admin client to bypass RLS for the update
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch the power-up to verify ownership and status
    const { data: powerUp, error: fetchError } = await supabaseAdmin
      .from('user_power_ups')
      .select('*')
      .eq('id', powerUpId)
      .single();

    if (fetchError) throw new Error("Power-up not found.");
    if (powerUp.user_id !== user.id) throw new Error("You do not own this power-up.");
    if (powerUp.is_used) throw new Error("This power-up has already been used.");
    if (powerUp.expires_at) throw new Error("This boost has already been activated.");
    if (powerUp.power_type !== '2x_boost' && powerUp.power_type !== '4x_boost') {
      throw new Error("This is not a boost power-up.");
    }

    // Activate the boost: set expires_at to 24 hours from now
    const expires = new Date();
    expires.setHours(expires.getHours() + 24);
    
    const { error: updateError } = await supabaseAdmin
      .from('user_power_ups')
      .update({ expires_at: expires.toISOString() })
      .eq('id', powerUpId);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ message: "Boost activated! It will last for 24 hours." }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})