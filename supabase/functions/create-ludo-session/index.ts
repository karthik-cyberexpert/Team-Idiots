import { serve } from "https://deno.land/std@0.200.0/http/server.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.47.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function getAuthenticatedClient(req: Request): Promise<SupabaseClient> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    throw new Error("Missing Authorization header.");
  }
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
    if (!user) {
      throw new Error("User not authenticated.");
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    let joinCode;
    let isUnique = false;
    while (!isUnique) {
      joinCode = Math.floor(100000 + Math.random() * 900000).toString();
      const { data: existing, error } = await supabaseAdmin.from('ludo_sessions').select('id').eq('join_code', joinCode).single();
      if (error && error.code !== 'PGRST116') {
        throw error;
      }
      if (!existing) {
        isUnique = true;
      }
    }

    const { data: newSession, error: sessionError } = await supabaseAdmin
      .from('ludo_sessions')
      .insert({
        host_id: user.id,
        join_code: joinCode,
        status: 'waiting',
        max_players: 4, // Default to 4 players for now
        game_state: { dice: 1, players: [] }, // Basic initial game state
      })
      .select()
      .single();

    if (sessionError) {
      throw sessionError;
    }

    // Add host as the first participant
    const { error: participantError } = await supabaseAdmin
      .from('ludo_participants')
      .insert({
        session_id: newSession.id,
        user_id: user.id,
        player_number: 0, // Host is player 0
        is_ready: false,
      });

    if (participantError) {
      // Rollback session creation if participant insertion fails
      await supabaseAdmin.from('ludo_sessions').delete().eq('id', newSession.id);
      throw participantError;
    }

    return new Response(JSON.stringify(newSession), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})