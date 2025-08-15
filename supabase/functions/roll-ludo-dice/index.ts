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
    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("Session ID is required.");

    const supabase = await getAuthenticatedClient(req);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated.");

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: session, error: fetchError } = await supabaseAdmin
      .from('ludo_sessions')
      .select('status, current_player_index, game_state, host_id')
      .eq('id', sessionId)
      .single();

    if (fetchError || !session) throw new Error("Game session not found.");
    if (session.status !== 'in_progress') throw new Error("Game is not in progress.");

    // Get participants to determine whose turn it is
    const { data: participants, error: participantsError } = await supabaseAdmin
      .from('ludo_participants')
      .select('user_id, player_number')
      .eq('session_id', sessionId)
      .order('player_number', { ascending: true });

    if (participantsError) throw participantsError;

    const currentPlayer = participants[session.current_player_index];
    if (!currentPlayer || currentPlayer.user_id !== user.id) {
      throw new Error("It's not your turn to roll the dice.");
    }

    const diceRoll = Math.floor(Math.random() * 6) + 1; // Roll a 6-sided dice

    const newGameState = {
      ...session.game_state,
      dice: diceRoll,
      // In a real Ludo game, you'd also update piece positions here
      // For now, just update the dice value
    };

    // For now, just advance turn. In real Ludo, turn might not advance on 6.
    const nextPlayerIndex = (session.current_player_index + 1) % participants.length;

    const { error: updateError } = await supabaseAdmin
      .from('ludo_sessions')
      .update({
        game_state: newGameState,
        current_player_index: nextPlayerIndex,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (updateError) throw updateError;

    return new Response(JSON.stringify({ message: `You rolled a ${diceRoll}!`, diceRoll }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
})