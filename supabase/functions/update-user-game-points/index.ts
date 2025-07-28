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
    const { userId, gamePointsChange } = await req.json()

    if (!userId || typeof gamePointsChange !== 'number') {
      throw new Error("User ID and game points change amount are required.")
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Fetch current game_points to ensure we don't go below 0
    const { data: profile, error: fetchProfileError } = await supabaseAdmin
      .from('profiles')
      .select('game_points')
      .eq('id', userId)
      .single();

    if (fetchProfileError) throw fetchProfileError;
    if (!profile) throw new Error("User profile not found.");

    const newGamePoints = Math.max(0, profile.game_points + gamePointsChange); // Ensure points don't go below 0

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ game_points: newGamePoints })
      .eq('id', userId);

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({ message: "User game points updated successfully" }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})