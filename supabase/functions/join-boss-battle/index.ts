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

    const { battleId } = await req.json();
    if (!battleId) throw new Error("Battle ID is required.");

    // --- Placeholder Logic ---
    // In a real implementation, this would:
    // 1. Check if the battle exists and is in 'lobby' status.
    // 2. Check if the user is already a player.
    // 3. Insert a new row into the 'player_ships' table.
    // 4. Return the updated battle object.

    const placeholderBattle = {
      id: battleId,
      title: "The Dreadnought Alpha",
      status: "in_progress", // Immediately start for demo purposes
      challenge_set_id: "c789-012",
      challenge_set: {
        id: "c789-012",
        title: "Intro to Supabase",
        mode: "learning",
        data_reference_id: "mcq-set-1",
      },
      host_id: "admin-id",
      difficulty: "medium",
      start_time: new Date().toISOString(),
      duration_minutes: 30,
      base_hp: 10000,
      current_hp: 10000,
      max_players: 5,
      game_state: {
        boss_hp: 9900,
        total_damage: 100,
        dda_multiplier: 1.0,
        battle_feed: [{ message: `${user.id} joined the battle!`, timestamp: new Date().toISOString() }],
      },
      players: [
        { user_id: user.id, full_name: "You", avatar_url: null, damage_dealt: 100, streak: 1, is_host: false, is_firing: true },
        { user_id: "other-user-1", full_name: "Commander Dyad", avatar_url: null, damage_dealt: 0, streak: 0, is_host: true, is_firing: false },
      ],
    };

    return new Response(JSON.stringify(placeholderBattle), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
})